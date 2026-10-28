// ============================================================================
// 派對擴充引擎（非破壞性掛鉤）
// 原始 engine.js 的經典規則保持不變；這裡透過 engineHooks 擴充新模式。
// ============================================================================
import {
  GAME_MODES, MODE_IDS, PARTY_ROLES, RANDOM_ROLE_ID, MYTHIC_ITEMS, MYTHIC_BY_ID,
  SPECIAL_ITEM_BY_ID, FATE_DICE_ID, TYCOON_BLUE_REWARD, TYCOON_COMEBACK_SEASONS,
  SPECIAL_TILE_META, SPECIAL_COUNTS, NORMAL_TILE_TYPES, WHEEL_EFFECTS, QUICK_DECISIONS, QUICK_DECISION_FALLBACK,
  STAR_PRICE_START, STAR_PRICE_STEP, FORCED_STAR_PREMIUM, TYCOON_TARGET,
  DOOM_START, DOOM_STEP, DOOM_EVERY, MAX_PLAYERS
} from './party_data.js';
import {
  engineHooks, boardOf, addCash, log, finish, checkStarWin, startTurn, endTurn, moveGhost,
  resolveTileFor, drawItem, currentOf, statusChips, nextRandom, pick, clamp, round2, roleById, itemById, applyCornerProgress
} from './engine.js';
import { BOARD, ROLES, ITEMS, DECISION_OPTIONS, STAR_COST, STAR_GOAL, START_CASH } from './data.js';

const EXT_VERSION = 4;
const clone = value => JSON.parse(JSON.stringify(value));
const extMoney = n => Math.round(Number(n) || 0).toLocaleString('zh-TW');
const extMode = state => GAME_MODES[state?.ext?.mode] || GAME_MODES.star;
const extNormalizeMode = mode => (!mode || mode === 'classic' || !GAME_MODES[mode]) ? 'star' : mode;
function extNoteItem(player, name) {
  if (!player?.ext) return;
  if (!player.ext.itemGets || typeof player.ext.itemGets !== 'object') player.ext.itemGets = {};
  const key = String(name || '未知道具');
  player.ext.itemGets[key] = (player.ext.itemGets[key] || 0) + 1;
}
function extSyncStarBlade(state, player, reason = '星星被偷走') {
  if (!player) return;
  extPlayerExt(player);
  if (player.stars > 0) extStarBladeEvolve(state, player);
  else extStarBladeRevert(state, player, reason);
}

export function extRole(id) {
  return PARTY_ROLES.find(r => r.id === id) || ROLES.find(r => r.id === id) || PARTY_ROLES[0];
}
export function extRoleOf(player) { return extRole(player?.roleId); }
export function extMythicEntry(player, id) {
  return (player?.mythics || []).find(x => x.id === id) || null;
}
export function extHasMythic(player, id) { return Boolean(extMythicEntry(player, id)); }
export function extHasSpecial(player, id) { return (player?.specials || []).includes(id); }
export function extSpecialEntry(player, id) { return extHasSpecial(player, id) ? SPECIAL_ITEM_BY_ID[id] : null; }
export function extItemCount(player) {
  return (player?.items?.length || 0) + (player?.mythics?.length || 0) + (player?.specials?.length || 0);
}
export function extHasItemSpace(player, count = 1) {
  return extItemCount(player) + count <= 3;
}
function extStarBladeEvolve(state, player) {
  const entry = extMythicEntry(player, 'starBlade');
  if (!entry) return false;
  entry.id = 'bankai';
  entry.charges = 1;
  player.ext.bankai = true;
  state.ext.lastEvent = { type: 'bankai', playerId: player.id, at: Date.now() };
  log(state, `🗡️→🌀 ${player.name} 的斬魄刀吸收星之力，進化為「卍解」！收益 +100、免疫負面，但無法再獲取新道具。`);
  return true;
}
function extStarBladeRevert(state, player, reason = '星星被偷走') {
  const entry = extMythicEntry(player, 'bankai');
  const wasBankai = Boolean(player.ext?.bankai);
  if (entry) {
    entry.id = 'starBlade';
    entry.charges = 1;
  }
  if (player.ext) player.ext.bankai = false;
  if (entry || wasBankai) {
    log(state, `🌀→🗡️ ${player.name} 的${reason}，卍解退化回斬魄刀。`);
    return true;
  }
  return false;
}

function extPlayerExt(p) {
  if (!p.ext || typeof p.ext !== 'object') {
    p.ext = {
      eliminated: false, ghostRole: false, frozen: 0, iceLock: 0, burn: 0, immune: false,
      bankFreeze: false, bankai: false, itemsAcquired: 0, aliveSeasons: 0,
      forceOneNext: false, noDiceItems: false, oneStepLock: false, domainUsedRound: 0, starsBought: 0,
      itemGets: {}, itemRound: null
    };
  }
  p.ext.eliminated = Boolean(p.ext.eliminated);
  p.ext.ghostRole = Boolean(p.ext.ghostRole);
  p.ext.frozen = Number.isInteger(p.ext.frozen) ? p.ext.frozen : 0;
  p.ext.iceLock = Number.isInteger(p.ext.iceLock) ? p.ext.iceLock : 0;
  p.ext.burn = Number.isInteger(p.ext.burn) ? p.ext.burn : 0;
  p.ext.immune = Boolean(p.ext.immune);
  p.ext.bankFreeze = Boolean(p.ext.bankFreeze);
  p.ext.bankai = Boolean(p.ext.bankai);
  p.ext.itemsAcquired = Number(p.ext.itemsAcquired) || 0;
  p.ext.aliveSeasons = Number(p.ext.aliveSeasons) || 0;
  p.ext.forceOneNext = Boolean(p.ext.forceOneNext);
  p.ext.noDiceItems = Boolean(p.ext.noDiceItems);
  p.ext.oneStepLock = Boolean(p.ext.oneStepLock);
  p.ext.domainUsedRound = Number(p.ext.domainUsedRound) || 0;
  p.ext.starsBought = Number(p.ext.starsBought) || 0;
  if (!p.ext.itemGets || typeof p.ext.itemGets !== 'object') p.ext.itemGets = {};
  if (!Array.isArray(p.mythics)) p.mythics = [];
  if (!Array.isArray(p.items)) p.items = [];
  if (!Array.isArray(p.specials)) p.specials = [];
  // Keep the first copy and never merge charges from duplicate or replayed acquisition packets.
  const seenMythics = new Set();
  p.mythics = p.mythics.filter(entry => {
    if (!entry || !MYTHIC_BY_ID[entry.id]) return false;
    const meta = MYTHIC_BY_ID[entry.id];
    if (meta.charges && seenMythics.has(entry.id)) return false;
    if (meta.charges) seenMythics.add(entry.id);
    const maximum = Number.isInteger(meta.charges) && meta.charges > 0 ? meta.charges : 1;
    entry.charges = Number.isInteger(entry.charges)
      ? Math.max(0, Math.min(maximum, entry.charges))
      : (meta.charges ? 0 : 1);
    return entry.charges > 0;
  });
  p.items = p.items.filter(id => Boolean(itemById(id)));
  p.specials = p.specials.filter(id => Boolean(SPECIAL_ITEM_BY_ID[id]));
  // 普通、神話與特殊道具共用 3 格；舊存檔若超過上限，優先保留特殊與神話道具。
  if (p.specials.length > 3) p.specials.length = 3;
  const mythicRoom = Math.max(0, 3 - p.specials.length);
  if (p.mythics.length > mythicRoom) p.mythics.length = mythicRoom;
  const itemRoom = Math.max(0, mythicRoom - p.mythics.length);
  if (p.items.length > itemRoom) p.items.length = itemRoom;
  // 舊存檔相容：舊版以 ext.bankai 標記進化，將斬魄刀就地替換為卍解。
  if (extMythicEntry(p, 'bankai')) {
    p.ext.bankai = true;
  } else if (p.ext.bankai) {
    const blade = extMythicEntry(p, 'starBlade');
    if (blade) blade.id = 'bankai';
    p.ext.bankai = Boolean(blade);
  }
  return p.ext;
}

export function extResolveRoles(players, seed = Date.now()) {
  const available = PARTY_ROLES.map(r => r.id);
  let x = (Number(seed) | 0) || 1;
  const rand = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; };
  const used = new Set(players.filter(p => p.roleId !== RANDOM_ROLE_ID).map(p => p.roleId));
  return players.map(p => {
    if (p.roleId !== RANDOM_ROLE_ID) {
      used.add(p.roleId);
      return { ...p };
    }
    const pool = available.filter(id => !used.has(id));
    const id = pool.length ? pool[Math.floor(rand() * pool.length)] : available[Math.floor(rand() * available.length)];
    used.add(id);
    return { ...p, roleId: id, wasRandomRole: true };
  });
}

