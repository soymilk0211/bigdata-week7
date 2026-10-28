import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame, boardOf, rollDie, resolveLanding, chooseDecision, startTurn, endTurn, addCash, useItem} from './engine.js';
import {
  extInitGame, extEnsureState, extAddMythic, extAddItem, extHasItemSpace, extItemCount,
  extUseMythic, extUseSkill, extCanBuyStar, extBuyStar, extSkipStarOffer, extApplyWheel,
  extTriggerDoom, extResolveReplace, extSettlementData, extCheckBankruptcy, extCheckWin,
  extDomainTiles, extDebugEndTurn, extDebugGive, extAuctionFinish, extPrepareWheel, extResolveWheel,
  extResolveVectorPending
} from './party_engine.js';
import {DOOM_EVERY, DOOM_START, DOOM_STEP, TYCOON_TARGET, MYTHIC_BY_ID, QUICK_DECISION_FALLBACK, WHEEL_EFFECTS} from './party_data.js';

const make = (mode = 'star', seed = 42, extra = {}) => {
  const state = createGame({
    players: [{name: '甲', roleId: 'auto'}, {name: '乙', roleId: 'technology'}],
    seed,
    maxRounds: 10
  });
  extInitGame(state, {mode, debug: true, ...extra});
  return state;
};
const avoidGhost = state => { state.ghostPosition = 20; state.ghostTrail = []; };

test('隨機模式鎖定三種模式的季數、星數、目標與保護費', () => {
  const expectations = {
    star: {rounds: 10, target: 0, seed: 3},
    tycoon: {rounds: 24, target: TYCOON_TARGET, seed: 4},
    evil: {rounds: 20, target: 0, seed: 5}
  };
  for (const [mode, expected] of Object.entries(expectations)) {
    const state = make('random', expected.seed, {rounds: 3, starGoal: 9, doomEvery: 1, doomPrice: 100, target: 2000});
    assert.equal(state.ext.requestedMode, 'random');
    assert.equal(state.ext.mode, mode);
    assert.equal(state.maxRounds, expected.rounds);
    assert.equal(state.ext.target, expected.target);
    assert.equal(state.starGoal, 3);
    assert.equal(state.ext.doomEvery, DOOM_EVERY);
    assert.equal(state.ext.doomPrice, DOOM_START);
    assert.equal(state.ext.doomStep, DOOM_STEP);
  }
});

test('舊經典派對存檔自動遷移為企業之星', () => {
  const state = make('star');
  state.ext.mode = 'classic';
  state.ext.requestedMode = 'classic';
  extEnsureState(state);
  assert.equal(state.ext.mode, 'star');
  assert.equal(state.ext.requestedMode, 'star');
});

test('真理之門只能煉成普通道具，且餘額、空間不足時拒絕', () => {
  const state = make('star');
  const p = state.players[0];
  p.items = [];
  p.mythics = [{id: 'truthGate', charges: 2}];
  p.cash = 2000;
  extUseMythic(state, 'truthGate', {mode: 'buy', itemId: 'shield', mythic: false});
  assert.deepEqual(p.items, ['shield']);
  assert.equal(p.cash, 1000);
  assert.equal(p.mythics.find(x => x.id === 'truthGate').charges, 1);

  assert.throws(
    () => extUseMythic(state, 'truthGate', {mode: 'buy', itemId: 'bankai', mythic: true}),
    /只能煉成普通道具/
  );
  p.cash = 500;
  assert.throws(
    () => extUseMythic(state, 'truthGate', {mode: 'buy', itemId: 'leverage', mythic: false}),
    /1,000 總資產/
  );

  p.cash = 5000;
  p.items = ['shield', 'leverage', 'swap'];
  assert.throws(
    () => extUseMythic(state, 'truthGate', {mode: 'buy', itemId: 'shield', mythic: false}),
    /3 格/
  );

  p.items = ['shield'];
  extUseMythic(state, 'truthGate', {mode: 'sell', kind: 'normal', index: 0});
  assert.deepEqual(p.items, []);
  assert.equal(p.cash, 6000);
});

test('普通與神話道具共用 3 格上限', () => {
  const state = make('star');
  const p = state.players[0];
  p.items = ['shield', 'leverage'];
  p.mythics = [{id: 'witchFactor', charges: 1}];
  assert.equal(extItemCount(p), 3);
  assert.equal(extHasItemSpace(p), false);
  assert.equal(extAddItem(state, p, 'swap'), false);
  assert.equal(extAddMythic(state, p, 'truthGate'), null);
});