function extShuffle(state, list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom(state) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function extBuildBoard(state, mode) {
  const total = 24;
  const activeMode = mode || state?.ext?.mode || 'star';
  const blueValue = activeMode === 'tycoon' ? TYCOON_BLUE_REWARD : 300;
  const specialSlots = new Array(total).fill(null);
  const allSpecials = [];
  for (const [type, count] of Object.entries(SPECIAL_COUNTS)) {
    for (let i = 0; i < count; i++) allSpecials.push(type);
  }
  const shuffled = extShuffle(state, allSpecials);
  const used = new Set();
  const isAdjacent = i => used.has((i - 1 + total) % total) || used.has((i + 1) % total);
  for (const type of shuffled) {
    let placed = false;
    for (const i of extShuffle(state, Array.from({ length: total - 1 }, (_, k) => k + 1))) {
      if (used.has(i) || isAdjacent(i)) continue;
      used.add(i); specialSlots[i] = type; placed = true; break;
    }
    if (!placed) {
      // 幾乎不會發生；保底找一個不相鄰的位置。
      for (let i = 1; i < total; i++) {
        if (!used.has(i) && !isAdjacent(i)) { used.add(i); specialSlots[i] = type; placed = true; break; }
      }
    }
    if (!placed) {
      for (let i = 1; i < total; i++) {
        if (!used.has(i)) { used.add(i); specialSlots[i] = type; placed = true; break; }
      }
    }
  }
  const weights = ['blue', 'blue', 'blue', 'blue', 'red', 'red', 'red', 'yellow', 'yellow', 'green', 'green', 'green'];
  return Array.from({ length: total }, (_, index) => {
    if (index === 0) return { index, type: 'start', label: '出發', icon: '🚩', value: 0, stay: '在地圖四個角落取得紅、綠、藍、黃四種記號後，經過出發點可領取1000元補助金，領取後記號重置' };
    const special = specialSlots[index];
    if (special) {
      const meta = SPECIAL_TILE_META[special];
      return { index, type: special, special: true, label: meta.label, icon: meta.icon, value: 0, stay: meta.desc };
    }
    const type = weights[Math.floor(nextRandom(state) * weights.length)];
    const labels = { blue: '發財', red: '蕭條', yellow: '技能', green: '事件' };
    const icons = { blue: '💰', red: '📉', yellow: '⚡', green: '❓' };
    const stays = {
      blue: `發財格：獲得 ${blueValue} 總資產`, red: '蕭條格：扣除 150 營運費',
      yellow: '技能格：補充 1 點技能能量', green: '事件格：抽一張即時事件'
    };
    return { index, type, label: labels[type], icon: icons[type], value: type === 'blue' ? blueValue : type === 'red' ? 150 : type === 'yellow' ? 1 : 0, stay: stays[type] };
  });
}

export function extInitGame(state, { mode = 'star', debug = false, target, rounds, starGoal, doomEvery, doomPrice, doomStep, startingCash } = {}) {
  const seed = Number(state.seed) || Date.now();
  const requested = extNormalizeMode(mode);
  const actualMode = requested === 'random'
    ? MODE_IDS[Math.abs(seed) % MODE_IDS.length]
    : extNormalizeMode(requested);
  const meta = GAME_MODES[actualMode];
  const randomLocked = requested === 'random';
  const resolvedRounds = randomLocked
    ? (GAME_MODES[actualMode]?.defaultRounds || 20)
    : (Number(rounds) || Number(meta.defaultRounds) || 10);
  const resolvedTarget = randomLocked
    ? (actualMode === 'tycoon' ? TYCOON_TARGET : 0)
    : (Number(target) || Number(meta.defaultTarget) || 0);
  const resolvedStarGoal = randomLocked
    ? 3
    : (Number(starGoal) || Number(meta.starGoal) || STAR_GOAL);
  const resolvedDoomEvery = randomLocked ? DOOM_EVERY : Math.max(1, Number(doomEvery) || DOOM_EVERY);
  const resolvedDoomPrice = randomLocked ? DOOM_START : Math.max(100, Number(doomPrice) || DOOM_START);
  const resolvedDoomStep = randomLocked ? DOOM_STEP : Math.max(100, Number(doomStep) || DOOM_STEP);
  const resolvedStartingCash = Number.isFinite(Number(startingCash)) ? Math.max(0, Math.round(Number(startingCash))) : START_CASH;
  state.board = extBuildBoard(state, actualMode);
  if (Number.isInteger(resolvedRounds)) state.maxRounds = clamp(resolvedRounds, 3, 30);
  state.ext = {
    version: EXT_VERSION,
    mode: actualMode,
    requestedMode: requested,
    debug: Boolean(debug),
    target: resolvedTarget,
    targetAssets: resolvedTarget,
    targetStars: resolvedStarGoal,
    starPrice: STAR_PRICE_START,
    starSold: 0,
    inflation: 1,
    inflationStage: 1,
    doomPrice: resolvedDoomPrice,
    doomStep: resolvedDoomStep,
    doomCount: 0,
    doomEvery: resolvedDoomEvery,
    suddenDeath: false,
    enraged: false,
    auction: null,
    investOffer: null,
    taxChoice: null,
    insiderOffer: null,
    wheelResult: null,
    forcedStarOffer: null,
    vector: null,
    domain: null,
    certificates: [],
    investmentSettlement: null,
    history: [],
    turnSnapshot: null,
    doomEvent: null,
    suddenDeathEvent: null,
    pendingVictory: null,
    finishTitle: null,
    lastEvent: null,
    noInflation: false,
    noRedemption: false,
    confirmed: [],
    lobbyPlayers: null,
    replicas: null,
    starOffer: null,
    replaceOffer: null,
    eventPrompt: null,
    wheelPending: null,
    indulgenceEvent: null,
    totemEvent: null,
    vectorEvent: null,
    vectorPending: null,
    fateDice: null,
    tycoonStreaks: {},
    tycoonComeback: null
  };
  for (const p of state.players) {
    extPlayerExt(p);
    p.items = [];
    p.mythics = [];
    p.specials = [];
    p.energy = 1;
    p.shields = 0;
    p.leverage = false;
    p.forcedSteps = null;
    p.bankLock = false;
    p.noReward = false;
    p.forcedRed = false;
    p.skipTurns = 0;
    p.rentTo = null;
    p.rentTurns = 0;
    p.parentId = null;
    p.stars = 0;
    p.cash = resolvedStartingCash;
    p.ext.itemRound = null;
  }
  state.starGoal = resolvedStarGoal;
  state.phase = 'roll';
  state.lastRoll = null;
  state.pendingDecision = null;
  state.ghostPosition = 1 + Math.floor(nextRandom(state) * (state.board.length - 1));
  state.ghostTrail = [];
  state.effects = {};
  state.log = [];
  state.status = 'playing';
  state.resultReason = null;
  state.winnerIds = [];
  const intro = mode === 'random'
    ? `🎲 隨機模式抽中「${meta.name}」！${meta.win}`
    : `${meta.icon} ${meta.name} 開始！${meta.win}`;
  log(state, intro);
  if (actualMode === 'star') log(state, `⭐ 出發格星價 ${extMoney(state.ext.starPrice)}，每賣出 1 顆全場 +${STAR_PRICE_STEP}。`);
  if (actualMode === 'tycoon') log(state, `💰 總資產目標 ${extMoney(state.ext.target)}；季數過半通膨 2 倍，倒數兩季 4 倍。`);
  if (actualMode === 'evil') log(state, `💀 每 ${state.ext.doomEvery} 季毀滅日收保護費，起步 ${extMoney(state.ext.doomPrice)}，每次收取後調漲 ${extMoney(state.ext.doomStep)}。`);
  if (debug) log(state, '🧪 測試模式啟動：可無限擲骰、自由添加道具與傳送棋子。');
  extRecordRound(state, 0, { initial: true });
  startTurn(state);
  return state;
}

export function extEnsureState(state) {
  if (!state || typeof state !== 'object') return state;
  for (const p of state.players || []) extPlayerExt(p);
  if (state.ext && state.ext.version) {
    // 「經典派對」已移除；舊存檔自動升級成企業之星，避免留下幽靈模式。
    if (state.ext.mode === 'classic' || !GAME_MODES[state.ext.mode]) state.ext.mode = extNormalizeMode(state.ext.mode);
    if (state.ext.requestedMode === 'classic') state.ext.requestedMode = 'star';
    state.ext.targetAssets = Number(state.ext.targetAssets ?? state.ext.target) || 0;
    state.ext.targetStars = Number(state.ext.targetStars ?? state.starGoal) || STAR_GOAL;
    if (!('eventPrompt' in state.ext)) state.ext.eventPrompt = null;
    if (!('wheelPending' in state.ext)) state.ext.wheelPending = null;
    if (!('indulgenceEvent' in state.ext)) state.ext.indulgenceEvent = null;
    if (!('totemEvent' in state.ext)) state.ext.totemEvent = null;
    if (!('vectorEvent' in state.ext)) state.ext.vectorEvent = null;
    if (!('vectorPending' in state.ext)) state.ext.vectorPending = null;
    if (!('fateDice' in state.ext)) state.ext.fateDice = null;
    if (!state.ext.tycoonStreaks || typeof state.ext.tycoonStreaks !== 'object') state.ext.tycoonStreaks = {};
    if (!('tycoonComeback' in state.ext)) state.ext.tycoonComeback = null;
    if (!('pendingVictory' in state.ext)) state.ext.pendingVictory = null;
    if (!('noRedemption' in state.ext)) state.ext.noRedemption = false;
    const savedDoomStep = Number(state.ext.doomStep);
    state.ext.doomStep = state.ext.requestedMode === 'random'
      ? DOOM_STEP
      : Math.max(100, Number.isFinite(savedDoomStep) ? savedDoomStep : DOOM_STEP);
    return state;
  }
  state.board = Array.isArray(state.board) && state.board.length ? state.board : extBuildBoard(state);
  state.ext = {
    version: EXT_VERSION, mode: 'star', requestedMode: 'star', debug: false,
    target: 3, targetAssets: 3, targetStars: 3, starPrice: STAR_PRICE_START, starSold: 0, inflation: 1, inflationStage: 1,
    doomPrice: DOOM_START, doomStep: DOOM_STEP, doomCount: 0, doomEvery: DOOM_EVERY, suddenDeath: false, enraged: false,
    auction: null, investOffer: null, taxChoice: null, insiderOffer: null, wheelResult: null,
    forcedStarOffer: null, vector: null, domain: null, certificates: [], history: [],
    turnSnapshot: null, doomEvent: null, suddenDeathEvent: null, pendingVictory: null, finishTitle: null, lastEvent: null,
    noInflation: false, noRedemption: false, confirmed: [], lobbyPlayers: null, replicas: null, migrated: true,
    starOffer: null, replaceOffer: null, eventPrompt: null, wheelPending: null,
    indulgenceEvent: null, totemEvent: null, vectorEvent: null, vectorPending: null,
    fateDice: null, tycoonStreaks: {}, tycoonComeback: null
  };
  if (!state.ghostPosition || state.ghostPosition <= 0) state.ghostPosition = 1;
  extRecordRound(state, state.round || 1, { initial: true });
  log(state, '📦 已將舊存檔升級為派對擴充格式（道具、星數與企業完整保留）。');
  return state;
}

export function extModeInfo(state) { return extMode(state); }
export function extIsDebug(state) { return Boolean(state?.ext?.debug); }

export function extGain(state, player, amount, label = '') {
  if (!amount) return 0;
  addCash(state, player, amount);
  if (label) log(state, `${label}：${player.name} 獲得 ${extMoney(amount)} 總資產。`);
  return amount;
}

// 贖罪券統一入口：所有扣款（含直接 addCash）都必須先經過這裡。
function extTryRedeem(state, player, amount, label = '', { silent = false } = {}) {
  if (!state?.ext || !player || amount <= 0 || state.ext.noRedemption) return false;
  extPlayerExt(player);
  const ticket = extMythicEntry(player, 'indulgence');
  if (!ticket || ticket.charges <= 0) return false;
  ticket.charges -= 1;
  if (ticket.charges <= 0) player.mythics = player.mythics.filter(x => x.id !== 'indulgence');
  if (!silent) log(state, `🎫 ${player.name} 的贖罪券自動抵銷「${label || '扣款'}」（剩 ${Math.max(0, ticket.charges)} 次）。`);
  state.ext.indulgenceEvent = { playerId: player.id, label: label || '扣款', amount, remaining: Math.max(0, ticket.charges), at: Date.now() };
  return true;
}

export function extDamage(state, player, amount, { ignoreShield = false, ignoreRedemption = false, ignoreImmune = false, label = '', silent = false } = {}) {
  amount = Math.round(Number(amount) || 0);
  if (amount <= 0 || !player) return 0;
  if (player.ext?.eliminated) return 0;
  if (!ignoreImmune && (player.ext?.immune || player.ext?.bankai)) {
    if (!silent) log(state, `🛡️ ${player.name} 的${player.ext?.bankai ? '卍解' : '無敵'}狀態無效化「${label || '負面效果'}」。`);
    return 0;
  }
  if (!ignoreRedemption) {
    if (extTryRedeem(state, player, amount, label, { silent })) return 0;
  }
  if (!ignoreShield && player.shields > 0) {
    player.shields -= 1;
    if (!silent) log(state, `🛡️ ${player.name} 的護盾擋下「${label || '負面效果'}」。`);
    return 0;
  }
  if (ignoreRedemption && state.ext) {
    state.ext.noRedemption = true;
    try { addCash(state, player, -amount); }
    finally { state.ext.noRedemption = false; }
  } else {
    addCash(state, player, -amount);
  }
  return amount;
}

export function extTargets(state, excludeId) {
  return state.players.filter(p => p.id !== excludeId && !p.ext?.eliminated);
}

export function extSurvivors(state) {
  return state.players.filter(p => !p.ext?.eliminated);
}

export function extStatusChips(state, player) {
  extPlayerExt(player);
  const chips = [];
  if (player.ext.eliminated) chips.push({ icon: '👻', label: '罷工團 · 已幽靈化', tone: 'bad' });
  if (player.ext.frozen > 0) chips.push({ icon: '❄️', label: `凍結 ×${player.ext.frozen}`, tone: 'bad' });
  if (player.ext.iceLock > 0) chips.push({ icon: '🧊', label: `冰封禁用技能／道具 ×${player.ext.iceLock}`, tone: 'bad' });
  if (player.ext.burn > 0) chips.push({ icon: '🔥', label: '炎上：123 骰＋紅格加倍', tone: 'bad' });
  if (player.ext.bankFreeze) chips.push({ icon: '🧊', label: '帳戶凍結', tone: 'bad' });
  if (player.ext.bankai) chips.push({ icon: '🌀', label: '卍解中', tone: 'star' });
  if (player.ext.immune) chips.push({ icon: '✨', label: '本回合無敵', tone: 'good' });
  if (player.ext.forceOneNext) chips.push({ icon: '🌐', label: '下回合只能走 1 步', tone: 'bad' });
  if (player.mythics?.length) chips.push({ icon: '🗿', label: `神話道具 ×${player.mythics.length}`, tone: 'star' });
  if (state.ext?.domain && state.ext.domain.ownerId === player.id) chips.push({ icon: '🌐', label: '弱者領域展開中', tone: 'good' });
  if (state.ext?.suddenDeath) chips.push({ icon: '⚡', label: '驟死賽', tone: 'bad' });
  return chips;
}

// 弱者領域會即時跟隨擁有者位置，永遠覆蓋目前格與左右各一格。
export function extDomainTiles(state) {
  const d = state?.ext?.domain;
  if (!d) return [];
  const owner = state.players.find(p => p.id === d.ownerId);
  if (!owner || owner.ext?.eliminated) return [];
  const len = boardOf(state).length;
  const tiles = [-1, 0, 1].map(delta => (owner.position + delta + len) % len);
  d.tiles = tiles;
  return tiles;
}

export function extInflationValue(state, amount) {
  const ext = state?.ext;
  if (!ext || ext.mode !== 'tycoon' || ext.noInflation) return amount;
  return Math.round(amount * (ext.inflation || 1));
}

export function extInflationStage(state) {
  const ext = state?.ext;
  if (!ext || ext.mode !== 'tycoon') return 0;
  const half = Math.ceil(state.maxRounds / 2);
  if (state.round > state.maxRounds - 2) return 4;
  if (state.round > half) return 2;
  return 1;
}

export function extRefreshInflation(state, { announce = true, nextRound } = {}) {
  const ext = state.ext;
  if (!ext || ext.mode !== 'tycoon') return;
  const savedRound = state.round;
  if (Number.isInteger(nextRound)) state.round = nextRound;
  const next = extInflationStage(state);
  state.round = savedRound;
  if (next === ext.inflationStage) return;
  const previous = ext.inflationStage;
  ext.inflationStage = next;
  ext.inflation = next === 1 ? 1 : next;
  if (announce && next > previous && next >= 2) {
    ext.lastEvent = { type: 'inflation', stage: next, text: next === 4 ? '通膨來襲！資產變動 4 倍！' : '通膨來襲！資產變動 2 倍！' };
    log(state, `🚨 第 ${state.round} 季進入通膨第 ${next === 4 ? '二' : '一'}階段，所有賺與扣的錢變 ${next} 倍！`);
  }
}

// ---------------------------------------------------------------------------
// 掛鉤註冊
// ---------------------------------------------------------------------------
engineHooks.roleExists = id => id === RANDOM_ROLE_ID || PARTY_ROLES.some(r => r.id === id) || ROLES.some(r => r.id === id);

engineHooks.adjustCash = (state, player, amount) => {
  const ext = state?.ext;
  if (!ext) return amount;
  let value = Number(amount) || 0;
  if (ext.mode === 'tycoon' && !ext.noInflation && ext.inflation > 1) value *= ext.inflation;
  if (value > 0 && player?.ext?.bankai) value += 100;
  return Math.round(value);
};

engineHooks.canDrawItem = (state, player) => {
  if (player.ext?.eliminated) return false;
  if (player.ext?.bankai) { log(state, `🌀 ${player.name} 的卍解禁止獲取新道具。`); return false; }
  return extItemCount(player) < 3;
};
engineHooks.itemAcquired = (state, player, itemId) => {
  if (!player?.ext) return;
  player.ext.itemsAcquired = (player.ext.itemsAcquired || 0) + 1;
  if (itemById(itemId)) {
    if (!player.ext.itemRound || player.ext.itemRound.round !== state.round) {
      player.ext.itemRound = { round: state.round, ids: [] };
    }
    player.ext.itemRound.ids.push(itemId);
  }
  extNoteItem(player, itemById(itemId)?.name || itemId);
};

function extCaptureRollSnapshot(state, player) {
  if (!state?.ext) return null;
  state.ext.turnSnapshot = clone({
    playerId: player.id, round: state.round, turnIndex: state.turnIndex,
    ghostPosition: state.ghostPosition, ghostTrail: state.ghostTrail, effects: state.effects,
    cornerSubsidyEvent: state.cornerSubsidyEvent,
    players: state.players.map(p => ({
      id: p.id, cash: p.cash, stars: p.stars, energy: p.energy, shields: p.shields, items: p.items,
      mythics: p.mythics, marks: p.marks, position: p.position, skipTurns: p.skipTurns, parentId: p.parentId, rentTo: p.rentTo,
      rentTurns: p.rentTurns, leverage: p.leverage, bankLock: p.bankLock, noReward: p.noReward,
      forcedRed: p.forcedRed, forcedSteps: p.forcedSteps, ext: p.ext
    }))
  });
  return state.ext.turnSnapshot;
}

engineHooks.beforeRoll = (state, player) => extCaptureRollSnapshot(state, player);

engineHooks.startTurn = (state, player) => {
  const ext = extPlayerExt(player);
  // createGame() 會先建立基礎 state 並呼叫一次 startTurn，此時擴充 state.ext 尚未建立。
  if (!state.ext) return;
  if (state.ext.starOffer) state.ext.starOffer = null;
  if (ext.eliminated) {
    // 罷工幽靈仍可正常擲骰與移動，只是不能使用技能／道具。
    player.skipTurns = 0;
    player.rentTo = null;
    player.rentTurns = 0;
    player.parentId = null;
    ext.oneStepLock = false;
    ext.noDiceItems = false;
    log(state, `👻 ${player.name} 的幽靈回合開始，仍可擲骰移動（無法使用技能）。`);
    return;
  }
  // 弱者的領域持續到擁有者下一次自己的回合開始才收束。
  if (state.ext.domain) {
    const owner = state.players.find(p => p.id === state.ext.domain.ownerId);
    if (!owner || owner.ext?.eliminated || owner.id === player.id) {
      log(state, `🌐 ${owner?.name || '玩家'} 的弱者的領域收束。`);
      state.ext.domain = null;
    }
  }
  player.ext.immune = false;
  if (ext.frozen > 0) {
    player.skipTurns = Math.max(player.skipTurns || 0, 1);
    log(state, `❄️ ${player.name} 被寒冰蘑菇凍結，本回合無法行動（剩 ${ext.frozen} 回合）。`);
  }
  if (ext.iceLock > 0) {
    log(state, `🧊 ${player.name} 被寒冰蘑菇封印，${ext.iceLock} 回合內禁用技能與道具。`);
  }
  if (ext.bankFreeze) {
    log(state, `🧊 ${player.name} 的帳戶被凍結：這回合不能用道具，經過出發格也不能買星。`);
  }
  ext.oneStepLock = false;
  if (ext.burn > 0) {
    player.forcedSteps = 'low';
    log(state, `🔥 ${player.name} 遭到炎上商法：本回合只能擲出 1–3，且踩紅格扣款翻倍。`);
  }
  if (ext.forceOneNext) {
    ext.forceOneNext = false;
    ext.noDiceItems = true;
    ext.oneStepLock = true;
    player.forcedSteps = 'one';
    log(state, `🌐 弱者領域代價：${player.name} 本回合只能走 1 步，且禁用任何換骰道具。`);
  } else if (!ext.burn) {
    ext.noDiceItems = false;
  }
  if (ext.bankai) {
    addCash(state, player, 100);
    log(state, `🌀 ${player.name} 的卍解持續運作，本回合收益 +100。`);
  }
  // 弱者領域只在「進入」時扣款，由 afterRoll 處理；回合開始不重複扣款。
  // 魔女因子快照已改為每次擲骰前由 beforeRoll 覆蓋。
};

engineHooks.canUse = (state, player, kind, itemId) => {
  const ext = extPlayerExt(player);
  if (ext.eliminated) return false;
  if (ext.frozen > 0) return false;
  if (ext.iceLock > 0) return false;
  if (state.ext.domain) {
    const d = state.ext.domain;
    if (d.ownerId !== player.id && extDomainTiles(state).includes(player.position)) return false;
  }
  if (kind === 'item' && ext.oneStepLock && ['dice123', 'dice456', 'swap'].includes(itemId)) return false;
  if (kind === 'item' && ext.noDiceItems && ['dice123', 'dice456'].includes(itemId)) return false;
  if (kind === 'item' && ext.bankFreeze) return false;
  return true;
};
engineHooks.blockedReason = (state, player, kind, itemId) => {
  const ext = extPlayerExt(player);
  if (ext.eliminated) return '罷工團幽靈無法使用技能或道具。';
  if (ext.frozen > 0) return `被凍結中，還剩 ${ext.frozen} 回合。`;
  if (ext.iceLock > 0) return `被寒冰蘑菇封印中，還剩 ${ext.iceLock} 回合無法使用技能與道具。`;
  if (state.ext.domain && state.ext.domain.ownerId !== player.id && extDomainTiles(state).includes(player.position)) return '弱者的領域內禁用技能與道具。';
  if (kind === 'item' && ext.oneStepLock && ['dice123', 'dice456', 'swap'].includes(itemId)) return '弱者領域代價：本回合只能走 1 步，不能改變步數或位置。';
  if (kind === 'item' && ext.noDiceItems && ['dice123', 'dice456'].includes(itemId)) return '弱者領域代價：本回合禁用換骰道具。';
  if (kind === 'item' && ext.bankFreeze) return '帳戶凍結中，本回合禁用道具。';
  return '目前無法使用。';
};

// 矢量操作：使用者自己移動時，掃描出發、沿途與最後停留格。
// 這些格子上的其他玩家會立刻被傳送到指定格，並強制結算該格效果。
engineHooks.adjustMovePath = (state, player, fullPath, { from } = {}) => {
  const ext = state.ext;
  const vector = ext?.vector;
  if (!vector || !vector.active || !Number.isInteger(vector.destination)) return null;
  // 不是使用者本人移動，或使用者已幽靈化，都不能觸發。
  if (vector.ownerId !== player.id || player.ext?.eliminated) return null;
  if (vector.round !== state.round) { ext.vector = null; return null; }
  const start = Number.isInteger(from) ? from : player.position;
  const route = [start, ...fullPath];
  const seen = new Set();
  const candidates = [];
  for (const tile of route) {
    for (const other of state.players) {
      if (other.id === player.id || other.ext?.eliminated || seen.has(other.id)) continue;
      if (other.position !== tile) continue;
      seen.add(other.id);
      candidates.push({ playerId: other.id, name: other.name, from: other.position });
    }
  }
  const destination = vector.destination;
  ext.vector = null;
  if (!candidates.length) {
    log(state, `⬆️ ${player.name} 的矢量操作沒有在移動路徑上遇到其他玩家，能量消散。`);
    return null;
  }
  log(state, `⬆️ ${player.name} 發動矢量操作，掃描移動路徑第 ${route.join('、')} 格。`);
  return { path: fullPath, meta: { vector: { ownerId: player.id, destination, route, candidates } } };
};

// 贖罪券全域防禦：連蕭條格、租金、稅金、拍賣等直接扣款也必須先消耗一次。
engineHooks.beforeCash = (state, player, amount) => {
  if (!state?.ext || amount >= 0) return amount;
  if (extTryRedeem(state, player, -amount, '總資產扣款')) return 0;
  return amount;
};

// 全域負債淘汰：任何模式負債達 1,000 就化為罷工幽靈。
engineHooks.afterCash = (state, player) => {
  if (!state?.ext || state.status !== 'playing') return;
  extCheckBankruptcy(state, player);
};

// 快速決策防呆：技能點不足的選項禁用；選項 C 預設隱藏，只有 A、B 都不可用時才顯示。
function extWithQuickFallback(options) {
  const list = (options || []).filter(o => o.id !== QUICK_DECISION_FALLBACK.id);
  const fallbackVisible = !list.some(o => o.available !== false);
  list.push({ ...QUICK_DECISION_FALLBACK, available: true, hidden: !fallbackVisible });
  return list;
}

engineHooks.prepareDecision = (state, decision, player) => {
  if (!decision?.options) return decision;
  const options = decision.options.map(o => ({
    ...o,
    available: o.available !== false && !(o.cash < 0 && player.cash < -o.cash) && !(o.energy < 0 && player.energy < -o.energy)
  }));
  return { ...decision, options: extWithQuickFallback(options) };
};

engineHooks.resolveTile = (state, player, opts, effects) => {
  const tile = boardOf(state)[player.position];
  const ext = state.ext;
  if (!tile?.special) return;
  if (tile.type === 'market') {
    const pool = MYTHIC_ITEMS.filter(x => !x.hidden && (!x.mode || x.mode === ext.mode));
    const item = pool[Math.floor(nextRandom(state) * pool.length)] || MYTHIC_ITEMS[0];
    const order = state.players.filter(p => !p.ext?.eliminated).map(p => p.id);
    const startIndex = Math.max(0, order.indexOf(player.id));
    ext.auction = {
      tileIndex: tile.index, itemId: item.id, basePrice: 1000, currentPrice: 1000,
      highestBidder: null, highestBid: 0, order, index: startIndex, currentId: order[startIndex] || null,
      initiatorId: player.id, active: [...order], passed: []
    };
    effects.push({ icon: '🛒', text: '黑市拍賣開張：隱藏神話道具起標 1,000，每次抬價 250。', tone: 'event' });
    log(state, `🛒 ${player.name} 停在黑市格，拍賣會開始！`);
    return;
  }
  if (tile.type === 'invest') {
    const cost = Math.floor(Math.max(0, player.cash) * 0.5);
    ext.investOffer = { playerId: player.id, tileIndex: tile.index, cost };
    effects.push({ icon: '📈', text: cost > 0 ? `投資格：可投入 ${extMoney(cost)}（50% 總資產）換取股票憑證。` : '投資格：目前沒有可投入的總資產。', tone: 'event' });
    return;
  }
  if (tile.type === 'tax') {
    ext.taxChoice = { playerId: player.id, tileIndex: tile.index };
    effects.push({ icon: '🏛️', text: '查稅局：繳交 50% 總資產，或接受 2 回合羈押。', tone: 'bad' });
    return;
  }
  if (tile.type === 'insider') {
    ext.insiderOffer = { playerId: player.id, tileIndex: tile.index };
    effects.push({ icon: '🌈', text: '內線交易：花 100 啟動命運輪盤。', tone: 'event' });
    return;
  }
};

// 事件格專屬提示：記下實際抽到的事件，讓 UI 在棋子停下後彈出專屬視窗。
engineHooks.tileEvent = (state, player, event) => {
  if (!state.ext) return;
  state.ext.eventPrompt = {
    playerId: player.id, eventId: event.id, name: event.name, icon: event.icon,
    text: event.text, kind: event.kind, amount: event.amount, at: Date.now()
  };
};

// 真正套用矢量傳送與受害者格子效果。互動流程會在 0.5 秒鎖定預警後才呼叫。
function extApplyVectorResolution(state, vector, ownerId, roll = null) {
  if (!state?.ext || !vector) return null;
  const hits = [];
  if (roll && !Array.isArray(roll.effects)) roll.effects = [];
  for (const candidate of vector.candidates || []) {
    const target = state.players.find(p => p.id === candidate.playerId);
    if (!target || target.ext?.eliminated) continue;
    const from = target.position;
    target.position = vector.destination;
    applyCornerProgress(state,target,[vector.destination]);
    const effects = resolveTileFor(state, target, {});
    const detail = effects.map(e => e.text).filter(Boolean).join('；');
    hits.push({ playerId: target.id, name: target.name, from, to: vector.destination, effects });
    if (roll) {
      roll.effects.push({
        icon: '⬆️',
        text: `矢量操作：${target.name} 從第 ${from} 格被傳送到第 ${vector.destination} 格，強制觸發格子效果${detail ? `：${detail}` : '。'}`,
        tone: 'event'
      });
    }
    log(state, `⬆️ ${target.name} 被矢量操作傳送到第 ${vector.destination} 格並觸發效果${detail ? `：${detail}` : '。'}`);
    // 若受害者觸發破產／終局，或魔女因子回溯全場，立刻停止後續傳送。
    if (state.status !== 'playing' || state.ext.rewound) break;
  }
  if (!hits.length) return null;
  const first = hits[0];
  state.ext.vectorEvent = {
    type: 'vector', ownerId, destination: vector.destination, route: vector.route,
    hits, playerId: first.playerId, from: first.from, to: vector.destination, at: Date.now()
  };
  return state.ext.vectorEvent;
}

function extResolveVector(state, player, roll, { defer = false } = {}) {
  const vector = roll?.vector;
  if (!vector || !Array.isArray(vector.candidates) || !vector.candidates.length) return;
  if (!Array.isArray(roll.effects)) roll.effects = [];
  const ext = state.ext;
  if (defer) {
    if (!ext.vectorPending) {
      const names = vector.candidates.map(c => c.name).filter(Boolean).join('、') || '目標';
      ext.vectorPending = {
        ownerId: player.id,
        ownerName: player.name,
        destination: vector.destination,
        route: vector.route,
        candidates: vector.candidates.map(c => ({ ...c })),
        at: Date.now()
      };
      roll.effects.push({
        icon: '🎯',
        text: `矢量操作鎖定 ${names}，準備傳送到第 ${vector.destination} 格…`,
        tone: 'event'
      });
      log(state, `🎯 ${player.name} 的矢量操作鎖定 ${names}，0.5 秒後執行傳送。`);
    }
    return;
  }
  extApplyVectorResolution(state, vector, player.id, roll);
}

// 由 UI 在鎖定預警結束後呼叫；只會套用一次，重複呼叫不會重複傳送。
export function extResolveVectorPending(state) {
  const pending = state?.ext?.vectorPending;
  if (!pending) return null;
  state.ext.vectorPending = null;
  if (state.status !== 'playing') return null;
  const roll = state.lastRoll && state.lastRoll.playerId === pending.ownerId ? state.lastRoll : null;
  const event = extApplyVectorResolution(state, pending, pending.ownerId, roll);
  if (!event) return null;
  // afterRoll 在延後流程中已先跑過一次；受害者被傳送後要重新檢查勝負與強買星。
  extCheckWin(state);
  if (state.status === 'playing') extMaybeForcedStar(state);
  return event;
}

engineHooks.afterRoll = (state, player, roll, options = {}) => {
  const ext = state.ext;
  if (!ext || state.status !== 'playing') return;
  const rewound = Boolean(ext.rewound);
  if (rewound) {
    ext.rewound = false;
    roll.path = [player.position];
    roll.tileIndex = player.position;
    roll.tileType = boardOf(state)[player.position]?.type;
    roll.effects = roll.effects.filter(e => e.icon === '🦠');
    roll.passedStart = false;
    roll.struck = false;
  }
  // 矢量操作在本次移動路徑確定後結算；被傳送的玩家會立即承受指定格效果。
  if (!rewound) {
    extResolveVector(state, player, roll, { defer: Boolean(options.deferVector) });
    if (state.status !== 'playing') return;
  }
  // 弱者的領域即時跟隨擁有者位置；踏入當下才扣款。
  const domainTiles = extDomainTiles(state);
  if (ext.domain && ext.domain.ownerId !== player.id && domainTiles.includes(player.position)) {
    const owner = state.players.find(p => p.id === ext.domain.ownerId);
    const lost = extDamage(state, player, 100, { label: '弱者領域', silent: true });
    const detail = lost > 0 ? `扣除 ${extMoney(lost)} 總資產` : '傷害被無效化';
    roll.effects.push({ icon: '🌐', text: `踏入 ${owner?.name || '對手'} 的弱者的領域，${detail}。`, tone: 'bad' });
    log(state, `🌐 ${player.name} 踏入弱者的領域，${detail}。`);
    ext.lastEvent = { type: 'domainHit', playerId: player.id, ownerId: owner?.id, amount: lost, at: Date.now() };
    if (state.status !== 'playing') return;
  }
  // 罷工幽靈移動後與存活玩家同格：強制該存活玩家觸發罷工。
  if (player.ext?.eliminated) {
    const victims = state.players.filter(p => p.id !== player.id && !p.ext?.eliminated && p.position === player.position);
    for (const victim of victims) {
      const strikeEffects = [];
      engineHooks.ghostStrike(state, victim, strikeEffects);
      const detail = strikeEffects.map(e => e.text).join(' ');
      roll.effects.push({ icon: '👻', text: `${player.name} 的幽靈與 ${victim.name} 同格，強制觸發罷工！${detail ? ` ${detail}` : ''}`, tone: 'bad' });
      log(state, `👻 ${player.name} 的幽靈纏上 ${victim.name}，強制觸發罷工。`);
      if (state.status !== 'playing') return;
    }
  }
  // 起點買星只認「本次移動經過或踩中」；開局站在原地不會建立邀請。
  const touchedStart = Boolean(roll.passedStart) || (Array.isArray(roll.path) && roll.path.includes(0));
  if (ext.mode === 'star' && !rewound && touchedStart && !player.ext?.bankFreeze && !player.ext?.eliminated) {
    ext.starOffer = { playerId: player.id, price: extStarPrice(state), passed: Boolean(roll.passedStart), landed: player.position === 0 };
  } else if (ext.starOffer?.playerId === player.id) {
    ext.starOffer = null;
  }
  const tile = boardOf(state)[roll.tileIndex];
  if (roll.struck || tile?.special) {
    state.pendingDecision = null;
    state.phase = 'resolve';
  } else {
    const scenario = QUICK_DECISIONS[Math.floor(nextRandom(state) * QUICK_DECISIONS.length)];
    const options = scenario.options.map(o => ({
      ...o,
      available: !(o.cash < 0 && player.cash < -o.cash) && !(o.energy < 0 && player.energy < -o.energy)
    }));
    state.pendingDecision = {
      playerId: player.id, kind: 'ext', scenarioId: scenario.id, title: scenario.name, icon: scenario.icon, text: scenario.text,
      options: extWithQuickFallback(options)
    };
    state.phase = 'decision';
  }
  extRefreshInflation(state);
  extCheckWin(state);
  extMaybeForcedStar(state);
};

engineHooks.ghostStrike = (state, player, effects) => {
  const ext = state.ext;
  const penalty = 1000 * (ext?.enraged ? 2 : 1);
  if (extHasMythic(player, 'witchFactor') && state.ext.turnSnapshot?.playerId === player.id) {
    const snap = state.ext.turnSnapshot;
    for (const saved of snap.players) {
      const target = state.players.find(p => p.id === saved.id);
      if (!target) continue;
      Object.assign(target, {
        cash: saved.cash, stars: saved.stars, energy: saved.energy, shields: saved.shields,
        items: clone(saved.items), mythics: clone(saved.mythics), marks: clone(saved.marks), position: saved.position,
        skipTurns: saved.skipTurns, parentId: saved.parentId, rentTo: saved.rentTo, rentTurns: saved.rentTurns,
        leverage: saved.leverage, bankLock: saved.bankLock, noReward: saved.noReward,
        forcedRed: saved.forcedRed, forcedSteps: saved.forcedSteps, ext: clone(saved.ext)
      });
    }
    state.ghostPosition = snap.ghostPosition;
    state.ghostTrail = snap.ghostTrail;
    state.effects = clone(snap.effects);
    state.cornerSubsidyEvent = clone(snap.cornerSubsidyEvent || null);
    state.ext.rewound = true;
    state.ext.lastEvent = { type: 'witch', playerId: player.id, at: Date.now() };
    effects.push({ icon: '🦠', text: '魔女因子發動「死亡回歸」：全場狀態回溯至本次擲骰前！', tone: 'event' });
    log(state, `🦠 ${player.name} 踩中幽靈，觸發死亡回歸，全場回到本次擲骰前。`);
    return;
  }
  let lost = '';
  const protectedByBankai = Boolean(player.ext?.bankai);
  if (!protectedByBankai && player.items?.length) {
    const i = Math.floor(nextRandom(state) * player.items.length);
    const id = player.items.splice(i, 1)[0];
    lost = itemById(id)?.name || id;
  } else if (!protectedByBankai && player.mythics?.length) {
    const i = Math.floor(nextRandom(state) * player.mythics.length);
    const entry = player.mythics.splice(i, 1)[0];
    lost = MYTHIC_BY_ID[entry.id]?.name || entry.id;
  }
  const paid = extDamage(state, player, penalty, { ignoreShield: true, ignoreRedemption: false, label: '罷工幽靈', silent: true });
  const protectedNote = paid === 0
    ? (player.ext?.bankai ? '，卍解完全免疫' : extHasMythic(player, 'indulgence') ? '，贖罪券抵銷扣款' : '，護盾或免疫抵銷扣款')
    : '';
  effects.push({ icon: '👻', text: `踩中罷工幽靈：扣除 ${extMoney(paid)} 總資產${protectedNote}${lost ? `，並沒收道具「${lost}」` : protectedByBankai ? '，卍解的免疫擋下了道具沒收' : '，但沒有道具可沒收'}${ext?.enraged ? '（憤怒狀態 ×2）' : ''}。`, tone: 'bad' });
  log(state, `👻 ${player.name} 踩中罷工幽靈，損失 ${extMoney(paid)} 總資產${lost ? `與「${lost}」` : ''}${protectedNote}。`);
  state.ext.lastEvent = {
    type: 'ghostStrike', playerId: player.id, enraged: Boolean(ext?.enraged),
    amount: paid, lost, at: Date.now()
  };
  extCheckWin(state);
};

engineHooks.grantCertificate = (state, player, amount) => {
  const principal = Math.max(0, Math.round(Number(amount) || 0));
  if (!principal) return null;
  const cert = { id: `cert-${state.round}-${player.id}-${(state.ext.certificates || []).length}`, playerId: player.id, principal, round: state.round, resolved: false };
  state.ext.certificates.push(cert);
  log(state, `📈 ${player.name} 取得 ${extMoney(principal)} 股票憑證，季末結算。`);
  return cert;
};

engineHooks.tileDamageBlocked = (state, player, type) => Boolean(type === 'red' && (player.ext?.immune || player.ext?.bankai));
engineHooks.tileDamageMultiplier = (state, player, type) => (type === 'red' && player.ext?.burn > 0 ? 2 : 1);

engineHooks.beforeEndTurn = (state, player) => {
  const ext = state.ext;
  if (!ext) return;
  ext.forcedStarOffer = null;
  // 矢量操作只屬於使用者自己的移動；若未擲骰就結束回合，直接收束。
  if (ext.vector?.ownerId === player.id) {
    ext.vector = null;
    log(state, `⬆️ ${player.name} 未在移動中觸發矢量操作，能量消散。`);
  }
  // 未處理的起點買星／黑市滿包替換不得跨回合殘留，否則會鎖住下一位玩家。
  if (ext.starOffer?.playerId === player.id) ext.starOffer = null;
  // 命運輪盤、內線交易、投資邀請和事件提示也一樣：殘留的話下一位玩家的二選一視窗永遠不會出現。
  // 已付款的輪盤直接套用結果；沒回應的邀請視為放棄；事件效果早已套用，提示直接關掉。
  if (ext.wheelPending?.playerId === player.id) extResolveWheel(state, { playerId: player.id, at: ext.wheelPending.at });
  if (ext.insiderOffer?.playerId === player.id) ext.insiderOffer = null;
  if (ext.investOffer?.playerId === player.id) ext.investOffer = null;
  if (ext.eventPrompt?.playerId === player.id) ext.eventPrompt = null;
  if (ext.replaceOffer?.playerId === player.id) {
    const offer = ext.replaceOffer;
    ext.replaceOffer = null;
    log(state, `🛒 ${player.name} 未處理新道具，系統自動丟棄「${MYTHIC_BY_ID[offer.itemId]?.name || itemById(offer.itemId)?.name || offer.itemId}」。`);
  }
  // 寒冰蘑菇／炎上／帳戶凍結以「完整回合」計算，於回合結束才遞減。
  if (player.ext?.frozen > 0) player.ext.frozen -= 1;
  if (player.ext?.iceLock > 0) player.ext.iceLock -= 1;
  if (player.ext?.burn > 0) player.ext.burn -= 1;
  if (player.ext?.bankFreeze) player.ext.bankFreeze = false;
  if (player.ext?.noDiceItems) player.ext.noDiceItems = false;
  if (player.ext?.oneStepLock) player.ext.oneStepLock = false;
};

engineHooks.moveGhost = state => {
  const ext = state.ext;
  if (ext?.debug) return;
  const len = boardOf(state).length;
  const baseSteps = 1 + Math.floor(nextRandom(state) * 3);
  const steps = ext?.enraged ? Math.max(1, Math.round(baseSteps * 1.5)) : baseSteps;
  const direction = nextRandom(state) < 0.5 ? -1 : 1;
  const from = state.ghostPosition;
  state.ghostTrail = [from, ...Array.from({ length: steps }, (_, i) => (from + direction * (i + 1) + len) % len)];
  state.ghostPosition = state.ghostTrail.at(-1);
  if (ext?.enraged) log(state, '⚡ 憤怒幽靈以 1.5 倍速度移動。');
};

engineHooks.afterRound = (state, finishedRound, { final } = {}) => {
  const ext = state.ext;
  if (!ext) return;
  // 股票憑證季末結算
  const unresolved = (ext.certificates || []).filter(c => !c.resolved);
  const investmentResults = [];
  for (const cert of unresolved) {
    const roll = nextRandom(state);
    let multiplier = 0, label = '龐氏騙局';
    if (roll < 0.10) { multiplier = 3; label = '大牛市'; }
    else if (roll < 0.50) { multiplier = 1.5; label = '平穩期'; }
    const player = state.players.find(p => p.id === cert.playerId);
    if (!player) continue;
    const payout = Math.round(cert.principal * multiplier);
    const prev = ext.noInflation; ext.noInflation = true;
    if (payout > 0) addCash(state, player, payout);
    ext.noInflation = prev;
    cert.resolved = true;
    cert.outcome = label;
    cert.payout = payout;
    investmentResults.push({ playerId: player.id, playerName: player.name, label, principal: cert.principal, payout });
    log(state, `📈 ${player.name} 的股票憑證（本金 ${extMoney(cert.principal)}）季末結果：${label}，回收 ${extMoney(payout)}。`);
    ext.lastEvent = { type: 'investment', playerId: player.id, label, payout, principal: cert.principal };
  }
  ext.investmentSettlement = investmentResults.length
    ? { round: finishedRound, at: Date.now(), results: investmentResults }
    : null;
  ext.certificates = (ext.certificates || []).filter(c => !c.resolved || c.round === finishedRound);
  // 弱者的領域改為持續到擁有者下一次自己的回合開始，由 startTurn 收束。
  // 矢量操作只在本回合有效，若沒有玩家碰到指定格則季末失效。
  if (ext.vector && ext.vector.round <= finishedRound) {
    log(state, `⬆️ 矢量操作的指定格本回合沒有生效，能量消散。`);
    ext.vector = null;
  }
  for (const p of state.players) if (!p.ext?.eliminated) p.ext.aliveSeasons = (p.ext.aliveSeasons || 0) + 1;
  if (ext.mode === 'evil' && finishedRound > 0 && finishedRound % (ext.doomEvery || DOOM_EVERY) === 0) {
    extTriggerDoom(state);
  }
  // 首富競爭專屬落後補償：以「本季結算後」的總資產排名計算連續墊底季數。
  if (ext.mode === 'tycoon') extTycoonComeback(state);
  extRecordRound(state, finishedRound, { final });
  extRefreshInflation(state, { nextRound: Math.min(state.maxRounds, finishedRound + 1) });
  // 企業之星／首富的達標勝利只在季末正式結算。
  extCheckWin(state, { settle: true });
};

engineHooks.beforeFinal = (state, winners, ranked) => {
  const ext = state.ext;
  if (!ext) return null;
  if ((ext.mode === 'star' || ext.mode === 'tycoon') && winners.length > 1 && !ext.suddenDeath) {
    ext.suddenDeath = true;
    ext.enraged = true;
    ext.suddenDeathEvent = { winners: winners.map(p => p.name), round: state.round };
    ext.lastEvent = { type: 'suddenDeath', winners: winners.map(p => p.name), round: state.round, at: Date.now() };
    state.maxRounds += 2;
    log(state, `⚡ 第一名平手，驟死賽啟動！罷工幽靈進入憤怒狀態：紅色圖標、移動 1.5 倍、扣錢 2 倍。`);
    return { continue: true };
  }
  return null;
};

engineHooks.beforeFinish = (state, reason, winners) => {
  const ext = state.ext;
  if (!ext) return;
  const alive = extSurvivors(state);
  if (reason === 'survivor' || alive.length === 1) ext.finishTitle = '唯一的倖存者';
  else if (reason === 'bankrupt' || alive.length === 0) ext.finishTitle = '無人生還';
  else if (ext.mode === 'evil') ext.finishTitle = '邪惡企業結束';
  else if (ext.mode === 'star') ext.finishTitle = '企業之星';
  else if (ext.mode === 'tycoon') ext.finishTitle = '首富競爭';
  else ext.finishTitle = extMode(state).name;
};

// ---------------------------------------------------------------------------
// 模式與特殊格操作
// ---------------------------------------------------------------------------
export function extCheckBankruptcy(state, changed) {
  if (!state?.ext || state.status !== 'playing') return [];
  const eliminated = [];
  for (const p of state.players) {
    if (p.ext?.eliminated) continue;
    if (Number(p.cash) > -1000) continue;
    extPlayerExt(p);
    p.ext.eliminated = true;
    p.ext.ghostRole = true;
    p.ext.oneStepLock = false;
    p.ext.forceOneNext = false;
    if (state.ext.domain?.ownerId === p.id) state.ext.domain = null;
    p.stars = 0;
    p.cash = 0;
    p.items = [];
    p.mythics = [];
    p.specials = [];
    eliminated.push(p);
    log(state, `💀 ${p.name} 負債達到 1,000，遭到市場淘汰，化為藍色罷工幽靈。`);
  }
  if (eliminated.length) {
    const last = eliminated.at(-1);
    state.ext.lastEvent = { type: 'bankrupt', playerId: last.id, names: eliminated.map(p => p.name), at: Date.now() };
    extCheckWin(state);
  }
  return eliminated;
}

export function extCheckWin(state, { settle = false } = {}) {
  if (!state || state.status !== 'playing' || !state.ext) return false;
  const ext = state.ext;
  const alive = extSurvivors(state);
  if (!alive.length) {
    finish(state, 'bankrupt', []);
    log(state, '🏁 全員負債淘汰，無人倖存。');
    return true;
  }
  // 所有模式共用：只剩一位存活者就直接獲勝，其他人都已化為罷工幽靈。
  if (alive.length === 1) {
    finish(state, 'survivor', alive);
    log(state, `🏁 ${alive[0].name} 是唯一的倖存者！`);
    return true;
  }
  if (ext.mode === 'evil') return false;

  let qualified = [];
  let reason = null;
  let target = 0;
  if (ext.mode === 'star') {
    qualified = state.players.filter(p => !p.ext?.eliminated && p.stars >= (state.starGoal || STAR_GOAL));
    reason = 'stars';
    target = state.starGoal || STAR_GOAL;
  } else if (ext.mode === 'tycoon') {
    target = Number(ext.target) || TYCOON_TARGET;
    qualified = state.players.filter(p => !p.ext?.eliminated && p.cash >= target);
    reason = 'target';
  }
  if (!qualified.length) {
    // 如果在季中曾經達標、但季末前又失去資格，撤銷本季的達標提示。
    if (ext.pendingVictory) ext.pendingVictory = null;
    return false;
  }

  const playerIds = qualified.map(p => p.id);
  const names = qualified.map(p => p.name);
  const now = Date.now();
  const changed = !ext.pendingVictory
    || ext.pendingVictory.reason !== reason
    || ext.pendingVictory.round !== state.round
    || ext.pendingVictory.playerIds.join('|') !== playerIds.join('|');

  // 達標不再立即結束：先記錄「本季將進行結算」，等季末 afterRound 才正式 finish。
  ext.pendingVictory = {
    reason, mode: ext.mode, playerIds, names, target, round: state.round,
    at: changed ? now : (ext.pendingVictory?.at || now)
  };
  if (!settle) {
    if (changed) {
      const text = `${names.join('、')}已達標，本季將進行結算`;
      ext.lastEvent = { type: 'victoryPending', mode: ext.mode, reason, playerIds, names, target, text, at: now };
      log(state, `🏁 ${text}`);
    }
    return false;
  }

  ext.pendingVictory = null;
  finish(state, reason, qualified);
  log(state, reason === 'stars'
    ? `🏁 季末結算：${names.join('、')} 達成 ${target} 顆星，成為企業之星！`
    : `🏁 季末結算：${names.join('、')} 達到 ${extMoney(target)} 總資產，成為世界首富！`);
  return true;
}

export function extMaybeForcedStar(state) {
  const ext = state.ext;
  if (!ext || ext.mode !== 'star') return;
  const p = currentOf(state);
  if (p.ext?.eliminated) { ext.forcedStarOffer = null; return; }
  const stars = state.players.find(x => x.id !== p.id && !x.ext?.eliminated && x.position === p.position && x.stars > 0);
  ext.forcedStarOffer = stars ? { playerId: p.id, targetId: stars.id, cost: ext.starPrice + FORCED_STAR_PREMIUM } : null;
}

export function extStarPrice(state) { return Number(state.ext?.starPrice) || STAR_PRICE_START; }

export function extCanBuyStar(state) {
  if (state.status !== 'playing' || !state.ext) return { ok: false, reason: '對局已結束' };
  const p = currentOf(state);
  const mode = state.ext.mode;
  const offer = mode === 'star' && state.ext.starOffer?.playerId === p.id ? state.ext.starOffer : null;
  // 起點邀請必須先由「經過／踩中出發格」建立；開局原地站立不得直接買星。
  const phases = offer ? ['roll', 'resolve', 'decision'] : ['roll', 'resolve'];
  if (!phases.includes(state.phase)) return { ok: false, reason: '現在無法買星' };
  if (p.ext?.eliminated) return { ok: false, reason: '幽靈無法買星' };
  if (p.ext?.bankFreeze) return { ok: false, reason: '帳戶凍結，這回合不能買星' };
  if (mode === 'star') {
    if (!offer) return { ok: false, reason: '企業之星模式需經過或停在出發格才能買星' };
    if (p.stars >= (state.starGoal || STAR_GOAL)) return { ok: false, reason: '已達勝利星數' };
    if (p.cash < extStarPrice(state)) return { ok: false, reason: `需要 ${extMoney(extStarPrice(state))} 總資產` };
    return { ok: true, price: extStarPrice(state), offer: true };
  }
  if (p.stars >= (state.starGoal || STAR_GOAL)) return { ok: false, reason: '已達勝利星數' };
  if (p.cash < STAR_COST) return { ok: false, reason: `需要 ${extMoney(STAR_COST)} 總資產` };
  return { ok: true, price: STAR_COST };
}

export function extBuyStar(state) {
  const check = extCanBuyStar(state);
  if (!check.ok) throw Error(check.reason);
  const p = currentOf(state), ext = state.ext;
  const price = check.price;
  const prev = ext.noInflation; ext.noInflation = true;
  addCash(state, p, -price);
  ext.noInflation = prev;
  p.stars += 1;
  p.ext.starsBought = (p.ext.starsBought || 0) + 1;
  if (ext.mode === 'star') {
    ext.starSold = (ext.starSold || 0) + 1;
    ext.starPrice = extStarPrice(state) + STAR_PRICE_STEP;
    log(state, `⭐ ${p.name} 以 ${extMoney(price)} 買下第 ${p.stars} 顆星；全場星價升至 ${extMoney(ext.starPrice)}。`);
  } else {
    log(state, `⭐ ${p.name} 以 ${extMoney(price)} 買下第 ${p.stars} 顆併購星。`);
  }
  ext.starOffer = null;
  extSyncStarBlade(state, p);
  extCheckWin(state);
  return p.stars;
}

export function extSkipStarOffer(state) {
  if (state.ext) state.ext.starOffer = null;
  return true;
}

export function extClearEventPrompt(state) {
  if (state.ext) state.ext.eventPrompt = null;
  return true;
}

export function extForcedStarInfo(state) {
  const ext = state.ext;
  if (!ext || ext.mode !== 'star') return null;
  if (ext.forcedStarOffer) return ext.forcedStarOffer;
  extMaybeForcedStar(state);
  return ext.forcedStarOffer;
}

export function extForcedBuyStar(state, targetId) {
  const ext = state.ext;
  if (!ext || ext.mode !== 'star') throw Error('只有企業之星模式可以強買星星。');
  const p = currentOf(state), target = state.players.find(x => x.id === targetId);
  if (!target || target.id === p.id) throw Error('請選擇持有星星的對手。');
  if (target.position !== p.position || target.stars <= 0) throw Error('必須與持有星星的玩家同格。');
  const cost = extStarPrice(state) + FORCED_STAR_PREMIUM;
  if (p.cash < cost) throw Error(`強買需要 ${extMoney(cost)} 總資產。`);
  const prev = ext.noInflation; ext.noInflation = true;
  addCash(state, p, -cost);
  ext.noInflation = prev;
  target.stars -= 1;
  p.stars += 1;
  extSyncStarBlade(state, target, '星星被強買');
  extSyncStarBlade(state, p);
  ext.forcedStarOffer = null;
  log(state, `🌟 ${p.name} 支付 ${extMoney(cost)}（星價 ${extMoney(extStarPrice(state))} + 溢價 ${FORCED_STAR_PREMIUM}）強制買走 ${target.name} 的 1 顆星！此交易不會讓全場星價上漲。`);
  extCheckWin(state);
  return p.stars;
}

export function extExtraStatusChips(state, player) { return extStatusChips(state, player); }

// ---------------------------------------------------------------------------
// 技能
// ---------------------------------------------------------------------------
export function extUseSkill(state, targetId, sectorOrTile) {
  if (state.status !== 'playing') throw Error('遊戲已結束。');
  if (state.phase !== 'roll') throw Error('企業技能只能在擲骰前使用。');
  const p = currentOf(state);
  if (engineHooks.canUse && !engineHooks.canUse(state, p, 'skill')) throw Error(engineHooks.blockedReason?.(state, p, 'skill') || '目前無法使用技能。');
  if (p.energy < 1) throw Error('技能能量不足，請先踩技能格或使用道具補充。');
  const role = extRoleOf(p), skill = role.skill;
  const target = state.players.find(x => x.id === targetId);
  const others = extTargets(state, p.id);
  if (skill.target === 'opponent' && !target) throw Error('請選擇一位對手作為技能目標。');
  if (skill.target === 'tile' && !Number.isInteger(Number(sectorOrTile))) throw Error('請選擇一個格子。');
  const result = [];
  const damage = (who, amount, label, opts) => extDamage(state, who, amount, { label, ...(opts || {}) });
  switch (role.id) {
    case 'social': {
      if (!target) throw Error('請選擇一位對手。');
      if (target.ext?.bankai) { result.push(`${target.name} 的卍解無效化炎上效果`); break; }
      target.ext.burn = Math.max(1, target.ext.burn || 0);
      result.push(`${target.name} 下回合被炎上：只能擲 1–3，紅格扣款翻倍`);
      break;
    }
    case 'hardware': {
      if (!target) throw Error('請選擇一位對手。');
      if (target.ext?.bankai) { result.push(`${target.name} 的卍解保護道具，計畫性報廢失效`); break; }
      const normal = target.items || [], mythics = target.mythics || [];
      if (normal.length) {
        const i = Math.floor(nextRandom(state) * normal.length);
        const id = normal.splice(i, 1)[0];
        result.push(`摧毀 ${target.name} 的道具「${itemById(id)?.name || id}」`);
      } else if (mythics.length) {
        const i = Math.floor(nextRandom(state) * mythics.length);
        const entry = mythics.splice(i, 1)[0];
        result.push(`摧毀 ${target.name} 的神話道具「${MYTHIC_BY_ID[entry.id]?.name || entry.id}」`);
      } else result.push(`${target.name} 沒有道具可摧毀`);
      addCash(state, p, 200);
      result.push('並轉化為自己 200 總資產');
      break;
    }
    case 'ecommerce': {
      let total = 0;
      for (const other of others) total += damage(other, 80, skill.name) ? 80 : 0;
      if (total) addCash(state, p, total);
      p.ext.immune = true;
      result.push(`吸取全場共 ${extMoney(total)} 總資產，本回合自己踩格效果無效化`);
      break;
    }
    case 'investment': {
      if (!target) throw Error('請選擇一位對手。');
      const hit = damage(target, 150, skill.name, { ignoreShield: false });
      if (hit) addCash(state, p, 150);
      result.push(hit ? `偷取 ${target.name} 150 總資產` : `${target.name} 擋下了偷取`);
      if (hit && target.cash < p.cash) {
        let stolen = '';
        if (p.ext?.bankai) {
          result.push('對方資產較低，但卍解禁止獲取新道具，無法額外偷取');
          break;
        }
        if (!extHasItemSpace(p)) {
          result.push('對方資產較低，但你的道具欄已滿，無法額外偷取道具');
          break;
        }
        if (target.items?.length) {
          const i = Math.floor(nextRandom(state) * target.items.length);
          const id = target.items.splice(i, 1)[0];
          p.items.push(id);
          stolen = itemById(id)?.name || id;
        } else if (target.mythics?.length) {
          const i = Math.floor(nextRandom(state) * target.mythics.length);
          const entry = target.mythics.splice(i, 1)[0];
          p.mythics.push(entry);
          stolen = MYTHIC_BY_ID[entry.id]?.name || entry.id;
        }
        result.push(stolen ? `對方資產較低，額外偷走「${stolen}」` : '對方沒有道具可偷');
      }
      break;
    }
    case 'fastfood': {
      let success = 0;
      for (const other of others) if (damage(other, 100, skill.name)) success += 1;
      if (success) addCash(state, p, success * 50);
      result.push(`全場對手扣 100，成功 ${success} 人，自己回饋 ${success * 50}`);
      break;
    }
    case 'delivery': {
      const index = Number(sectorOrTile);
      if (!Number.isInteger(index) || index < 1 || index >= boardOf(state).length) throw Error('幽靈不能放在出發格。');
      state.ghostPosition = index;
      state.ghostTrail = [];
      result.push(`把罷工幽靈派到第 ${index} 格`);
      break;
    }
    case 'bank': {
      if (!target) throw Error('請選擇一位對手。');
      if (target.ext?.bankai) { result.push(`${target.name} 的卍解無效化帳戶凍結`); break; }
      target.ext.bankFreeze = true;
      result.push(`${target.name} 下回合經過出發格無法買星，且禁用道具`);
      break;
    }
    case 'property': {
      if (!target) throw Error('請選擇一位對手。');
      if (target.ext?.bankai) { result.push(`${target.name} 的卍解擋下強制徵收`); break; }
      const len = boardOf(state).length;
      const from = target.position;
      const path=Array.from({length:3},(_,i)=>(from-i-1+len)%len);
      target.position = path.at(-1);
      applyCornerProgress(state,target,path,{passedStart:path.includes(0)&&target.position!==0});
      const hit = damage(target, 200, skill.name);
      if (hit) addCash(state, p, 200);
      result.push(`${target.name} 被擊退 3 格${hit ? '，並被搶奪 200 總資產' : '，但護盾擋下了搶奪'}`);
      break;
    }
    case 'green': {
      const richest = [...others].sort((a, b) => b.cash - a.cash)[0];
      if (richest) {
        const hit = damage(richest, 300, skill.name);
        result.push(`鎖定首富 ${richest.name}，${hit ? '扣除 300 總資產' : '但被護盾擋下'}`);
      } else result.push('場上沒有其他對手');
      break;
    }
    case 'cloud': {
      if (!target) throw Error('請選擇一位對手。');
      if (target.ext?.bankai) { result.push(`${target.name} 的卍解讓零日漏洞無功而返`); break; }
      const stealItem = !p.ext?.bankai && (target.items?.length || target.mythics?.length) && extHasItemSpace(p) && nextRandom(state) < 0.5;
      if (stealItem) {
        if (target.items?.length) {
          const i = Math.floor(nextRandom(state) * target.items.length);
          const id = target.items.splice(i, 1)[0];
          p.items.push(id);
          result.push(`無視護盾，竊取 ${target.name} 的道具「${itemById(id)?.name || id}」`);
        } else {
          const i = Math.floor(nextRandom(state) * target.mythics.length);
          const entry = target.mythics.splice(i, 1)[0];
          p.mythics.push(entry);
          result.push(`無視護盾，竊取 ${target.name} 的神話道具「${MYTHIC_BY_ID[entry.id]?.name || entry.id}」`);
        }
      } else if (target.energy > 0) {
        target.energy -= 1;
        result.push(`無視護盾，竊取 ${target.name} 1 點技能能量`);
      } else {
        result.push(`${target.name} 沒有能量或道具可竊取`);
      }
      break;
    }
    default: throw Error('此企業沒有可用技能。');
  }
  p.energy -= 1;
  log(state, `${skill.icon} ${p.name} 發動「${skill.name}」：${result.join('；')}。`);
  extCheckWin(state);
  return { skill, result };
}

// ---------------------------------------------------------------------------
// 神話道具
// ---------------------------------------------------------------------------
export function extAddMythic(state, player, id, { silent = false } = {}) {
  const meta = MYTHIC_BY_ID[id];
  if (!meta || meta.hidden) return null;
  if (meta.mode && meta.mode !== state.ext.mode) return null;
  if (player?.ext?.bankai) {
    if (!silent) log(state, `🌀 ${player.name} 的卍解禁止獲取新道具（含神話道具）。`);
    return null;
  }
  extPlayerExt(player);
  const existing = extMythicEntry(player, id);
  if (existing && meta.charges) {
    if (!silent) log(state, `🗿 ${player.name} 已持有「${meta.name}」，重複取得不會增加使用次數。`);
    return meta;
  }
  if (!extHasItemSpace(player)) {
    if (!silent) log(state, `🎒 ${player.name} 的道具欄已滿（3 格），無法取得「${meta.name}」。`);
    return null;
  }
  player.mythics.push({ id, charges: meta.charges || 1 });
  player.ext.itemsAcquired = (player.ext.itemsAcquired || 0) + 1;
  extNoteItem(player, meta.name);
  if (!silent) log(state, `🗿 ${player.name} 取得神話道具「${meta.icon} ${meta.name}」。`);
  return meta;
}

export function extAddItem(state, player, itemId) {
  const item = itemById(itemId);
  if (!item) return false;
  if (player.ext?.bankai) { log(state, `🌀 ${player.name} 的卍解禁止獲取新道具。`); return false; }
  if (!extHasItemSpace(player)) return false;
  player.items.push(itemId);
  player.ext.itemsAcquired = (player.ext.itemsAcquired || 0) + 1;
  extNoteItem(player, item.name);
  return true;
}

// 系統特殊道具獨立於普通與神話道具，但仍與道具欄共用 3 格。
export function extAddSpecial(state, player, id, { silent = false } = {}) {
  const meta = SPECIAL_ITEM_BY_ID[id];
  if (!meta) return null;
  extPlayerExt(player);
  if (player.ext?.bankai) {
    if (!silent) log(state, `🌀 ${player.name} 的卍解禁止獲取新道具（含特殊道具）。`);
    return null;
  }
  if (!extHasItemSpace(player)) {
    if (!silent) log(state, `🎒 ${player.name} 的道具欄已滿（3 格），無法取得「${meta.name}」。`);
    return null;
  }
  player.specials.push(id);
  player.ext.itemsAcquired = (player.ext.itemsAcquired || 0) + 1;
  extNoteItem(player, meta.name);
  if (!silent) log(state, `✨ ${player.name} 取得特殊道具「${meta.icon} ${meta.name}」。`);
  return meta;
}

// 落後補償：優先替換該玩家本季剛抽到的普通道具，否則在空位放入或替換最後一個普通道具。
function extGrantFateDice(state, player) {
  extPlayerExt(player);
  let replaced = null;
  const roundItems = player.ext?.itemRound?.round === state.round ? player.ext.itemRound.ids : [];
  for (let i = roundItems.length - 1; i >= 0; i -= 1) {
    const index = player.items.lastIndexOf(roundItems[i]);
    if (index >= 0) {
      const id = player.items.splice(index, 1)[0];
      replaced = itemById(id)?.name || id;
      break;
    }
  }
  if (!replaced && !extHasItemSpace(player) && player.items?.length) {
    const id = player.items.pop();
    replaced = itemById(id)?.name || id;
  }
  const meta = extAddSpecial(state, player, FATE_DICE_ID, { silent: true });
  if (!meta) return null;
  if (replaced) {
    log(state, `✨ ${player.name} 的落後補償生效：將本季獲得的「${replaced}」替換為特殊道具「${meta.icon} ${meta.name}」。`);
  } else {
    log(state, `✨ ${player.name} 的落後補償生效：獲得特殊道具「${meta.icon} ${meta.name}」。`);
  }
  return { meta, replaced };
}

export function extTycoonComeback(state) {
  const ext = state.ext;
  if (!ext || ext.mode !== 'tycoon') return;
  const alive = state.players.filter(p => !p.ext?.eliminated);
  if (alive.length < 2) return;
  const lowestCash = Math.min(...alive.map(p => Number(p.cash) || 0));
  const lowest = alive.filter(p => (Number(p.cash) || 0) === lowestCash);
  const streaks = ext.tycoonStreaks && typeof ext.tycoonStreaks === 'object' ? ext.tycoonStreaks : (ext.tycoonStreaks = {});
  for (const p of state.players) {
    const previous = Math.max(0, Number(streaks[p.id]) || 0);
    if (p.ext?.eliminated) streaks[p.id] = 0;
    else if (lowest.some(x => x.id === p.id)) streaks[p.id] = previous + 1;
    else streaks[p.id] = 0;
  }
  for (const p of lowest) {
    const streak = Number(streaks[p.id]) || 0;
    if (streak < TYCOON_COMEBACK_SEASONS || streak % TYCOON_COMEBACK_SEASONS !== 0) continue;
    const result = extGrantFateDice(state, p);
    ext.tycoonComeback = {
      playerId: p.id, name: p.name, streak,
      granted: Boolean(result), replaced: result?.replaced || null, at: Date.now()
    };
    ext.lastEvent = { type: 'tycoonComeback', ...ext.tycoonComeback };
    if (!result) {
      log(state, `🎲 ${p.name} 已連續 ${streak} 季總資產墊底，但道具欄沒有可替換的普通道具，命運骰子無法發放。`);
    }
  }
}

// 命運骰子：先展開自選面板，玩家選定 1–6 後才消耗道具並由 UI 觸發擲骰。
export function extPrepareFateDice(state) {
  if (state.status !== 'playing') throw Error('遊戲已結束。');
  if (state.phase !== 'roll') throw Error('命運骰子只能在擲骰前使用。');
  const p = currentOf(state);
  if (!extHasSpecial(p, FATE_DICE_ID)) throw Error('你沒有命運骰子。');
  if (engineHooks.canUse && !engineHooks.canUse(state, p, 'item', FATE_DICE_ID)) {
    throw Error(engineHooks.blockedReason?.(state, p, 'item', FATE_DICE_ID) || '目前無法使用。');
  }
  state.ext.fateDice = { playerId: p.id, round: state.round, at: Date.now() };
  log(state, `🎲 ${p.name} 展開命運骰子，自選 1–6 步。`);
  return state.ext.fateDice;
}

export function extCancelFateDice(state) {
  if (state?.ext?.fateDice) {
    state.ext.fateDice = null;
    return true;
  }
  return false;
}

export function extUseFateDice(state, value) {
  const step = Number(value);
  if (!Number.isInteger(step) || step < 1 || step > 6) throw Error('命運骰子只能選擇 1–6。');
  if (state.status !== 'playing') throw Error('遊戲已結束。');
  if (state.phase !== 'roll') throw Error('命運骰子只能在擲骰前使用。');
  const p = currentOf(state);
  if (state.ext?.fateDice && state.ext.fateDice.playerId !== p.id) throw Error('現在不是你的命運骰子選擇。');
  const index = (p.specials || []).indexOf(FATE_DICE_ID);
  if (index < 0) throw Error('你沒有命運骰子。');
  if (engineHooks.canUse && !engineHooks.canUse(state, p, 'item', FATE_DICE_ID)) {
    throw Error(engineHooks.blockedReason?.(state, p, 'item', FATE_DICE_ID) || '目前無法使用。');
  }
  p.specials.splice(index, 1);
  state.ext.fateDice = null;
  log(state, `🎲 ${p.name} 使用命運骰子，鎖定前進 ${step} 步。`);
  return step;
}

export function extDiscard(state, player, kind, index) {
  extPlayerExt(player);
  if (kind === 'normal') {
    if (index < 0 || index >= player.items.length) throw Error('道具不存在。');
    const id = player.items.splice(index, 1)[0];
    log(state, `🗑️ ${player.name} 丟棄道具「${itemById(id)?.name || id}」。`);
  } else if (kind === 'special') {
    if (index < 0 || index >= (player.specials || []).length) throw Error('特殊道具不存在。');
    const id = player.specials.splice(index, 1)[0];
    log(state, `🗑️ ${player.name} 丟棄特殊道具「${SPECIAL_ITEM_BY_ID[id]?.name || id}」。`);
  } else {
    if (index < 0 || index >= (player.mythics || []).length) throw Error('神話道具不存在。');
    const entry = player.mythics.splice(index, 1)[0];
    if (entry.id === 'bankai' && player.ext) player.ext.bankai = false;
    log(state, `🗑️ ${player.name} 丟棄神話道具「${MYTHIC_BY_ID[entry.id]?.name || entry.id}」。`);
  }
}

export function extUseMythic(state, itemId, payload = {}) {
  if (state.status !== 'playing') throw Error('遊戲已結束。');
  if (state.phase !== 'roll') throw Error('神話道具只能在擲骰前使用。');
  const p = currentOf(state);
  extPlayerExt(p);
  if (!extMythicEntry(p, itemId)) throw Error('你沒有這個神話道具。');
  const meta = MYTHIC_BY_ID[itemId];
  if (engineHooks.canUse && !engineHooks.canUse(state, p, 'item', itemId)) throw Error(engineHooks.blockedReason?.(state, p, 'item', itemId) || '目前無法使用。');
  // canUse() 會正規化玩家狀態，因此在檢查後重新取得目前的神話道具物件。
  const entry = extMythicEntry(p, itemId);
  if (!entry) throw Error('你沒有這個神話道具。');
  switch (itemId) {
    case 'vector': {
      const index = Number(payload.tileIndex);
      if (!Number.isInteger(index) || index < 0 || index >= boardOf(state).length) throw Error('請選擇一個有效格子。');
      state.ext.vector = { ownerId: p.id, destination: index, round: state.round, active: true };
      p.mythics = p.mythics.filter(x => x.id !== itemId);
      log(state, `⬆️ ${p.name} 在地圖第 ${index} 格佈下矢量操作：本回合自己移動時，路徑上的其他玩家會被傳送到該格並觸發效果。`);
      break;
    }
    case 'truthGate': {
      if (entry.charges <= 0) throw Error('真理之門已耗盡。');
      if (payload.mode === 'sell') {
        if (!(p.items?.length || p.mythics?.length)) throw Error('背包裡沒有道具可以煉成金錢。');
        const kind = payload.kind === 'mythic' ? 'mythic' : 'normal';
        if (kind === 'normal') {
          const idx = Number(payload.index);
          if (idx < 0 || idx >= p.items.length) throw Error('道具不存在。');
          const id = p.items.splice(idx, 1)[0];
          addCash(state, p, 1000);
          log(state, `🚪 ${p.name} 用真理之門把「${itemById(id)?.name || id}」煉成 1,000 總資產。`);
        } else {
          const idx = Number(payload.index);
          if (idx < 0 || idx >= p.mythics.length) throw Error('神話道具不存在。');
          const removed = p.mythics.splice(idx, 1)[0];
          if (removed.id === 'bankai') p.ext.bankai = false;
          addCash(state, p, 1000);
          log(state, `🚪 ${p.name} 用真理之門把「${MYTHIC_BY_ID[removed.id]?.name}」煉成 1,000 總資產。`);
        }
      } else {
        const id = payload.itemId;
        if (payload.mythic || MYTHIC_BY_ID[id] || !itemById(id)) throw Error('金錢轉道具只能煉成普通道具。');
        if (p.cash < 1000) throw Error('需要 1,000 總資產才能煉成道具。');
        if (p.ext?.bankai) throw Error('卍解期間禁止獲取新道具。');
        if (!extHasItemSpace(p)) throw Error('道具欄已滿（3 格）。');
        const prev = state.ext.noInflation; state.ext.noInflation = true;
        addCash(state, p, -1000);
        state.ext.noInflation = prev;
        extAddItem(state, p, id);
        log(state, `🚪 ${p.name} 用真理之門把 1,000 總資產煉成「${itemById(id)?.name || id}」。`);
      }
      entry.charges -= 1;
      if (entry.charges <= 0) p.mythics = p.mythics.filter(x => x.id !== itemId);
      break;
    }
    case 'iceMushroom': {
      const frozen = [], resisted = [];
      for (const other of extTargets(state, p.id)) {
        if (other.ext?.bankai) { resisted.push(other.name); continue; }
        other.ext.frozen = Math.max(other.ext.frozen || 0, 1);
        other.ext.iceLock = Math.max(other.ext.iceLock || 0, 3);
        frozen.push(other.name);
      }
      p.mythics = p.mythics.filter(x => x.id !== itemId);
      state.ext.lastEvent = { type: 'iceMushroom', playerId: p.id, frozen: frozen.slice(), at: Date.now() };
      log(state, `❄️ ${p.name} 使用寒冰蘑菇：${frozen.length} 位玩家被凍結 1 回合，且 3 回合內禁用技能與道具${resisted.length ? `；${resisted.join('、')} 的卍解免疫` : ''}。`);
      break;
    }
    case 'weakDomain': {
      if (p.ext.domainUsedRound === state.round) throw Error('弱者的領域本回合已經展開過。');
      state.ext.domain = { ownerId: p.id, round: state.round, tiles: [] };
      const tiles = extDomainTiles(state);
      p.ext.domainUsedRound = state.round;
      p.ext.forceOneNext = true;
      log(state, `🌐 ${p.name} 展開弱者的領域（目前第 ${tiles.join('、')} 格，會跟隨移動），進入者扣 100；代價是下回合只能走 1 步。`);
      break;
    }
    case 'totem':
    case 'indulgence':
    case 'starBlade':
    case 'bankai':
    case 'witchFactor':
      throw Error('這是被動道具，會自動觸發。');
    default:
      throw Error('此神話道具目前無法使用。');
  }
}

// ---------------------------------------------------------------------------
// 黑市拍賣 / 投資 / 查稅 / 內線交易
// ---------------------------------------------------------------------------
export function extAuctionCurrent(state) {
  const a = state.ext?.auction;
  if (!a || !a.currentId) return null;
  return state.players.find(p => p.id === a.currentId) || null;
}

function extAuctionAdvance(state, a) {
  for (let i = 0; i < a.order.length; i++) {
    a.index = (a.index + 1) % a.order.length;
    const id = a.order[a.index];
    if (a.active.includes(id)) { a.currentId = id; return id; }
  }
  a.currentId = null;
  return null;
}

export function extAuctionAction(state, action) {
  const a = state.ext?.auction;
  if (!a) throw Error('目前沒有拍賣。');
  const player = extAuctionCurrent(state);
  if (!player) return extAuctionFinish(state);
  if (action === 'bid') {
    a.highestBidder = player.id;
    a.highestBid = a.currentPrice;
    a.currentPrice += 250;
    log(state, `🛒 ${player.name} 出價 ${extMoney(a.highestBid)}。`);
    if (a.active.length === 1) return extAuctionFinish(state);
  } else {
    a.active = a.active.filter(id => id !== player.id);
    a.passed.push(player.id);
    // 踩到黑市的玩家放棄時，整場黑市事件立即結束，不再詢問後續玩家。
    if (player.id === a.initiatorId) {
      log(state, `🛒 ${player.name} 放棄競標，黑市拍賣直接結束。`);
      return extAuctionFinish(state);
    }
    log(state, `🛒 ${player.name} 放棄競標。`);
    if (!a.active.length) return extAuctionFinish(state);
    if (a.active.length === 1 && a.active[0] === a.highestBidder) return extAuctionFinish(state);
  }
  extAuctionAdvance(state, a);
  return { pending: true, player: extAuctionCurrent(state) };
}

export function extAuctionFinish(state) {
  const a = state.ext.auction;
  if (!a) return null;
  const winner = state.players.find(p => p.id === a.highestBidder);
  const meta = MYTHIC_BY_ID[a.itemId];
  let gained = false;
  if (winner && a.highestBid > 0) {
    const prev = state.ext.noInflation; state.ext.noInflation = true;
    addCash(state, winner, -a.highestBid);
    state.ext.noInflation = prev;
    if (winner.ext?.bankai) {
      log(state, `🛒 ${winner.name} 以 ${extMoney(a.highestBid)} 得標，但卍解禁止獲取新道具，「${meta?.name}」消散了。`);
    } else if (extHasItemSpace(winner)) {
      gained = Boolean(extAddMythic(state, winner, a.itemId, { silent: true }));
      if (gained) log(state, `🛒 拍賣成交！${winner.name} 以 ${extMoney(a.highestBid)} 標下「${meta?.icon} ${meta?.name}」。`);
    } else {
      state.ext.replaceOffer = { playerId: winner.id, itemId: a.itemId, itemKind: 'mythic', price: a.highestBid, source: 'auction' };
      log(state, `🛒 ${winner.name} 以 ${extMoney(a.highestBid)} 得標，但背包已滿，需選擇替換或丟棄新道具。`);
    }
  } else {
    log(state, `🛒 本場黑市流標，隱藏道具「${meta?.name}」沒有賣出。`);
  }
  state.ext.auction = null;
  extCheckWin(state);
  return { finished: true, winner: gained ? winner?.name : null, pendingReplace: Boolean(state.ext.replaceOffer), failedWinner: gained || state.ext.replaceOffer ? null : winner?.name || null, itemId: a.itemId, price: a.highestBid || 0 };
}

export function extResolveReplace(state, { dropNew = false, kind, index } = {}) {
  const offer = state.ext?.replaceOffer;
  if (!offer) throw Error('目前沒有待處理的新道具。');
  const player = state.players.find(p => p.id === offer.playerId);
  const offerKind = offer.itemKind === 'normal' ? 'normal' : 'mythic';
  const meta = offerKind === 'mythic' ? MYTHIC_BY_ID[offer.itemId] : itemById(offer.itemId);
  state.ext.replaceOffer = null;
  if (!player) return false;
  if (offerKind === 'mythic') {
    extPlayerExt(player);
    if (meta?.charges && extMythicEntry(player, offer.itemId)) {
      log(state, `🛒 ${player.name} 已持有「${meta?.name || offer.itemId}」，重複取得不增加使用次數。`);
      return false;
    }
  }
  if (dropNew) {
    log(state, `🛒 ${player.name} 丟棄剛獲得的「${meta?.name || offer.itemId}」。`);
    return false;
  }
  if (kind === 'mythic') {
    if (index < 0 || index >= (player.mythics || []).length) throw Error('要替換的神話道具不存在。');
    const removed = player.mythics.splice(index, 1)[0];
    if (removed.id === 'bankai' && player.ext) player.ext.bankai = false;
    log(state, `🗑️ ${player.name} 捨棄「${MYTHIC_BY_ID[removed.id]?.name || removed.id}」騰出欄位。`);
  } else if (kind === 'special') {
    if (index < 0 || index >= (player.specials || []).length) throw Error('要替換的特殊道具不存在。');
    const removed = player.specials.splice(index, 1)[0];
    log(state, `🗑️ ${player.name} 捨棄特殊道具「${SPECIAL_ITEM_BY_ID[removed]?.name || removed}」騰出欄位。`);
  } else {
    if (index < 0 || index >= player.items.length) throw Error('要替換的道具不存在。');
    const id = player.items.splice(index, 1)[0];
    log(state, `🗑️ ${player.name} 捨棄「${itemById(id)?.name || id}」騰出欄位。`);
  }
  let gained = false;
  if (offerKind === 'normal') {
    player.items.push(offer.itemId);
    player.ext.itemsAcquired = (player.ext.itemsAcquired || 0) + 1;
    extNoteItem(player, meta?.name || offer.itemId);
    gained = true;
    log(state, `🎒 ${player.name} 將「${meta?.name || offer.itemId}」放入道具欄。`);
  } else if (offer.source === 'debug') {
    player.mythics.push({ id: offer.itemId, charges: meta?.charges || 1 });
    if (offer.itemId === 'bankai') player.ext.bankai = true;
    player.ext.itemsAcquired = (player.ext.itemsAcquired || 0) + 1;
    extNoteItem(player, meta?.name || offer.itemId);
    gained = true;
    log(state, `🎒 ${player.name} 將神話道具「${meta?.name || offer.itemId}」放入道具欄。`);
  } else {
    gained = Boolean(extAddMythic(state, player, offer.itemId));
  }
  if (!gained) log(state, `🛒 ${player.name} 仍無法放入「${meta?.name}」。`);
  return gained;
}

export function extInvest(state, accept) {
  const offer = state.ext?.investOffer;
  if (!offer) throw Error('目前沒有投資機會。');
  const p = state.players.find(x => x.id === offer.playerId);
  state.ext.investOffer = null;
  if (!accept || !p) return false;
  if (offer.cost <= 0 || p.cash < offer.cost) throw Error('總資產不足，無法投資。');
  const prev = state.ext.noInflation; state.ext.noInflation = true;
  addCash(state, p, -offer.cost);
  state.ext.noInflation = prev;
  state.ext.certificates.push({ id: `cert-${state.round}-${p.id}-${state.ext.certificates.length}`, playerId: p.id, principal: offer.cost, round: state.round, resolved: false });
  p.ext.itemsAcquired = (p.ext.itemsAcquired || 0) + 0;
  log(state, `📈 ${p.name} 投入 ${extMoney(offer.cost)} 取得股票憑證，季末結算。`);
  return true;
}

export function extTaxPay(state) {
  const offer = state.ext?.taxChoice;
  if (!offer) throw Error('目前沒有查稅。');
  const p = state.players.find(x => x.id === offer.playerId);
  state.ext.taxChoice = null;
  if (!p) return 0;
  const amount = Math.floor(Math.max(0, p.cash) * 0.5);
  const paid = extDamage(state, p, amount, { ignoreShield: true, label: '查稅局 50% 總資產' });
  log(state, `🏛️ ${p.name} 選擇繳稅 ${extMoney(paid || amount)}${paid === 0 && amount > 0 ? '（由贖罪券全額抵銷）' : ''}。`);
  return paid;
}

export function extTaxDetain(state) {
  const offer = state.ext?.taxChoice;
  if (!offer) throw Error('目前沒有查稅。');
  const p = state.players.find(x => x.id === offer.playerId);
  state.ext.taxChoice = null;
  if (!p) return;
  p.skipTurns = (p.skipTurns || 0) + 2;
  log(state, `🏛️ ${p.name} 拒絕繳稅，被強制羈押 2 回合。`);
}

export function extInsiderPay(state) {
  const offer = state.ext?.insiderOffer;
  if (!offer) throw Error('目前沒有內線交易。');
  const p = state.players.find(x => x.id === offer.playerId);
  state.ext.insiderOffer = null;
  if (!p) return null;
  if (p.cash < 100) { log(state, `🌈 ${p.name} 總資產不足 100，無法啟動輪盤。`); return null; }
  const prev = state.ext.noInflation; state.ext.noInflation = true;
  addCash(state, p, -100);
  state.ext.noInflation = prev;
  const result = extPrepareWheel(state, p);
  // 用完後變回普通格，並在隨機普通格生成新的交易格
  const board = boardOf(state);
  const old = board.find(t => t.index === offer.tileIndex);
  if (old) {
    const types = NORMAL_TILE_TYPES;
    const type = types[Math.floor(nextRandom(state) * types.length)];
    const labels = { blue: '發財', red: '蕭條', yellow: '技能', green: '事件' };
    const icons = { blue: '💰', red: '📉', yellow: '⚡', green: '❓' };
    Object.assign(old, { type, label: labels[type], icon: icons[type], special: false, value: type === 'blue' ? 300 : type === 'red' ? 150 : type === 'yellow' ? 1 : 0, stay: `${labels[type]}格` });
  }
  const len = board.length;
  const specialAt = i => board.some(t => t.special && t.index === ((i % len) + len) % len);
  const candidates = board.filter(t => t.index !== 0 && t.index !== offer.tileIndex && !t.special
    && !specialAt(t.index - 1) && !specialAt(t.index + 1));
  const fallback = board.filter(t => t.index !== 0 && t.index !== offer.tileIndex && !t.special);
  const pool = candidates.length ? candidates : fallback;
  if (pool.length) {
    const target = pool[Math.floor(nextRandom(state) * pool.length)];
    Object.assign(target, { type: 'insider', special: true, label: '內線交易', icon: '🌈', value: 0, stay: SPECIAL_TILE_META.insider.desc });
    log(state, `🌈 新的內線交易格在第 ${target.index} 格生成。`);
  }
  extCheckWin(state);
  return result;
}

// 只抽結果、不立即生效；UI 轉盤停止後必須等待玩家按下確認，才呼叫 extResolveWheel。
export function extPrepareWheel(state, player) {
  const ext = state.ext;
  const pool = WHEEL_EFFECTS.filter(e => !e.mode || e.mode === ext.mode);
  const effect = pool[Math.floor(nextRandom(state) * pool.length)];
  const index = Math.max(0, WHEEL_EFFECTS.findIndex(e => e.id === effect.id));
  ext.wheelPending = { playerId: player.id, effect, index, at: Date.now() };
  ext.wheelResult = null;
  log(state, `🌈 ${player.name} 啟動命運輪盤，結果即將揭曉。`);
  return { pending: true, effect, index, playerId: player.id, at: ext.wheelPending.at };
}

export function extResolveWheel(state, payload = {}) {
  const ext = state.ext;
  const pending = ext?.wheelPending;
  if (!pending) return null;
  if (payload.at && Number(payload.at) !== Number(pending.at)) return null;
  const player = state.players.find(p => p.id === (payload.playerId || pending.playerId));
  ext.wheelPending = null;
  if (!player) return null;
  const effect = pending.effect;
  const text = extApplyWheel(state, player, effect);
  ext.wheelResult = { effect, text, playerId: player.id, at: Date.now() };
  log(state, `🌈 命運輪盤：${effect.icon} ${effect.name}｜${text}`);
  extCheckBankruptcy(state, player);
  extCheckWin(state);
  return { effect, text, playerId: player.id, at: ext.wheelResult.at };
}

export function extSpinWheel(state, player) {
  const prepared = extPrepareWheel(state, player);
  const resolved = extResolveWheel(state, { playerId: prepared.playerId, at: prepared.at });
  return { effect: resolved.effect, text: resolved.text };
}

export function extApplyWheel(state, player, effect) {
  const ext = state.ext;
  const others = extTargets(state, player.id);
  switch (effect.id) {
    case 'stealStar': {
      const holders = others.filter(p => p.stars > 0);
      if (!holders.length) return '場上沒有人持有星星，效果落空。';
      const target = holders[Math.floor(nextRandom(state) * holders.length)];
      target.stars -= 1; player.stars += 1;
      extSyncStarBlade(state, target, '星星被偷走');
      extSyncStarBlade(state, player);
      return `從 ${target.name} 偷走 1 顆星。`;
    }
    case 'earlyDoom':
      extTriggerDoom(state, true);
      return '毀滅日提前降臨！';
    case 'windfall':
      addCash(state, player, 5000);
      return '天降 5,000 總資產。';
    case 'halve': {
      const loss = Math.floor(Math.max(0, player.cash) / 2);
      const prev = ext.noInflation; ext.noInflation = true;
      addCash(state, player, -loss);
      ext.noInflation = prev;
      return `總資產腰斬，損失 ${extMoney(loss)}。`;
    }
    case 'supply': {
      let n = 0;
      for (let i = 0; i < 2; i++) if (drawItem(state, player)) n += 1;
      return `抽到 ${n} 個道具${n < 2 ? '（道具欄已滿）' : ''}。`;
    }
    case 'darkweb': {
      const pool = MYTHIC_ITEMS.filter(x => !x.hidden && (!x.mode || x.mode === ext.mode) && !extHasMythic(player, x.id));
      if (!pool.length) return '暗網沒有新的神話道具可賣。';
      const item = pool[Math.floor(nextRandom(state) * pool.length)];
      if (!extAddMythic(state, player, item.id)) return '道具欄已滿（3 格），暗網商品無法帶走。';
      return `取得隱藏神話道具「${item.name}」。`;
    }
    case 'overnight':
      addCash(state, player, 2000);
      return '一夜暴富，獲得 2,000 總資產。';
    case 'haunt': {
      if (!others.length) return '沒有其他玩家可纏身。';
      const target = others[Math.floor(nextRandom(state) * others.length)];
      const effects = [];
      engineHooks.ghostStrike(state, target, effects);
      return `罷工幽靈纏上 ${target.name}。`;
    }
    case 'discountStar': {
      if (player.cash < 500) return '總資產不足 500，特價星失效。';
      const prev = ext.noInflation; ext.noInflation = true;
      addCash(state, player, -500);
      ext.noInflation = prev;
      player.stars += 1;
      extSyncStarBlade(state, player);
      return '以 500 買下 1 顆特價星（非起始格交易，不會讓星價上漲）。';
    }
    case 'redistribute': {
      const richest = [...state.players].filter(p => !p.ext?.eliminated).sort((a, b) => b.cash - a.cash)[0];
      if (!richest || richest.id === player.id) return '自己就是第一名，效果無效。';
      const tmp = player.cash; player.cash = richest.cash; richest.cash = tmp;
      return `與首富 ${richest.name} 交換了總資產。`;
    }
    case 'robinHood': {
      const poorest = [...state.players].filter(p => !p.ext?.eliminated).sort((a, b) => a.cash - b.cash)[0];
      if (!poorest || poorest.id === player.id) return '自己就是最後一名，效果無效。';
      const tmp = player.cash; player.cash = poorest.cash; poorest.cash = tmp;
      return `與最後一名 ${poorest.name} 交換了總資產。`;
    }
    case 'sucker': {
      if (player.stars <= 0) return '自己沒有星星，無法送出。';
      const candidates = state.players.filter(p => p.id !== player.id && !p.ext?.eliminated);
      if (!candidates.length) return '沒有其他玩家。';
      const lowest = Math.min(...candidates.map(p => p.stars));
      const target = candidates.filter(p => p.stars === lowest)[0];
      player.stars -= 1; target.stars += 1;
      extSyncStarBlade(state, player, '把星星送走');
      extSyncStarBlade(state, target);
      return `含淚送給 ${target.name} 1 顆星。`;
    }
    default: return effect.desc;
  }
}

// ---------------------------------------------------------------------------
// 毀滅日
// ---------------------------------------------------------------------------
export function extTriggerDoom(state, early = false) {
  const ext = state.ext;
  if (!ext || ext.mode !== 'evil') return;
  const fee = ext.doomPrice;
  // 依實際回合／擲骰順序逐一結算；不再依總資產高低重排。
  const order = [...state.players].filter(p => !p.ext?.eliminated);
  const executed = [], paid = [], resisted = [];
  const executedIds = [], paidIds = [], resistedIds = [];
  const sequence = [];
  for (const p of order) {
    if (p.cash >= fee) {
      const prev = ext.noInflation; ext.noInflation = true;
      addCash(state, p, -fee);
      ext.noInflation = prev;
      paid.push(p.name);
      paidIds.push(p.id);
      sequence.push({ playerId: p.id, name: p.name, outcome: 'paid', amount: fee });
    } else if (extHasMythic(p, 'totem')) {
      p.mythics = p.mythics.filter(x => x.id !== 'totem');
      resisted.push(p.name);
      resistedIds.push(p.id);
      state.ext.totemEvent = { playerId: p.id, at: Date.now() };
      sequence.push({ playerId: p.id, name: p.name, outcome: 'resisted', amount: 0 });
      log(state, `🗿 ${p.name} 的不死圖騰擋下雷射處決！`);
    } else {
      p.ext.eliminated = true;
      p.ext.ghostRole = true;
      p.ext.aliveSeasons = p.ext.aliveSeasons || 0;
      p.ext.oneStepLock = false;
      p.ext.forceOneNext = false;
      if (ext.domain?.ownerId === p.id) ext.domain = null;
      p.stars = 0;
      p.cash = 0;
      p.items = [];
      p.mythics = [];
      p.specials = [];
      executed.push(p.name);
      executedIds.push(p.id);
      sequence.push({ playerId: p.id, name: p.name, outcome: 'executed', amount: fee });
      log(state, `💀 ${p.name} 付不出 ${extMoney(fee)} 保護費，被杜芬舒斯大樓雷射消滅，化為藍色罷工幽靈。`);
    }
  }
  ext.doomPrice += Math.max(100, Number(ext.doomStep) || DOOM_STEP);
  ext.doomCount += 1;
  ext.doomEvent = { fee, paid, executed, resisted, paidIds, executedIds, resistedIds, sequence, early, at: Date.now() };
  ext.lastEvent = { type: 'doom', ...ext.doomEvent };
  log(state, `💀 毀滅日結束：${paid.length} 人付款、${resisted.length} 人抵抗、${executed.length} 人被處決。下次保護費 ${extMoney(ext.doomPrice)}。`);
  extCheckWin(state);
}

// ---------------------------------------------------------------------------
// 除錯工具
// ---------------------------------------------------------------------------
export function extDebugGive(state, kind, id) {
  if (!state.ext?.debug) throw Error('只有測試模式可以使用。');
  const p = currentOf(state);
  const isMythic = kind === 'mythic';
  const meta = isMythic ? MYTHIC_BY_ID[id] : itemById(id);
  if (!meta) throw Error(isMythic ? '神話道具不存在。' : '道具不存在。');
  extPlayerExt(p);
  const existing = isMythic ? extMythicEntry(p, id) : null;
  if (existing && meta.charges) {
    log(state, `🧪 測試模式：${p.name} 已持有「${meta.name}」，不補充使用次數。`);
    return { gained: true, itemId: id, itemKind: kind };
  }
  if (!extHasItemSpace(p)) {
    state.ext.replaceOffer = { playerId: p.id, itemId: id, itemKind: kind, price: 0, source: 'debug' };
    log(state, `🧪 測試模式：${p.name} 的道具欄已滿，需選擇替換或丟棄「${meta.name}」。`);
    return { pendingReplace: true, itemId: id, itemKind: kind };
  }
  if (isMythic) {
    p.mythics.push({ id, charges: meta.charges || 1 });
    if (id === 'bankai') p.ext.bankai = true;
  } else {
    p.items.push(id);
  }
  p.ext.itemsAcquired = (p.ext.itemsAcquired || 0) + 1;
  extNoteItem(p, meta.name);
  log(state, `🧪 測試模式：${p.name} 取得${isMythic ? '神話' : ''}道具「${meta.icon} ${meta.name}」。`);
  return { gained: true, itemId: id, itemKind: kind };
}
export function extDebugTeleport(state, playerId, tileIndex) {
  if (!state.ext?.debug) throw Error('只有測試模式可以使用。');
  const p = state.players.find(x => x.id === playerId);
  const len = boardOf(state).length;
  if (!p || !Number.isInteger(tileIndex) || tileIndex < 0 || tileIndex >= len) throw Error('傳送目標無效。');
  p.position = tileIndex;
  applyCornerProgress(state,p,[tileIndex]);
  log(state, `🧪 測試模式：${p.name} 被傳送到第 ${tileIndex} 格。`);
  if (tileIndex === state.ghostPosition) {
    const effects = [];
    engineHooks.ghostStrike(state, p, effects);
    state.lastRoll = { playerId: p.id, value: 0, from: tileIndex, path: [tileIndex], tileIndex, tileType: 'ghost', struck: true, effects };
    state.phase = 'resolve';
    log(state, `🧪 ${p.name} 被丟到幽靈身上，觸發罷工。`);
    extCheckWin(state);
  }
}
export function extDebugGhostTo(state, tileIndex) {
  if (!state.ext?.debug) throw Error('只有測試模式可以使用。');
  if (!Number.isInteger(tileIndex) || tileIndex < 0 || tileIndex >= boardOf(state).length) throw Error('幽靈目標無效。');
  state.ghostPosition = tileIndex;
  state.ghostTrail = [];
  log(state, `🧪 測試模式：幽靈被移動到第 ${tileIndex} 格。`);
}
export function extDebugRollAgain(state) {
  if (!state.ext?.debug) throw Error('只有測試模式可以使用。');
  state.phase = 'roll';
  state.pendingDecision = null;
  log(state, '🧪 測試模式：解除回合限制，可以再擲一次。');
}

// 測試模式：不論目前卡在擲骰、決策或特殊格，都能強制結束目前回合。
export function extDebugEndTurn(state) {
  if (!state.ext?.debug) throw Error('只有測試模式可以使用。');
  if (!state || state.status !== 'playing') throw Error('遊戲已結束。');
  if (state.phase === 'moving') throw Error('棋子移動中，請稍候再結束回合。');
  const ext = state.ext;
  state.pendingDecision = null;
  state.pendingLanding = null;
  state.lastRoll = null;
  ext.starOffer = null;
  ext.replaceOffer = null;
  ext.forcedStarOffer = null;
  ext.eventPrompt = null;
  ext.auction = null;
  ext.investOffer = null;
  ext.taxChoice = null;
  ext.insiderOffer = null;
  ext.wheelPending = null;
  ext.wheelResult = null;
  state.phase = 'resolve';
  log(state, '🧪 測試模式：強制結束目前玩家的回合。');
  return endTurn(state);
}

// ---------------------------------------------------------------------------
// 歷史與結算
// ---------------------------------------------------------------------------
export function extRecordRound(state, round, { initial = false, final = false } = {}) {
  if (!state.ext) return;
  if (!Array.isArray(state.ext.history)) state.ext.history = [];
  if (!initial && state.ext.history.some(h => h.round === round && !h.initial)) {
    const existing = state.ext.history.find(h => h.round === round && !h.initial);
    existing.players = state.players.map(p => ({
      id: p.id, name: p.name, cash: p.cash, stars: p.stars,
      alive: !p.ext?.eliminated, items: p.ext?.itemsAcquired || 0,
      aliveSeasons: p.ext?.aliveSeasons || 0, roleId: p.roleId
    }));
    return;
  }
  state.ext.history.push({
    round, initial, final,
    players: state.players.map(p => ({
      id: p.id, name: p.name, cash: p.cash, stars: p.stars,
      alive: !p.ext?.eliminated, items: p.ext?.itemsAcquired || 0,
      aliveSeasons: p.ext?.aliveSeasons || 0, roleId: p.roleId
    }))
  });
}

export function extSettlementData(state) {
  const history = [...(state.ext?.history || [])].sort((a, b) => a.round - b.round);
  // 對局可能在季中結束（毀滅日、達標、連線中斷），補上目前狀態作為最後一個紀錄點，
  // 讓結算圖表與生還名單反映真正的終局，而不是上一個季末快照。
  const snapshot = {
    round: state.round, initial: false, final: state.status !== 'playing',
    players: state.players.map(p => ({
      id: p.id, name: p.name, cash: p.cash, stars: p.stars,
      alive: !p.ext?.eliminated, items: p.ext?.itemsAcquired || 0,
      aliveSeasons: p.ext?.aliveSeasons || 0, roleId: p.roleId
    }))
  };
  const signature = row => row?.players?.map(p => `${p.id}:${p.cash}:${p.stars}:${p.alive ? 1 : 0}:${p.items}:${p.aliveSeasons}`).join('|');
  const last = history.at(-1);
  if (!last || signature(last) !== signature(snapshot) || (snapshot.final && !last.final)) history.push(snapshot);
  const rounds = history.map(h => h.round);
  const players = state.players.map(p => ({ id: p.id, name: p.name, color: p.color, roleId: p.roleId, icon: extRoleOf(p).icon }));
  const metric = key => players.map(p => ({
    ...p,
    values: history.map(h => {
      const row = h.players.find(x => x.id === p.id);
      return row ? Number(row[key]) || 0 : 0;
    })
  }));
  const itemTotals = players.map(p => {
    const live = state.players.find(x => x.id === p.id);
    const gets = live?.ext?.itemGets && typeof live.ext.itemGets === 'object' ? live.ext.itemGets : {};
    const details = Object.entries(gets).map(([name, count]) => ({ name, count: Number(count) || 0 })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hant'));
    const row = [...history].reverse().map(h => h.players.find(x => x.id === p.id)).find(Boolean);
    return { ...p, total: details.reduce((s, d) => s + d.count, 0) || row?.items || 0, details };
  });
  const survival = players.map(p => {
    const last = [...history].reverse().map(h => h.players.find(x => x.id === p.id)).find(Boolean);
    return { ...p, seasons: last?.aliveSeasons || 0, alive: last?.alive ?? true };
  });
  const allEliminated = state.players.length > 0 && state.players.every(p => p.ext?.eliminated);
  return {
    rounds, players,
    cash: metric('cash'), stars: metric('stars'),
    survival, itemTotals,
    allEliminated,
    winners: state.players.filter(p => state.winnerIds.includes(p.id)),
    title: state.ext?.finishTitle || extMode(state).name,
    subtitle: state.ext?.mode === 'evil' && allEliminated ? '無人生還' : '',
    reason: state.resultReason,
    mode: extMode(state)
  };
}

export function extReturnToLobbyState(state) {
  if (!state?.ext) return;
  state.ext.confirmed = [];
}

// 初始化時註冊所有掛鉤（檔尾確保已定義）
engineHooks.extraStatusChips = extStatusChips;