test('弱者的領域只在進入時扣款並記錄 domainHit 事件', () => {
  const state = make('star');
  const [owner, victim] = state.players;
  const board = boardOf(state);
  const red = board.findIndex((tile, index) => index > 1 && tile.type === 'red');
  assert.ok(red > 0);
  owner.position = red;
  extAddMythic(state, owner, 'weakDomain');
  extUseMythic(state, 'weakDomain');
  assert.deepEqual(state.ext.domain.tiles, [
    (red - 1 + board.length) % board.length, red, (red + 1) % board.length
  ]);
  assert.equal(owner.ext.forceOneNext, true);

  // 領域會即時跟隨擁有者，而不是固定啟動當下的三格。
  const nextRed = board.findIndex((tile, index) => index > red && tile.type === 'red');
  assert.ok(nextRed > red);
  owner.position = nextRed;
  assert.deepEqual(extDomainTiles(state), [
    (owner.position - 1 + board.length) % board.length, owner.position, (owner.position + 1) % board.length
  ]);

  state.turnIndex = 1;
  state.phase = 'roll';
  victim.position = (owner.position - 1 + board.length) % board.length;
  avoidGhost(state);
  const before = victim.cash;
  rollDie(state, 1);
  assert.equal(victim.position, owner.position);
  assert.equal(state.ext.lastEvent.type, 'domainHit');
  assert.equal(state.ext.lastEvent.amount, 100);
  assert.equal(victim.cash, before - 100 - 150);
  assert.ok(state.log.some(line => /弱者的領域/.test(line)));

  // 擁有者下一次回合開始時領域才收束，且該回合被鎖定只能走 1 步。
  state.phase = 'resolve';
  endTurn(state);
  assert.equal(state.ext.domain, null);
  assert.equal(owner.ext.oneStepLock, true);
  assert.equal(owner.forcedSteps, 'one');
  owner.items = ['dice123', 'swap'];
  assert.throws(() => useItem(state, 'dice123'), /弱者領域|只能走 1 步/);
  assert.throws(() => useItem(state, 'swap', victim.id), /弱者領域|只能走 1 步/);
  avoidGhost(state);
  const from = owner.position;
  const limited = rollDie(state, 5);
  assert.equal(limited.value, 1);
  assert.equal(owner.position, (from + 1) % board.length);
  assert.equal(owner.ext.oneStepLock, false);
});

test('魔女因子在踩中幽靈後回溯到本次擲骰前，且每次擲骰都覆蓋快照', () => {
  const state = make('star');
  const p = state.players[0];
  extAddMythic(state, p, 'witchFactor');
  state.phase = 'roll';
  startTurn(state);
  assert.equal(state.ext.turnSnapshot, null);
  p.cash = 777;
  p.position = 0;
  p.items = ['shield'];
  state.ghostPosition = 1;
  state.ghostTrail = [];
  rollDie(state, 1);
  assert.equal(state.ext.lastEvent.type, 'witch');
  assert.equal(state.ext.turnSnapshot.playerId, p.id);
  assert.equal(p.cash, 777);
  assert.equal(p.position, 0);
  assert.deepEqual(p.items, ['shield']);
  assert.ok(state.log.some(line => /死亡回歸/.test(line)));

  // 第二次擲骰前必須覆蓋成新的快照，而不是保留回合初或上一動的狀態。
  state.phase = 'roll';
  state.pendingDecision = null;
  p.cash = 888;
  p.position = 5;
  avoidGhost(state);
  rollDie(state, 1);
  assert.equal(state.ext.turnSnapshot.playerId, p.id);
  assert.equal(state.ext.turnSnapshot.players.find(x => x.id === p.id).cash, 888);
});

test('毀滅日精準分出付款、抵抗與處決名單，並累積保護費', () => {
  const state = make('evil', 42, {doomEvery: 5, doomPrice: 1000});
  const [poor, rich] = state.players;
  poor.cash = 500;
  rich.cash = 1500;
  extTriggerDoom(state);
  assert.equal(state.ext.doomEvent.fee, 1000);
  assert.deepEqual(state.ext.doomEvent.executedIds, [poor.id]);
  assert.deepEqual(state.ext.doomEvent.paidIds, [rich.id]);
  assert.deepEqual(state.ext.doomEvent.resistedIds, []);
  assert.equal(rich.cash, 500);
  assert.equal(poor.ext.eliminated, true);
  assert.equal(state.ext.doomPrice, 1000 + DOOM_STEP);
  assert.equal(state.ext.doomStep, DOOM_STEP);
  assert.equal(state.status, 'finished');
  assert.equal(state.resultReason, 'survivor');

  const totem = make('evil', 43, {doomEvery: 5, doomPrice: 1000});
  const [protectedPlayer, payer] = totem.players;
  protectedPlayer.cash = 0;
  payer.cash = 2000;
  extAddMythic(totem, protectedPlayer, 'totem');
  extTriggerDoom(totem);
  assert.deepEqual(totem.ext.doomEvent.resistedIds, [protectedPlayer.id]);
  assert.deepEqual(totem.ext.doomEvent.executedIds, []);
  assert.equal(protectedPlayer.ext.eliminated, false);
  assert.ok(!protectedPlayer.mythics.some(x => x.id === 'totem'));
});

test('保護費抬升價預設 500，並可依房主設定調漲', () => {
  const defaultState = make('evil', 42, {doomEvery: 5, doomPrice: 1000});
  assert.equal(defaultState.ext.doomStep, 500);
  defaultState.players.forEach(p => { p.cash = 5000; });
  extTriggerDoom(defaultState);
  assert.equal(defaultState.ext.doomPrice, 1500);

  const custom = make('evil', 42, {doomEvery: 5, doomPrice: 1000, doomStep: 250});
  assert.equal(custom.ext.doomStep, 250);
  custom.players.forEach(p => { p.cash = 5000; });
  extTriggerDoom(custom);
  assert.equal(custom.ext.doomPrice, 1250);
});

test('邪惡企業全員淘汰時結算副標題為無人生還', () => {
  const state = make('evil');
  state.players.forEach(p => { p.ext.eliminated = true; p.ext.ghostRole = true; });
  state.status = 'finished';
  state.phase = 'finished';
  state.resultReason = 'doom';
  state.winnerIds = [];
  const data = extSettlementData(state);
  assert.equal(data.allEliminated, true);
  assert.equal(data.subtitle, '無人生還');
  assert.equal(data.mode.id, 'evil');
});

test('企業之星經過或停在起點都會建立買星邀請', () => {
  const state = make('star');
  const p = state.players[0];
  p.position = 23;
  p.cash = 5000;
  avoidGhost(state);
  state.phase = 'roll';
  rollDie(state, 1);
  assert.equal(p.position, 0);
  assert.equal(state.ext.starOffer.playerId, p.id);
  assert.equal(state.ext.starOffer.passed, true);
  assert.equal(state.ext.starOffer.landed, true);
  chooseDecision(state, 'squeeze');
  assert.equal(extCanBuyStar(state).ok, true);
  assert.equal(extCanBuyStar(state).offer, true);
  extSkipStarOffer(state);
  assert.equal(state.ext.starOffer, null);

  const passing = make('star');
  const runner = passing.players[0];
  runner.position = 23;
  runner.cash = 5000;
  avoidGhost(passing);
  passing.phase = 'roll';
  rollDie(passing, 2);
  assert.equal(runner.position, 1);
  assert.equal(passing.ext.starOffer.passed, true);
  assert.equal(passing.ext.starOffer.landed, false);
});

test('斬魄刀持星進化卍解，失去星星時退化', () => {
  const state = make('star');
  const [holder, rival] = state.players;
  holder.position = 0;
  holder.cash = 2000;
  extAddMythic(state, holder, 'starBlade');
  state.phase = 'roll';
  assert.throws(() => extBuyStar(state), /出發格/);
  state.ext.starOffer = { playerId: holder.id, price: 500, passed: true, landed: true };
  extBuyStar(state);
  assert.equal(holder.stars, 1);
  assert.equal(holder.mythics.find(x => x.id === 'bankai')?.id, 'bankai');
  assert.equal(holder.ext.bankai, true);

  extApplyWheel(state, rival, {id: 'stealStar'});
  assert.equal(holder.stars, 0);
  assert.equal(holder.ext.bankai, false);
  assert.ok(holder.mythics.some(x => x.id === 'starBlade'));
});

test('黑市滿包可替換既有道具或丟棄新道具', () => {
  const state = make('star');
  const p = state.players[0];
  p.items = ['shield', 'leverage'];
  p.mythics = [{id: 'witchFactor', charges: 1}];
  state.ext.replaceOffer = {playerId: p.id, itemId: 'truthGate', price: 1000};
  assert.equal(extResolveReplace(state, {kind: 'normal', index: 0}), true);
  assert.equal(state.ext.replaceOffer, null);
  assert.deepEqual(p.items, ['leverage']);
  assert.ok(p.mythics.some(x => x.id === 'truthGate'));

  p.items = ['shield', 'leverage'];
  p.mythics = [{id: 'witchFactor', charges: 1}];
  state.ext.replaceOffer = {playerId: p.id, itemId: 'truthGate', price: 1000};
  assert.equal(extResolveReplace(state, {dropNew: true}), false);
  assert.equal(state.ext.replaceOffer, null);
  assert.deepEqual(p.items, ['shield', 'leverage']);
  assert.deepEqual(p.mythics.map(x => x.id), ['witchFactor']);
});

test('快速決策 C 在總資產不足時仍可選擇，並允許扣成負值', () => {
  const state = make('star');
  const p = state.players[0];
  state.phase = 'roll';
  avoidGhost(state);
  p.position = 4;
  p.cash = 10;
  rollDie(state, 1);
  p.cash = -200;
  const fallback = state.pendingDecision.options.find(o => o.id === QUICK_DECISION_FALLBACK.id);
  assert.ok(fallback);
  assert.equal(fallback.available, true);
  assert.equal(fallback.allowDebt, true);
  chooseDecision(state, QUICK_DECISION_FALLBACK.id);
  assert.equal(p.cash, -300);
});

test('快速決策 C 扣到破產門檻時會正常淘汰並結束對局', () => {
  const state = make('star');
  const p = state.players[0];
  state.phase = 'roll';
  avoidGhost(state);
  p.position = 4;
  p.cash = 10;
  rollDie(state, 1);
  p.cash = -950;
  chooseDecision(state, QUICK_DECISION_FALLBACK.id);
  assert.equal(p.cash, 0);
  assert.equal(p.ext.eliminated, true);
  assert.equal(state.status, 'finished');
  assert.equal(state.phase, 'finished');
  assert.deepEqual(state.winnerIds, [state.players[1].id]);
});

test('神話道具與魔女因子文案符合新版規則', () => {
  assert.equal(MYTHIC_BY_ID.indulgence.name, '贖罪券');
  assert.match(MYTHIC_BY_ID.truthGate.desc, /可使用3次/);
  assert.doesNotMatch(MYTHIC_BY_ID.truthGate.desc, /3 次充能/);
  assert.doesNotMatch(MYTHIC_BY_ID.iceMushroom.desc, /使用後道具消失/);
  assert.match(MYTHIC_BY_ID.witchFactor.desc, /本次擲骰前/);
});

test('企業之星開局原地不能買星，必須先有經過或停在起點的邀請', () => {
  const state = make('star');
  state.phase = 'roll';
  assert.equal(state.ext.starOffer, null);
  assert.equal(extCanBuyStar(state).ok, false);
  assert.throws(() => extBuyStar(state), /出發格/);
});

test('測試模式可隨時強制結束目前回合', () => {
  const state = make('star');
  state.phase = 'decision';
  state.pendingDecision = { playerId: state.players[0].id, options: [] };
  state.ext.starOffer = { playerId: state.players[0].id, price: 500 };
  extDebugEndTurn(state);
  assert.equal(state.turnIndex, 1);
  assert.equal(state.pendingDecision, null);
  assert.equal(state.ext.starOffer, null);
  assert.equal(state.phase, 'roll');
});

test('所有模式只剩一位存活者時立即宣布該玩家獲勝；全員幽靈則無人獲勝', () => {
  for (const mode of ['star', 'tycoon', 'evil']) {
    const state = make(mode);
    const [winner, doomed] = state.players;
    doomed.cash = -1000;
    extCheckBankruptcy(state, doomed);
    assert.equal(state.status, 'finished', mode);
    assert.equal(state.resultReason, 'survivor', mode);
    assert.deepEqual(state.winnerIds, [winner.id], mode);
    assert.equal(state.ext.finishTitle, '唯一的倖存者', mode);
  }

  const empty = make('star');
  empty.players.forEach(p => { p.ext.eliminated = true; p.ext.ghostRole = true; });
  extCheckWin(empty);
  assert.equal(empty.status, 'finished');
  assert.equal(empty.resultReason, 'bankrupt');
  assert.deepEqual(empty.winnerIds, []);
});

test('罷工幽靈可擲骰移動但不能使用技能，與存活玩家同格會強制觸發罷工', () => {
  const state = createGame({
    players: [{name: '甲', roleId: 'auto'}, {name: '乙', roleId: 'technology'}, {name: '丙', roleId: 'retail'}],
    seed: 42,
    maxRounds: 10
  });
  extInitGame(state, {mode: 'star', debug: true});
  const ghost = state.players[2];
  ghost.cash = -1000;
  extCheckBankruptcy(state, ghost);
  assert.equal(state.status, 'playing');

  state.turnIndex = 2;
  state.phase = 'roll';
  startTurn(state);
  assert.equal(state.phase, 'roll');
  assert.equal(ghost.ext.eliminated, true);
  assert.throws(() => extUseSkill(state), /幽靈/);

  const victim = state.players[0];
  victim.cash = 1000;
  ghost.position = 10;
  victim.position = 11;
  avoidGhost(state);
  const roll = rollDie(state, 1);
  assert.equal(ghost.position, 11);
  assert.ok(roll.effects.some(e => /強制觸發罷工/.test(e.text)));
  assert.equal(victim.cash, 0);
  assert.ok(state.log.some(line => /幽靈纏上/.test(line)));
});

test('黑市得標後背包已滿會建立替換／丟棄詢問', () => {
  const state = make('star');
  const [winner, rival] = state.players;
  winner.items = ['shield', 'leverage'];
  winner.mythics = [{id: 'witchFactor', charges: 1}];
  winner.cash = 2000;
  state.ext.auction = {
    tileIndex: 1, itemId: 'truthGate', basePrice: 1000, currentPrice: 1000,
    highestBidder: winner.id, highestBid: 1000, order: [winner.id, rival.id],
    index: 0, currentId: winner.id, active: [winner.id], passed: []
  };
  const result = extAuctionFinish(state);
  assert.equal(result.pendingReplace, true);
  assert.equal(state.ext.auction, null);
  assert.equal(winner.cash, 1000);
  assert.equal(state.ext.replaceOffer.playerId, winner.id);
  assert.equal(state.ext.replaceOffer.itemId, 'truthGate');
  assert.equal(state.ext.replaceOffer.itemKind, 'mythic');
});

test('命運輪盤抽出結果後，確認前不會套用效果', () => {
  const state = make('star');
  const p = state.players[0];
  const before = p.cash;
  const prepared = extPrepareWheel(state, p);
  assert.equal(p.cash, before);
  assert.ok(state.ext.wheelPending);
  const resolved = extResolveWheel(state, {playerId: prepared.playerId, at: prepared.at});
  assert.equal(state.ext.wheelPending, null);
  assert.ok(resolved);
  assert.ok(state.ext.wheelResult);
});

test('內線輪盤確認前不扣款，確認當下才消耗贖罪券並觸發特效', () => {
  const state = make('star');
  const p = state.players[0];
  extAddMythic(state, p, 'indulgence');
  p.cash = 1000;
  const effect = WHEEL_EFFECTS.find(x => x.id === 'halve');
  const at = 1234567890;
  state.ext.wheelPending = {playerId: p.id, effect, index: WHEEL_EFFECTS.indexOf(effect), at};
  state.ext.wheelResult = null;
  state.ext.indulgenceEvent = null;
  const ticket = () => p.mythics.find(x => x.id === 'indulgence');

  assert.equal(p.cash, 1000);
  assert.equal(ticket().charges, 5);
  assert.equal(state.ext.indulgenceEvent, null);

  const resolved = extResolveWheel(state, {playerId: p.id, at});
  assert.ok(resolved);
  assert.equal(p.cash, 1000);
  assert.equal(ticket().charges, 4);
  assert.equal(state.ext.indulgenceEvent.amount, 500);
  assert.equal(state.ext.indulgenceEvent.remaining, 4);
  assert.equal(state.ext.wheelPending, null);
});

test('贖罪券全域抵銷任何扣款，耗盡後自動移除', () => {
  const state = make('star');
  const p = state.players[0];
  extAddMythic(state, p, 'indulgence');
  assert.equal(MYTHIC_BY_ID.indulgence.name, '贖罪券');
  assert.match(MYTHIC_BY_ID.indulgence.desc, /5 次/);
  const ticket = () => p.mythics.find(x => x.id === 'indulgence');
  assert.equal(ticket().charges, 5);
  const cash = p.cash;
  addCash(state, p, -100);
  assert.equal(p.cash, cash);
  assert.equal(ticket().charges, 4);
  assert.equal(state.ext.indulgenceEvent.remaining, 4);

  ticket().charges = 1;
  addCash(state, p, -200);
  assert.equal(p.cash, cash);
  assert.equal(ticket(), undefined);
  addCash(state, p, -50);
  assert.equal(p.cash, cash - 50);
});

test('贖罪券與真理之門固定初始次數，重複取得、回合輪轉與狀態正規化不補次', () => {
  const state = make('star');
  const p = state.players[0];
  extAddMythic(state, p, 'indulgence');
  extAddMythic(state, p, 'truthGate');
  const ticket = () => p.mythics.find(x => x.id === 'indulgence');
  const gate = () => p.mythics.find(x => x.id === 'truthGate');
  assert.equal(ticket().charges, 5);
  assert.equal(gate().charges, 3);

  extAddMythic(state, p, 'indulgence');
  extAddMythic(state, p, 'truthGate');
  assert.equal(ticket().charges, 5);
  assert.equal(gate().charges, 3);
  assert.equal(p.mythics.filter(x => x.id === 'indulgence').length, 1);
  assert.equal(p.mythics.filter(x => x.id === 'truthGate').length, 1);

  ticket().charges = 2;
  gate().charges = 1;
  startTurn(state);
  extEnsureState(state);
  assert.equal(ticket().charges, 2);
  assert.equal(gate().charges, 1);

  p.mythics.push({id: 'truthGate', charges: 3});
  extEnsureState(state);
  assert.equal(p.mythics.filter(x => x.id === 'truthGate').length, 1);
  assert.equal(gate().charges, 1);

  p.mythics = [{id: 'indulgence', charges: 4}, {id: 'indulgence', charges: 5}, {id: 'truthGate', charges: 6}];
  extEnsureState(state);
  assert.deepEqual(p.mythics.map(entry => [entry.id, entry.charges]), [['indulgence', 4], ['truthGate', 3]]);
});

test('除錯模式重複取得贖罪券或真理之門不補充次數', () => {
  const state = make('star');
  state.ext.debug = true;
  const p = state.players[0];
  extAddMythic(state, p, 'indulgence');
  extAddMythic(state, p, 'truthGate');
  p.mythics.find(entry => entry.id === 'indulgence').charges = 3;
  p.mythics.find(entry => entry.id === 'truthGate').charges = 2;
  extDebugGive(state, 'mythic', 'indulgence');
  extDebugGive(state, 'mythic', 'truthGate');
  assert.equal(p.mythics.find(entry => entry.id === 'indulgence').charges, 3);
  assert.equal(p.mythics.find(entry => entry.id === 'truthGate').charges, 2);
});

test('寒冰蘑菇覆蓋層使用 0.5 秒淡出，而不是瞬間消失', async () => {
  const {readFileSync} = await import('node:fs');
  const css = readFileSync(new URL('./party-ext.css', import.meta.url), 'utf8');
  assert.match(css, /animation:\s*ice-flash \.5s/);
  assert.match(css, /@keyframes ice-flash[\s\S]*?to \{ opacity: 0; \}/);
});

test('模式切換後不相關的設定欄位會實際隱藏', async () => {
  const {readFileSync} = await import('node:fs');
  const css = readFileSync(new URL('./party-ext.css', import.meta.url), 'utf8');
  assert.match(css, /\.ext-target\.hidden\s*\{\s*display:\s*none !important;/);
  assert.match(css, /\.lobby-row > label\[data-lobby-field\]\.hidden\s*\{\s*display:\s*none !important;/);
});

test('結算道具明細依玩家與道具名稱彙總獲得次數', () => {
  const state = make('star');
  state.players[0].ext.itemGets = {'護盾': 2, '換位合約': 1};
  state.status = 'finished';
  state.phase = 'finished';
  state.resultReason = 'rounds';
  state.winnerIds = [state.players[0].id];
  const data = extSettlementData(state);
  const detail = data.itemTotals.find(x => x.id === state.players[0].id);
  assert.equal(detail.total, 3);
  assert.deepEqual(detail.details, [
    {name: '護盾', count: 2},
    {name: '換位合約', count: 1}
  ]);
  assert.equal(data.mode.id, 'star');
  assert.equal(data.subtitle, '');
});

test('企業之星達標只提示，季末才正式結算', () => {
  const state = make('star');
  const p = state.players[0];
  p.stars = 2;
  p.cash = 1000;
  state.phase = 'roll';
  state.ext.starOffer = {playerId: p.id, price: 1000, passed: true, landed: true};
  extBuyStar(state);
  assert.equal(p.stars, 3);
  assert.equal(state.status, 'playing');
  assert.equal(state.ext.pendingVictory.reason, 'stars');
  assert.match(state.ext.lastEvent.text, /已達標，本季將進行結算/);

  state.turnIndex = state.players.length - 1;
  state.phase = 'resolve';
  const result = endTurn(state);
  assert.equal(result.finished, true);
  assert.equal(state.status, 'finished');
  assert.equal(state.resultReason, 'stars');
  assert.deepEqual(state.winnerIds, [p.id]);
  assert.equal(state.ext.pendingVictory, null);
});

test('首富達標同樣延後到季末結算', () => {
  const state = make('tycoon');
  const p = state.players[0];
  const target = state.ext.target;
  p.cash = target;
  extCheckWin(state);
  assert.equal(state.status, 'playing');
  assert.equal(state.ext.pendingVictory.reason, 'target');
  assert.match(state.ext.lastEvent.text, /已達標，本季將進行結算/);

  state.turnIndex = state.players.length - 1;
  state.phase = 'resolve';
  endTurn(state);
  assert.equal(state.status, 'finished');
  assert.equal(state.resultReason, 'target');
  assert.deepEqual(state.winnerIds, [p.id]);
});

test('毀滅日依玩家順序產生逐一結算序列', () => {
  const state = createGame({
    players: [{name: '甲', roleId: 'auto'}, {name: '乙', roleId: 'technology'}, {name: '丙', roleId: 'retail'}],
    seed: 42,
    maxRounds: 10
  });
  extInitGame(state, {mode: 'evil', debug: true, doomEvery: 5, doomPrice: 1000});
  const [first, second, third] = state.players;
  first.cash = 0;
  second.cash = 2000;
  third.cash = 0;
  extTriggerDoom(state);
  assert.deepEqual(state.ext.doomEvent.sequence.map(x => x.playerId), [first.id, second.id, third.id]);
  assert.deepEqual(state.ext.doomEvent.sequence.map(x => x.outcome), ['executed', 'paid', 'executed']);
  assert.equal(state.resultReason, 'survivor');
  assert.deepEqual(state.winnerIds, [second.id]);
});

test('幽靈效果會記錄 ghostStrike 事件並帶上憤怒狀態', () => {
  const state = createGame({
    players: [{name: '甲', roleId: 'auto'}, {name: '乙', roleId: 'technology'}, {name: '丙', roleId: 'retail'}],
    seed: 42,
    maxRounds: 10
  });
  extInitGame(state, {mode: 'star', debug: true});
  const ghost = state.players[2];
  ghost.cash = -1000;
  extCheckBankruptcy(state, ghost);
  const victim = state.players[0];
  victim.cash = 5000;
  ghost.position = 10;
  victim.position = 11;
  avoidGhost(state);
  state.ext.enraged = true;
  state.turnIndex = 2;
  state.phase = 'roll';
  startTurn(state);
  rollDie(state, 1);
  assert.equal(state.ext.lastEvent.type, 'ghostStrike');
  assert.equal(state.ext.lastEvent.playerId, victim.id);
  assert.equal(state.ext.lastEvent.enraged, true);
});

test('矢量操作會把出發、沿途與終點上的玩家傳送到指定格並觸發效果', () => {
  const state = createGame({
    players: [{name: '甲', roleId: 'auto'}, {name: '乙', roleId: 'technology'}, {name: '丙', roleId: 'retail'}],
    seed: 42,
    maxRounds: 10
  });
  extInitGame(state, {mode: 'star', debug: true});
  const [owner, first, second] = state.players;
  const board = boardOf(state);
  const safeTypes = new Set(['blue', 'red', 'yellow', 'start']);
  let start = -1;
  for (let i = 1; i < board.length - 2; i++) {
    if (safeTypes.has(board[i].type) && safeTypes.has(board[i + 1].type) && safeTypes.has(board[i + 2].type)) {
      start = i;
      break;
    }
  }
  assert.ok(start > 0);
  const target = board.findIndex(tile => tile.type === 'red');
  assert.ok(target > 0);
  owner.position = start;
  first.position = start;
  second.position = start + 1;
  // 避免指定格與幽靈格重疊，讓傷害來源單純是紅色蕭條格。
  const ghost = board.findIndex((tile, i) => i !== target && i !== start && i !== start + 1 && i !== start + 2);
  state.ghostPosition = ghost;
  state.ghostTrail = [];
  state.phase = 'roll';
  extAddMythic(state, owner, 'vector');
  extUseMythic(state, 'vector', {tileIndex: target});
  const beforeFirst = first.cash;
  const beforeSecond = second.cash;
  rollDie(state, 2);
  assert.equal(owner.position, (start + 2) % board.length);
  assert.equal(first.position, target);
  assert.equal(second.position, target);
  assert.equal(state.ext.vector, null);
  assert.equal(state.ext.vectorEvent.destination, target);
  assert.deepEqual(state.ext.vectorEvent.hits.map(x => x.playerId), [first.id, second.id]);
  assert.equal(beforeFirst - first.cash, board[target].value || 150);
  assert.equal(beforeSecond - second.cash, board[target].value || 150);
});

test('矢量操作互動流程先鎖定受害者，再延後傳送與格子效果', () => {
  const state = createGame({
    players: [{name: '甲', roleId: 'auto'}, {name: '乙', roleId: 'technology'}, {name: '丙', roleId: 'bank'}],
    seed: 42,
    maxRounds: 10
  });
  extInitGame(state, {mode: 'star', debug: true});
  const [owner, first, second] = state.players;
  const board = boardOf(state);
  const safeTypes = new Set(['blue', 'red', 'yellow', 'start']);
  let start = -1;
  for (let i = 1; i < board.length - 2; i++) {
    if (safeTypes.has(board[i].type) && safeTypes.has(board[i + 1].type) && safeTypes.has(board[i + 2].type)) {
      start = i;
      break;
    }
  }
  assert.ok(start > 0);
  const target = board.findIndex(tile => tile.type === 'red');
  assert.ok(target > 0);
  owner.position = start;
  first.position = start;
  second.position = start + 1;
  state.ghostPosition = board.findIndex((tile, i) => i !== target && i !== start && i !== start + 1 && i !== start + 2);
  state.ghostTrail = [];
  state.phase = 'roll';
  extAddMythic(state, owner, 'vector');
  extUseMythic(state, 'vector', {tileIndex: target});
  const beforeFirst = first.cash;
  const beforeSecond = second.cash;

  rollDie(state, 2, {defer: true});
  assert.equal(first.position, start);
  assert.equal(second.position, start + 1);
  resolveLanding(state, {deferVector: true});
  assert.equal(first.position, start);
  assert.equal(second.position, start + 1);
  assert.equal(first.cash, beforeFirst);
  assert.equal(second.cash, beforeSecond);
  assert.ok(state.ext.vectorPending);
  assert.equal(state.ext.vectorPending.destination, target);
  assert.equal(state.ext.vectorEvent, null);

  const event = extResolveVectorPending(state);
  assert.equal(state.ext.vectorPending, null);
  assert.equal(first.position, target);
  assert.equal(second.position, target);
  assert.deepEqual(event.hits.map(x => x.playerId), [first.id, second.id]);
  assert.equal(beforeFirst - first.cash, board[target].value || 150);
  assert.equal(beforeSecond - second.cash, board[target].value || 150);
  assert.equal(extResolveVectorPending(state), null);
});

test('幽靈干擾動畫、鎖銬音效與測試模式幽靈點選已接線', async () => {
  const {readFileSync} = await import('node:fs');
  const ui = readFileSync(new URL('./ui_party.js', import.meta.url), 'utf8');
  const appSource = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
  const audio = readFileSync(new URL('./audio_system.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./party-ext.css', import.meta.url), 'utf8');
  assert.match(audio, /king-boos-laugh\.mp3/);
  assert.match(audio, /ghostLaugh\(\)/);
  assert.match(audio, /ghostLaugh\(\)\s*\{[\s\S]*?gain:\s*\.45/);
  assert.match(audio, /swing\(\)\s*\{[\s\S]*?gain:\s*\.45/);
  assert.match(audio, /cuff\(\)/);
  assert.match(ui, /ghostStrike/);
  assert.match(ui, /flashGhostInterference/);
  assert.match(ui, /sound\(action === 'pay' \? 'coin' : 'cuff'\)/);
  assert.match(ui, /VECTOR_LOCK_MS = 520/);
  assert.match(ui, /vector-locked/);
  assert.match(ui, /extResolveVectorPending/);
  assert.match(appSource, /resolveLanding\(state,\{deferVector:true\}\)/);
  assert.match(appSource, /vectorPending\)\{notify\('矢量操作鎖定中/);
  assert.match(css, /animation:\s*ghost-interference/);
  assert.match(css, /animation:\s*doom-laser-fire \.3s/);
  assert.match(css, /\.token\.vector-locked/);
  assert.match(css, /animation:\s*vector-lock-ring/);
  assert.match(css, /body\.debug-mode \.ghost-piece\s*\{[\s\S]*?pointer-events:\s*auto/);
});

test('結束回合時沒確認的命運輪盤直接套用、沒回應的特殊格邀請視為放棄，不會卡住下一位玩家', () => {
  const state = make('star', 7, {debug: false});
  avoidGhost(state);
  const [p1, p2] = state.players;
  state.phase = 'resolve';
  const prepared = extPrepareWheel(state, p1);
  state.ext.insiderOffer = {playerId: p1.id, tileIndex: 3};
  state.ext.investOffer = {playerId: p1.id, tileIndex: 5, cost: 0};
  state.ext.eventPrompt = {playerId: p1.id, eventId: 'test', at: 1};
  endTurn(state);
  assert.equal(state.ext.wheelPending, null);
  assert.equal(state.ext.wheelResult?.effect?.id, prepared.effect.id);
  assert.equal(state.ext.wheelResult?.playerId, p1.id);
  assert.equal(state.ext.insiderOffer, null);
  assert.equal(state.ext.investOffer, null);
  assert.equal(state.ext.eventPrompt, null);
  assert.equal(state.players[state.turnIndex].id, p2.id);
});

test('結束回合只清掉自己的邀請，別人的輪盤和事件提示不受影響', () => {
  const state = make('star', 8, {debug: false});
  avoidGhost(state);
  const [p1, p2] = state.players;
  state.phase = 'resolve';
  extPrepareWheel(state, p2);
  state.ext.eventPrompt = {playerId: p2.id, eventId: 'test', at: 1};
  endTurn(state);
  assert.equal(state.ext.wheelPending?.playerId, p2.id);
  assert.equal(state.ext.eventPrompt?.playerId, p2.id);
  assert.equal(state.players[state.turnIndex].id, p2.id);
  assert.notEqual(p1.id, p2.id);
});
