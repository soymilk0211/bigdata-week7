// ============================================================================
// 派對擴充 UI（動態掛載，不破壞原始 index.html 結構）
// ============================================================================
import { roomInviteLink, roomCodeFromLink } from './net.js';

export const PartyUI = (() => {
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => Math.round(Number(n) || 0).toLocaleString('zh-TW');
  const colors = ['#0f9688', '#5979b0', '#ce9460', '#aa6b91', '#c55d5d', '#7e9541', '#348da5', '#7a60ad'];
  const app = () => window.PartyApp;
  const state = () => app()?.state || null;
  const sound = n => { try { window.SoundManager?.play(n); } catch { } };
  const shorten = (name, max = 6) => String(name || '').length > max ? `${String(name).slice(0, max)}...` : String(name || '');
  const esc = h;

  function localPlayerId() {
    const net = window.PartyNet;
    return net?.active ? net.myPlayerId : null;
  }
  function isLocalOwner(p, playerId) {
    if (!p?.net || !window.PartyNet?.active) return true;
    return Boolean(playerId) && localPlayerId() === playerId;
  }
  function specialOwnerId(p) {
    const ext = p?.ext;
    if (!ext) return null;
    if (ext.auction) return ext.auction.currentId || null;
    if (ext.replaceOffer) return ext.replaceOffer.playerId || null;
    if (ext.starOffer) return ext.starOffer.playerId || null;
    if (ext.investOffer) return ext.investOffer.playerId || null;
    if (ext.taxChoice) return ext.taxChoice.playerId || null;
    if (ext.insiderOffer) return ext.insiderOffer.playerId || null;
    if (ext.eventPrompt) return ext.eventPrompt.playerId || null;
    return null;
  }
  function hasSpecialOffer(p) {
    return Boolean(p?.ext?.auction || p?.ext?.replaceOffer || p?.ext?.starOffer || p?.ext?.investOffer || p?.ext?.taxChoice || p?.ext?.insiderOffer || p?.ext?.eventPrompt);
  }
  function canUseLocalAction(p) {
    if (!p?.net || !window.PartyNet?.active) return true;
    if (!window.PartyNet.canAct(p)) return false;
    if (hasSpecialOffer(p)) return isLocalOwner(p, specialOwnerId(p));
    return true;
  }
  function playerName(p, id) {
    return p?.players?.find(x => x.id === id)?.name || '';
  }
  // 房間 QR Code：qrcode-generator 由 index.html 從 unpkg 載入；沒載到時大廳只顯示代碼。
  let qrCache = { text: '', svg: '' };
  function qrSvg(text) {
    if (!text || typeof globalThis.qrcode !== 'function') return '';
    if (qrCache.text === text) return qrCache.svg;
    try {
      const qr = globalThis.qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      qrCache = { text, svg: qr.createSvgTag({ cellSize: 4, margin: 16, scalable: true }) };
      return qrCache.svg;
    } catch { return ''; }
  }

  let modal = null;
  let tilePick = null;
  let debugSelected = null;
  let lastEventKey = '';
  let lastCornerSubsidyKey = '';
  let lastInvestmentSettlementKey = '';
  let investmentSoundTimers = [];
  let lastFinalRound = null;
  let lastFinishKey = '';
  let lastWheelKey = '';
  let lastIndulgenceKey = '';
  let lastVectorKey = '';
  let lastVectorPendingKey = '';
  let vectorLockUntil = 0;
  let vectorLockTimer = null;
  let lastVictoryKey = '';
  let ghostStrikeTimer = null;
  let doomTimers = [];
  let victoryTimer = null;
  let lastBankaiKey = '';
  let lastIceKey = '';
  let lastBankruptKey = '';
  let lastTotemKey = '';
  let wheelTimers = [];
  let openingTimer = [];
  let finishTimer = null;
  let endingTimer = null;
  let replaceDropConfirm = false;
  let settlementLockUntil = 0;
  let eventPromptKey = '';
  let decisionGateKey = '';
  let decisionGateUntil = 0;
  let decisionTimer = null;
  let wheelResolving = false;
  let wheelOpen = false;

  // -------------------------------------------------------------------------
  // 基礎掛載
  // -------------------------------------------------------------------------
  function ensureRoot() {
    let root = $('#party-ext-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'party-ext-root';
      document.body.appendChild(root);
    }
    if (!$('#opening-overlay')) {
      root.insertAdjacentHTML('beforeend', `
        <div id="opening-overlay" class="ext-overlay opening-overlay" hidden></div>
        <div id="event-flash" class="event-flash" hidden></div>
        <div id="ice-overlay" class="fx-layer ice-overlay" hidden></div>
        <div id="bankai-overlay" class="fx-layer bankai-overlay" hidden><div class="bankai-smoke"></div><strong class="bankai-title">卍解</strong></div>
        <div id="totem-overlay" class="fx-layer totem-overlay" hidden><span class="totem-icon">🗿</span></div>
        <div id="indulgence-overlay" class="fx-layer indulgence-overlay" hidden><div class="indulgence-banner">已使用贖罪券抵禦罪惡</div></div>
        <div id="ghost-strike-overlay" class="fx-layer ghost-strike-overlay" hidden><div class="ghost-strike-ghost" aria-hidden="true">👻</div><div class="ghost-strike-copy"><strong>幽靈干擾</strong><small>罷工幽靈正在干擾企業經營</small></div></div>
        <div id="doom-sequence" class="doom-sequence" hidden><div class="doom-sequence-title" role="status"></div><div class="doom-sequence-sub"></div></div>
        <div id="victory-pending-banner" class="victory-pending-banner" hidden></div>
        <div id="wheel-overlay" class="ext-overlay wheel-overlay" hidden></div>
        <div id="ext-modal" class="ext-overlay ext-modal" hidden>
          <div class="ext-modal-backdrop"></div>
          <div class="ext-modal-card" role="dialog" aria-modal="true">
            <button class="ext-modal-close" type="button" aria-label="關閉">×</button>
            <p class="ext-kicker"></p>
            <div class="ext-icon">✦</div>
            <h2 class="ext-title"></h2>
            <p class="ext-text"></p>
            <div class="ext-body"></div>
            <div class="ext-actions"></div>
          </div>
        </div>
        <div id="party-lobby" class="ext-overlay lobby-overlay" hidden></div>
        <div id="party-connect" class="ext-overlay connect-overlay" hidden></div>
        <div id="settlement-overlay" class="ext-overlay settlement-overlay" hidden></div>
        <div id="witch-overlay" class="witch-overlay" hidden><span class="witch-mark">🦠</span><div><strong>魔女因子 · 死亡回歸</strong><small>世界倒轉，全場狀態回溯至本次擲骰前</small></div></div>
        <div id="ending-overlay" class="ending-overlay" hidden></div>
      `);
    }
  }

  // -------------------------------------------------------------------------
  // 模式 / 測試 / 多人入口
  // -------------------------------------------------------------------------
  function setupFieldVisibility(box, mode, reset = false) {
    const { GAME_MODES } = window.__partyData || {};
    const meta = GAME_MODES?.[mode] || {};
    const fields = mode === 'star' ? ['rounds', 'starGoal']
      : mode === 'tycoon' ? ['rounds', 'target']
        : mode === 'evil' ? ['rounds', 'doomEvery', 'doomPrice', 'doomStep']
          : [];
    box.querySelectorAll('[data-setup-field]').forEach(label => {
      const key = label.dataset.setupField;
      const visible = fields.includes(key);
      label.classList.toggle('hidden', !visible);
      const input = label.querySelector('input');
      if (input) input.disabled = mode === 'random' || !visible;
    });
    const note = $('#setup-lock-note');
    if (note) note.hidden = mode !== 'random';
    if (!reset) return;
    const set = (id, value) => { const el = $(id); if (el) el.value = value; };
    set('#rounds-input', meta.defaultRounds || 10);
    set('#star-goal-input', meta.starGoal || 3);
    set('#target-input', meta.defaultTarget || 8000);
    set('#doom-every-input', 5);
    set('#doom-price-input', 1000);
    set('#doom-step-input', 500);
  }
  function renderSetupExtras() {
    const card = $('.setup-card');
    if (!card) return;
    let box = $('#ext-setup');
    if (!box) {
      box = document.createElement('div');
      box.id = 'ext-setup';
      box.className = 'ext-setup';
      const anchor = card.querySelector('.setup-options');
      if (anchor) anchor.insertAdjacentElement('afterend', box);
      else card.appendChild(box);
    }
    const { GAME_MODES } = window.__partyData || {};
    const mode = state()?.ext?.mode || $('#mode-select')?.value || 'star';
    const meta = GAME_MODES?.[mode] || { name: '企業之星', icon: '🌟', desc: '', defaultRounds: 10, defaultTarget: 0 };
    box.innerHTML = `
      <div class="ext-setup-head"><span>🎮 對局模式</span><small>建立對局時可選擇，隨機模式會抽出三種之一</small></div>
      <div class="mode-picker" id="mode-select-wrap">
        ${['star', 'tycoon', 'evil', 'random'].map(id => {
          const m = GAME_MODES?.[id];
          if (!m) return '';
          return `<button type="button" class="mode-card ${id === mode ? 'active' : ''}" data-mode-id="${id}"><span>${m.icon}</span><strong>${h(m.name)}</strong><small>${h(m.desc)}</small></button>`;
        }).join('')}
      </div>
      <input type="hidden" id="mode-select" value="${h(mode)}">
      <div id="mode-desc" class="mode-desc">${h(meta.desc)}</div>
      <div class="ext-option-row">
        <label class="ext-target" data-setup-field="rounds">最多季數<input id="rounds-input" type="number" min="3" max="30" value="${meta.defaultRounds || 10}"></label>
        <label class="ext-target" data-setup-field="starGoal">勝利星數<input id="star-goal-input" type="number" min="1" max="10" value="${meta.starGoal || 3}"></label>
        <label class="ext-target" data-setup-field="target">總資產目標<input id="target-input" type="number" min="2000" step="500" value="${meta.defaultTarget || 8000}"></label>
        <label class="ext-target" data-setup-field="doomEvery">保護費間隔（季）<input id="doom-every-input" type="number" min="1" max="30" value="5"></label>
        <label class="ext-target" data-setup-field="doomPrice">初始保護費<input id="doom-price-input" type="number" min="100" step="100" value="1000"></label>
        <label class="ext-target" data-setup-field="doomStep">保護費抬升價<input id="doom-step-input" type="number" min="100" step="100" value="500"></label>
        <span id="setup-lock-note" class="ext-lock-note" hidden>🎲 隨機模式鎖定數值：企業之星 10 季／3 星；首富競爭 24 季／8,000；邪惡企業 20 季／首期 1,000／抬升 500。</span>
        <label class="ext-check"><input id="debug-mode" type="checkbox"> 🧪 開啟測試（單機沙盒）</label>
      </div>
      <div class="multi-entry">
        <div><strong>🌐 多人房間</strong><small>WebRTC 房間代碼大廳，支援 2–8 人</small></div>
        <div class="multi-buttons"><button type="button" id="create-room-btn" class="secondary">建立房間</button><button type="button" id="join-room-btn" class="quiet">輸入代碼加入</button></div>
      </div>
      <p id="room-brief" class="room-brief"></p>
    `;
    setupFieldVisibility(box, mode, true);
    box.querySelectorAll('[data-mode-id]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.dataset.modeId;
      const m = GAME_MODES[id];
      $('#mode-select').value = id;
      box.querySelectorAll('[data-mode-id]').forEach(b => b.classList.toggle('active', b.dataset.modeId === id));
      $('#mode-desc').textContent = m.desc;
      setupFieldVisibility(box, id, true);
      sound('click');
    }));
    $('#create-room-btn').onclick = () => openConnect('create');
    $('#join-room-btn').onclick = () => openConnect('join');
    if (window.PartyNet?.active && window.PartyNet.lobby) {
      $('#room-brief').textContent = `目前房間：${window.PartyNet.code} · ${window.PartyNet.lobby.players.length} 人`;
    }
  }

  function openConnect(kind, presetCode = '', presetName = '') {
    const el = $('#party-connect');
    if (!el) return;
    const roles = window.__partyData?.LOBBY_ROLES || [];
    const selfName = presetName || document.querySelector('[data-setup-name="0"]')?.value || '玩家 1';
    const joinCopy = presetCode ? '已帶入房間代碼，輸入你的名稱後按「加入房間」。' : '向房主取得 6 碼房間代碼，加入後在大廳選擇企業。';
    el.innerHTML = `
      <div class="ext-modal-backdrop"></div>
      <div class="connect-card">
        <button class="ext-modal-close" data-connect-close type="button">×</button>
        <p class="ext-kicker">${kind === 'create' ? 'CREATE ROOM' : 'JOIN ROOM'}</p>
        <h2>${kind === 'create' ? '建立連線房間' : presetCode ? '加入房間' : '輸入房間代碼'}</h2>
        <p>${kind === 'create' ? '產生 6 碼房間代碼，邀請 2–8 位玩家加入同一個大廳。' : joinCopy}</p>
        <label>你的名稱<input id="connect-name" maxlength="16" value="${h(selfName)}"></label>
        ${kind === 'create' ? `<label>你的企業<select id="connect-role">${roles.map(r => `<option value="${r.id}">${r.icon} ${h(r.name)}</option>`).join('')}</select></label>` : `<label>房間代碼<input id="connect-code" maxlength="128" placeholder="輸入 Peer ID" value="${h(presetCode)}"></label>`}
        <p class="connect-status" id="connect-status"></p>
        <div class="connect-actions">
          <button class="secondary" data-connect-close type="button">取消</button>
          <button class="primary" id="connect-go" type="button">${kind === 'create' ? '建立房間 →' : '加入房間 →'}</button>
        </div>
      </div>
    `;
    el.hidden = false;
    el.dataset.kind = kind;
    el.querySelectorAll('[data-connect-close]').forEach(b => b.onclick = () => { el.hidden = true; });
    $('#connect-go').onclick = () => {
      const name = $('#connect-name').value.trim() || '玩家';
      try {
        if (kind === 'create') {
          window.PartyNet.createRoom({ name, roleId: $('#connect-role').value || 'random' });
        } else {
          const code = $('#connect-code').value.trim();
          if (!code) throw Error('請輸入房間代碼。');
          window.PartyNet.joinRoom(code, name);
        }
        el.hidden = true;
        if (window.PartyNet.lobby) showLobby(window.PartyNet.lobby);
      } catch (e) { $('#connect-status').textContent = e.message; sound('error'); }
    };
  }

  // -------------------------------------------------------------------------
  // 大廳
  // -------------------------------------------------------------------------
  function showLobby(lobby) {
    ensureRoot();
    const el = $('#party-lobby');
    if (!el) return;
    if (!lobby) { clearTurnLock(); el.hidden = true; return; }
    if (lobby.status === 'playing' && state()?.status === 'playing') { el.hidden = true; return; }
    clearTurnLock();
    const net = window.PartyNet;
    const isHost = net?.isHost;
    const modes = window.__partyData?.GAME_MODES || {};
    const roles = window.__partyData?.LOBBY_ROLES || [];
    const activeMode = lobby.mode || 'star';
    const meta = modes[activeMode] || modes.star || {};
    const allowed = activeMode === 'star' ? ['rounds', 'starGoal']
      : activeMode === 'tycoon' ? ['rounds', 'target']
        : activeMode === 'evil' ? ['rounds', 'doomEvery', 'doomPrice', 'doomStep']
          : [];
    const field = (key, id, label, value, extra = '') => {
      const visible = allowed.includes(key);
      return `<label data-lobby-field="${key}" class="${visible ? '' : 'hidden'}">${label}<input id="${id}" type="number" ${extra} value="${value}" ${isHost && visible ? '' : 'disabled'}></label>`;
    };
    const online = lobby.players.filter(p => p.host || p.connected !== false);
    const offline = lobby.players.filter(p => !p.host && p.connected === false).map(p => `「${h(p.name)}」`).join('、');
    const hostStatus = online.length < 2 ? '等待至少 1 位玩家加入…'
      : offline ? `可以開始；${offline}已離線，開始時不會加入對局。` : '全員到齊，可以開始！';
    const invite = roomInviteLink(location.href, lobby.code);
    const qr = qrSvg(invite);
    const qrBlock = qr
      ? `<div class="lobby-qr"><div class="lobby-qr-code" id="lobby-qr" role="img" aria-label="加入房間的 QR Code">${qr}</div><small>其他人用手機相機掃描，會打開遊戲並自動帶入房間代碼。</small></div>`
      : lobby.code && !invite ? '<p class="lobby-qr-note">用線上網址開啟遊戲才會顯示 QR Code（本機網址別的裝置打不開）。</p>' : '';
    el.innerHTML = `
      <div class="ext-modal-backdrop"></div>
      <div class="lobby-card">
        <div class="lobby-top">
          <div><p class="ext-kicker">MULTIPLAYER LOBBY · WebRTC</p><h2>派對大廳</h2><p class="lobby-code-line">房間代碼 <strong id="lobby-code">${h(lobby.code)}</strong><button class="quiet" id="copy-code" type="button">複製</button></p>${qrBlock}</div>
          <button class="ext-modal-close" id="lobby-leave" type="button" title="離開">×</button>
        </div>
        <div class="lobby-grid">
          <div class="lobby-players">
            <div class="lobby-section-head"><span>玩家 ${lobby.players.length}/8</span><small>${net?.connectedPeers?.size || 1} 條連線</small></div>
            ${lobby.players.map((p, i) => {
              const isMe = p.peerId === net?.peerId;
              const role = roles.find(r => r.id === p.roleId) || roles[0];
              return `<div class="lobby-player ${p.host ? 'host' : ''} ${isMe ? 'me' : ''} ${p.connected === false ? 'offline' : ''}">
                <span class="lobby-avatar">${role?.icon || '🎲'}</span>
                <div class="lobby-player-main"><strong>${h(p.name)}${p.host ? ' 👑' : ''}${isMe ? '（你）' : ''}</strong><small>${h(role?.name || '未定新創集團')}${p.connected === false ? ' · 已離線' : ' · 已連線'}</small></div>
                ${(isMe || isHost) ? `<select data-lobby-role="${i}" class="lobby-role-select" ${isMe || isHost ? '' : 'disabled'}>${roles.map(r => `<option value="${r.id}" ${r.id === p.roleId ? 'selected' : ''}>${r.icon} ${h(r.name)}</option>`).join('')}</select>` : `<span class="lobby-role">${h(role?.name || '')}</span>`}
              </div>`;
            }).join('')}
          </div>
          <div class="lobby-settings">
            <div class="lobby-section-head"><span>對局設定</span><small>${isHost ? '房主可調整' : '由房主設定'}</small></div>
            <label>模式
              <select id="lobby-mode" ${isHost ? '' : 'disabled'}>${['star', 'tycoon', 'evil', 'random'].map(id => `<option value="${id}" ${lobby.mode === id ? 'selected' : ''}>${modes[id]?.icon || ''} ${h(modes[id]?.name || id)}</option>`).join('')}</select>
            </label>
            <div class="lobby-mode-desc" id="lobby-mode-desc">${h(meta.desc || '')}</div>
            <div class="lobby-row">
              ${field('rounds', 'lobby-rounds', '最多季數', lobby.rounds || meta.defaultRounds || 10, 'min="3" max="30"')}
              ${field('starGoal', 'lobby-star-goal', '勝利星數', lobby.starGoal || meta.starGoal || 3, 'min="1" max="10"')}
              ${field('target', 'lobby-target', '總資產目標', lobby.target || meta.defaultTarget || 8000, 'min="2000" step="500"')}
              ${field('doomEvery', 'lobby-doom-every', '保護費間隔（季）', lobby.doomEvery || 5, 'min="1" max="30"')}
              ${field('doomPrice', 'lobby-doom-price', '初始保護費', lobby.doomPrice || 1000, 'min="100" step="100"')}
              ${field('doomStep', 'lobby-doom-step', '保護費抬升價', lobby.doomStep ?? 500, 'min="100" step="100"')}
            </div>
            <p class="lobby-lock-note" ${activeMode === 'random' ? '' : 'hidden'}>🎲 隨機模式鎖定數值：企業之星 10 季／3 星；首富競爭 24 季／8,000；邪惡企業 20 季／首期 1,000／抬升 500。</p>
            <label class="ext-check"><input id="lobby-debug" type="checkbox" ${lobby.debug ? 'checked' : ''} ${isHost ? '' : 'disabled'}> 🧪 開啟測試</label>
            <div class="lobby-hint">Tips：每人只能操作自己的回合；所有狀態（道具、星數、護盾、通膨）都會同步。</div>
          </div>
        </div>
        <div class="lobby-footer">
          <span id="lobby-status">${isHost ? hostStatus : '等待房主開始對局…'}</span>
          ${isHost ? `<button class="primary" id="lobby-start" type="button" ${online.length < 2 ? 'disabled' : ''}>開始對局 →</button>` : `<span class="waiting-dot">等待房主</span>`}
        </div>
      </div>
    `;
    el.hidden = false;
    $('#copy-code').onclick = async () => {
      try { await navigator.clipboard.writeText(lobby.code); $('#copy-code').textContent = '已複製'; setTimeout(() => { const b = $('#copy-code'); if (b) b.textContent = '複製'; }, 1500); } catch { }
    };
    $('#lobby-leave').onclick = () => { window.PartyNet.leave(); el.hidden = true; renderSetupExtras(); };
    $('#lobby-mode').onchange = e => {
      const id = e.target.value;
      window.PartyNet.setMode(id);
      const m = modes[id];
      if (!m) return;
      $('#lobby-mode-desc').textContent = m.desc;
      // 切換模式時同步該模式的固定預設值（隨機模式由引擎鎖定）。
      window.PartyNet.setRounds(m.defaultRounds || 10);
      if (id === 'star') window.PartyNet.setStarGoal(m.starGoal || 3);
      if (id === 'tycoon') window.PartyNet.setTarget(m.defaultTarget || 8000);
      if (id === 'evil') { window.PartyNet.setDoomEvery(5); window.PartyNet.setDoomPrice(1000); window.PartyNet.setDoomStep(500); }
    };
    const bind = (id, fn) => { const node = $(id); if (node) node.onchange = e => fn(e.target.value); };
    bind('#lobby-rounds', v => window.PartyNet.setRounds(v));
    bind('#lobby-star-goal', v => window.PartyNet.setStarGoal(v));
    bind('#lobby-target', v => window.PartyNet.setTarget(v));
    bind('#lobby-doom-every', v => window.PartyNet.setDoomEvery(v));
    bind('#lobby-doom-price', v => window.PartyNet.setDoomPrice(v));
    bind('#lobby-doom-step', v => window.PartyNet.setDoomStep(v));
    $('#lobby-debug').onchange = e => window.PartyNet.setDebug(e.target.checked);
    $$('[data-lobby-role]').forEach(sel => sel.onchange = e => {
      const idx = Number(sel.dataset.lobbyRole);
      const p = lobby.players[idx];
      if (!p) return;
      if (isHost && p.peerId !== window.PartyNet.peerId) { p.roleId = e.target.value; window.PartyNet.broadcastLobby(); }
      else window.PartyNet.selectRole(e.target.value);
    });
    const start = $('#lobby-start');
    if (start) start.onclick = () => {
      try { window.PartyNet.startGame(); } catch (e) { $('#lobby-status').textContent = e.message; sound('error'); }
    };
  }

  function hideLobby() { const el = $('#party-lobby'); if (el) el.hidden = true; }

  // -------------------------------------------------------------------------
  // 開場 / 事件動畫
  // -------------------------------------------------------------------------
  function clearOpening() { openingTimer.forEach(t => clearTimeout(t)); openingTimer = []; }
  function onGameStart(game, { fromLobby = false } = {}) {
    hideLobby();
    hideSettlement();
    hideEnding();
    clearTimeout(finishTimer);
    finishTimer = null;
    clearTimeout(endingTimer);
    endingTimer = null;
    wheelTimers.forEach(t => clearTimeout(t));
    wheelTimers = [];
    wheelResolving = false;
    wheelOpen = false;
    clearTimeout(decisionTimer);
    decisionTimer = null;
    decisionGateKey = '';
    decisionGateUntil = 0;
    eventPromptKey = '';
    replaceDropConfirm = false;
    settlementLockUntil = 0;
    lastFinishKey = '';
    lastEventKey = '';
    lastCornerSubsidyKey = '';
    lastInvestmentSettlementKey = '';
    investmentSoundTimers.forEach(t => clearTimeout(t));
    investmentSoundTimers = [];
    lastWheelKey = '';
    lastIndulgenceKey = '';
    lastVectorKey = '';
    lastVectorPendingKey = '';
    vectorLockUntil = 0;
    clearTimeout(vectorLockTimer);
    vectorLockTimer = null;
    document.body.classList.remove('vector-locking');
    lastVictoryKey = '';
    clearTimeout(ghostStrikeTimer);
    ghostStrikeTimer = null;
    clearTimeout(victoryTimer);
    victoryTimer = null;
    doomTimers.forEach(t => clearTimeout(t));
    doomTimers = [];
    lastBankaiKey = '';
    lastIceKey = '';
    lastBankruptKey = '';
    lastTotemKey = '';
    lastFinalRound = null;
    closeExtModal();
    document.body.classList.remove('witch-negative', 'doom-resolving');
    const witch = $('#witch-overlay'); if (witch) witch.hidden = true;
    ['#ice-overlay', '#bankai-overlay', '#totem-overlay', '#indulgence-overlay', '#ghost-strike-overlay', '#wheel-overlay', '#doom-sequence', '#victory-pending-banner'].forEach(sel => {
      const node = $(sel);
      if (node) { node.hidden = true; node.className = node.className.replace(/\s*is-active/g, ''); }
    });
    const ghostFx = $('#ghost-strike-overlay');
    if (ghostFx) ghostFx.className = 'fx-layer ghost-strike-overlay';
    if (!game || game.ext?.debug) return;
    const meta = window.__partyData?.GAME_MODES?.[game.ext?.mode] || { cup: '派對盃', win: '' };
    const modeId = game.ext?.mode || 'star';
    const targetStars = Number(game.ext?.targetStars ?? game.starGoal ?? 3) || 3;
    const targetAssets = Number(game.ext?.targetAssets ?? game.ext?.target ?? 0);
    const doomEvery = Number(game.ext?.doomEvery ?? 5) || 5;
    const winText = modeId === 'star'
      ? `先拿到 ${targetStars} 顆星；或季末星數最高。`
      : modeId === 'tycoon'
        ? `總資產率先達到 ${money(targetAssets)}；季末比較總資產。`
        : modeId === 'evil'
          ? `撐過每 ${doomEvery} 季的毀滅日，成為唯一倖存者。`
          : meta.win;
    const el = $('#opening-overlay');
    if (!el) return;
    clearOpening();
    const players = game.players.map(p => p.name).join(' · ');
    el.hidden = false;
    el.innerHTML = `<div class="opening-scene">
      <div class="opening-cup">${meta.icon || '🏆'}<span>${h(meta.cup || '派對盃')}</span></div>
      <div class="opening-win"><small>勝利條件</small><strong>${h(winText || '')}</strong><em>${h(players)}</em></div>
      <div class="opening-count" hidden><span class="pointer">👉</span><strong>3</strong></div>
      <div class="opening-go" hidden><span>💥</span><strong>開賺吧！</strong></div>
    </div>`;
    sound('slide');
    openingTimer.push(setTimeout(() => sound('star'), 300));
    openingTimer.push(setTimeout(() => {
      const count = el.querySelector('.opening-count'); if (count) count.hidden = false;
      sound('dice');
    }, 1400));
    [3, 2, 1].forEach((n, i) => openingTimer.push(setTimeout(() => {
      const strong = el.querySelector('.opening-count strong'); if (strong) strong.textContent = String(n);
      sound('click');
    }, 1500 + i * 650)));
    openingTimer.push(setTimeout(() => {
      el.querySelector('.opening-count')?.setAttribute('hidden', '');
      const go = el.querySelector('.opening-go'); if (go) go.hidden = false;
      sound('explosion');
    }, 3600));
    openingTimer.push(setTimeout(() => { el.hidden = true; el.innerHTML = ''; }, 4900));
  }

  function flashInflation(stage) {
    const el = $('#event-flash');
    if (!el) return;
    el.className = 'event-flash inflation-flash';
    el.hidden = false;
    el.innerHTML = `<div class="flash-band"></div><div class="flash-content"><p>WARNING · 極端通膨</p><h2>通膨來襲！</h2><strong>資產變動 ×${stage}</strong><small>所有賺與扣的錢全面放大</small></div>`;
    sound('inflation'); sound('alarm');
    setTimeout(() => { el.hidden = true; el.className = 'event-flash'; }, 2600);
  }

  function doomSequenceItems(event) {
    if (Array.isArray(event?.sequence) && event.sequence.length) return event.sequence;
    // 舊存檔或舊事件沒有 sequence 時，至少依付款／抵抗／處決名單補回播放順序。
    const players = state()?.players || [];
    const nameOf = id => players.find(p => p.id === id)?.name || '玩家';
    const items = [];
    for (const id of event?.paidIds || []) items.push({ playerId: id, name: nameOf(id), outcome: 'paid', amount: event.fee });
    for (const id of event?.resistedIds || []) items.push({ playerId: id, name: nameOf(id), outcome: 'resisted', amount: 0 });
    for (const id of event?.executedIds || []) items.push({ playerId: id, name: nameOf(id), outcome: 'executed', amount: event.fee });
    return items;
  }

  function doomToken(id) {
    const board = $('#board');
    if (!board) return null;
    return board.querySelector(`.token[data-player-id="${String(id).replace(/"/g, '\\"')}"]`);
  }

  function prepareDoomTokens(seq) {
    for (const item of seq) {
      if (item.outcome !== 'executed') continue;
      const token = doomToken(item.playerId);
      if (!token) continue;
      const player = state()?.players?.find(x => x.id === item.playerId);
      // 先暫時顯示原本的企業棋子，等雷射命中後才轉為藍色罷工幽靈。
      token.textContent = String(player?.name || item.name || '?').slice(0, 1);
      token.style.background = colors[player?.color] || '#5f8ec4';
      token.classList.remove('ghost-player');
    }
  }

  function revealDoomGhost(id) {
    const token = doomToken(id);
    if (!token) return;
    const player = state()?.players?.find(x => x.id === id);
    token.textContent = '👻';
    token.style.background = '#5f8ec4';
    token.classList.add('ghost-player');
    if (player) token.title = `${player.name}（罷工團幽靈）`;
  }

  function fireDoomLaser(id) {
    const board = $('#board');
    if (!board) return false;
    const token = doomToken(id);
    if (!token) return false;
    const rect = board.getBoundingClientRect();
    if (!rect.width) return false;
    const tr = token.getBoundingClientRect();
    const x = tr.left - rect.left + tr.width / 2;
    const y = tr.top - rect.top + tr.height / 2;
    // 雷射必須從邪惡企業圖示發射；找不到圖示時才退回看板上方中央。
    const icon = document.querySelector('.evil-tower .tower-building') || document.querySelector('.evil-tower');
    let ox = rect.width * .5, oy = 0;
    if (icon) {
      const ir = icon.getBoundingClientRect();
      if (ir.width && ir.height) {
        ox = ir.left - rect.left + ir.width / 2;
        oy = ir.top - rect.top + ir.height / 2;
      }
    }
    let layer = board.querySelector('.doom-laser-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'doom-laser-layer';
      board.appendChild(layer);
    }
    layer.innerHTML = `<svg viewBox="0 0 ${rect.width} ${rect.height}" preserveAspectRatio="none" aria-hidden="true"><line class="doom-beam-line" x1="${ox}" y1="${oy}" x2="${x}" y2="${y}"/><circle class="doom-impact" cx="${x}" cy="${y}" r="4"/></svg>`;
    token.classList.add('doom-hit');
    const revealTimer = setTimeout(() => revealDoomGhost(id), 300);
    const hitTimer = setTimeout(() => token.classList.remove('doom-hit'), 620);
    const layerTimer = setTimeout(() => layer.remove(), 500);
    doomTimers.push(revealTimer, hitTimer, layerTimer);
    return true;
  }

  function flashDoom(event) {
    const el = $('#doom-sequence');
    const title = el?.querySelector('.doom-sequence-title');
    const sub = el?.querySelector('.doom-sequence-sub');
    if (!el || !title) return 0;
    doomTimers.forEach(t => clearTimeout(t));
    doomTimers = [];
    el.hidden = false;
    el.className = 'doom-sequence is-active';
    document.body.classList.add('doom-resolving');
    const seq = doomSequenceItems(event);
    prepareDoomTokens(seq);
    const step = 1300; // 標題 1 秒 + 雷射／結果 0.3 秒
    let offset = 0;
    sound('doom');
    if (!seq.length) {
      title.textContent = '毀滅日結算';
      sub.textContent = '全員驚險生還';
      offset = 1200;
    } else {
      seq.forEach(item => {
        const at = offset;
        doomTimers.push(setTimeout(() => {
          title.textContent = `正在向${item.name}收取保護費`;
          sub.textContent = item.outcome === 'paid'
            ? `支付保護費 ${money(event.fee)}...`
            : item.outcome === 'resisted'
              ? '不死圖騰正在抵抗雷射...'
              : '無法支付，準備處決...';
        }, at));
        doomTimers.push(setTimeout(() => {
          if (item.outcome === 'executed') {
            sub.textContent = `${item.name} 被雷射消滅，化為罷工幽靈`;
            if (fireDoomLaser(item.playerId)) {
              sound('laser');
              const boom = setTimeout(() => sound('explosion'), 120);
              doomTimers.push(boom);
            }
          } else if (item.outcome === 'paid') {
            sub.textContent = `${item.name} 已支付 ${money(event.fee)} 保護費`;
            sound('cashLoss');
          } else {
            sub.textContent = `${item.name} 以不死圖騰擋下處決`;
            sound('totem');
          }
        }, at + 1000));
        offset += step;
      });
      doomTimers.push(setTimeout(() => {
        title.textContent = '毀滅日結算完成';
        sub.textContent = (event.executedIds || []).length
          ? `${(event.executed || []).join('、')} 已轉為罷工幽靈`
          : '全員驚險生還';
      }, offset));
      offset += 500;
    }
    const total = Math.max(offset, 1200);
    settlementLockUntil = Date.now() + total + 250;
    doomTimers.push(setTimeout(() => {
      for (const item of seq) {
        if (item.outcome === 'executed') revealDoomGhost(item.playerId);
      }
      el.hidden = true;
      el.className = 'doom-sequence';
      document.body.classList.remove('doom-resolving');
      doomTimers = [];
    }, total));
    return total;
  }

  function flashDomainHit(event) {
    const board = $('#board');
    const token = board?.querySelector(`.token[data-player-id="${String(event.playerId || '').replace(/"/g, '\\"')}"]`);
    if (token) {
      token.classList.add('domain-hit');
      const label = document.createElement('span');
      label.className = 'domain-hit-label';
      label.textContent = `🌐 -${money(event.amount || 100)}`;
      token.closest('.tile')?.appendChild(label);
      setTimeout(() => { token.classList.remove('domain-hit'); label.remove(); }, 1500);
    }
    sound('domain');
  }

  function flashWitch() {
    const overlay = $('#witch-overlay');
    if (overlay) {
      overlay.hidden = false;
      setTimeout(() => { overlay.hidden = true; }, 2600);
    }
    document.body.classList.add('witch-negative');
    sound('witch');
    setTimeout(() => document.body.classList.remove('witch-negative'), 2400);
  }

  function flashGhostInterference(event) {
    const el = $('#ghost-strike-overlay');
    if (!el) return;
    clearTimeout(ghostStrikeTimer);
    el.hidden = true;
    // 強制重排以重新播放「放大 → 左飄 → 右出」的完整動畫。
    void el.offsetWidth;
    el.className = `fx-layer ghost-strike-overlay is-active${event?.enraged ? ' enraged' : ''}`;
    el.hidden = false;
    const strong = el.querySelector('.ghost-strike-copy strong');
    const small = el.querySelector('.ghost-strike-copy small');
    if (strong) strong.textContent = event?.enraged ? '憤怒幽靈干擾' : '幽靈干擾';
    if (small) small.textContent = event?.enraged ? '驟死賽的憤怒幽靈發動罷工效果' : '罷工幽靈正在干擾企業經營';
    sound('ghostLaugh');
    ghostStrikeTimer = setTimeout(() => {
      el.hidden = true;
      el.className = 'fx-layer ghost-strike-overlay';
    }, 2400);
  }

  function flashCornerSubsidy(event) {
    const marker = document.createElement('div');
    marker.className = 'corner-subsidy-pop';
    marker.textContent = `領取補助金${Number(event?.amount) || 1000}`;
    marker.setAttribute('role', 'status');
    const anchor = [...document.querySelectorAll('#board .token[data-player-id], [data-player-card]')]
      .find(node => node.dataset.playerId === event?.playerId || node.dataset.playerCard === event?.playerId);
    const rect = anchor?.getBoundingClientRect();
    const boardRect = $('#board')?.getBoundingClientRect();
    marker.style.left = `${rect ? rect.left + rect.width / 2 : boardRect ? boardRect.left + boardRect.width / 2 : window.innerWidth / 2}px`;
    marker.style.top = `${rect ? rect.top : boardRect ? boardRect.top + boardRect.height / 2 : window.innerHeight * .6}px`;
    document.body.appendChild(marker);
    marker.addEventListener('animationend', () => marker.remove(), { once: true });
    setTimeout(() => marker.remove(), 1900);
  }

  function playSkillCue(event) {
    const marker = document.createElement('div');
    marker.className = 'skill-cue';
    marker.textContent = event?.skillName || '技能發動';
    marker.setAttribute('role', 'status');
    marker.setAttribute('aria-live', 'polite');
    const playerId = String(event?.playerId || '');
    const anchors = [...document.querySelectorAll('#board .token[data-player-id], [data-player-card]')];
    const anchor = anchors.find(node => node.dataset.playerId === playerId || node.dataset.playerCard === playerId);
    const rect = anchor?.getBoundingClientRect();
    const boardRect = $('#board')?.getBoundingClientRect();
    marker.style.left = `${rect?.width ? rect.left + rect.width / 2 : boardRect ? boardRect.left + boardRect.width / 2 : window.innerWidth / 2}px`;
    marker.style.top = `${rect?.height ? rect.top : boardRect ? boardRect.top + boardRect.height / 2 : window.innerHeight * 0.65}px`;
    document.body.appendChild(marker);
    sound('coin');
    const remove = () => marker.remove();
    marker.addEventListener('animationend', remove, { once: true });
    setTimeout(remove, 1600);
  }

  function flashVictoryPending(event) {
    const el = $('#victory-pending-banner');
    if (!el) return;
    const text = event?.text || `${(event?.names || []).join('、')}已達標，本季將進行結算`;
    el.hidden = false;
    el.className = 'victory-pending-banner is-active';
    el.innerHTML = `<span>🏁</span><div><strong>${h(text)}</strong><small>本季結束後立即進行最終結算</small></div>`;
    sound('star');
    clearTimeout(victoryTimer);
    victoryTimer = setTimeout(() => {
      el.hidden = true;
      el.className = 'victory-pending-banner';
    }, 3400);
  }

  function hideEnding() {
    const el = $('#ending-overlay');
    if (el) { el.hidden = true; el.className = 'ending-overlay'; el.innerHTML = ''; }
  }

  function playEnding(p) {
    if (!p || p.ext?.debug) return false;
    if (p.resultReason === 'survivor' || p.resultReason === 'bankrupt') return false;
    const mode = p.ext?.mode;
    if (!['star', 'tycoon'].includes(mode)) return false;
    const el = $('#ending-overlay');
    if (!el) return false;
    const winners = p.players.filter(x => p.winnerIds?.includes(x.id));
    const names = winners.map(x => x.name).join('、') || '無人';
    el.className = `ending-overlay ${mode}`;
    el.hidden = false;
    if (mode === 'star') {
      el.innerHTML = `<div class="ending-scene star-scene">
        <div class="ending-stars">${Array.from({ length: 18 }, (_, i) => `<i style="--i:${i}">★</i>`).join('')}</div>
        <div class="ending-orbit"><span>🌟</span><span>⭐</span><span>✦</span></div>
        <p class="ending-kicker">ENTERPRISE STAR · 星海加冕</p>
        <h2>${h(names)}成為企業之星！</h2>
        <strong>星海加冕 · 本季結算完成</strong>
        <small>${winners.map(x => `${x.stars} 顆星 · ${money(x.cash)} 總資產`).join('　') || '星數最高者獲勝'}</small>
      </div>`;
      sound('endingStar');
    } else {
      el.innerHTML = `<div class="ending-scene tycoon-scene">
        <div class="ending-coins">${Array.from({ length: 22 }, (_, i) => `<i style="--i:${i}">🪙</i>`).join('')}</div>
        <div class="ending-chart">📈</div>
        <p class="ending-kicker">TYCOON · 資產封頂</p>
        <h2>${h(names)}成為世界首富！</h2>
        <strong>資產封頂 · 本季結算完成</strong>
        <small>${winners.map(x => `${money(x.cash)} 總資產`).join('　') || '總資產最高者獲勝'}</small>
      </div>`;
      sound('endingTycoon');
    }
    clearTimeout(endingTimer);
    endingTimer = setTimeout(hideEnding, 3000);
    return true;
  }

  function flashFinalSeason(round, maxRounds) {
    const el = $('#event-flash');
    if (!el) return;
    el.className = 'event-flash final-flash';
    el.hidden = false;
    el.innerHTML = `<div class="final-scene"><span>⏰</span><div><p>FINAL SEASON</p><h2>最終季 · 第 ${round} / ${maxRounds} 季</h2><strong>季數上限後依模式規則排名</strong><small>把握最後一次擲骰與買星機會</small></div><span>🏁</span></div>`;
    sound('alarm');
    setTimeout(() => { el.hidden = true; el.className = 'event-flash'; }, 3200);
  }

  function flashSuddenDeath(event) {
    const el = $('#event-flash');
    if (!el) return;
    el.className = 'event-flash sudden-flash';
    el.hidden = false;
    el.innerHTML = `<div class="sudden-scene"><span>⚡</span><div><p>SUDDEN DEATH</p><h2>驟死賽啟動</h2><strong>${h(event.winners?.join('、') || '')} 平手</strong><small>憤怒幽靈：紅色圖標 · 移動 1.5 倍 · 扣錢 2 倍</small></div><span>👻</span></div>`;
    sound('lightning'); setTimeout(() => sound('ghost'), 300);
    setTimeout(() => { el.hidden = true; el.className = 'event-flash'; }, 3000);
  }

  // -------------------------------------------------------------------------
  // 專屬特效
  // -------------------------------------------------------------------------
  function resetFx(sel, extra = '') {
    const el = $(sel);
    if (!el) return null;
    el.hidden = false;
    el.className = `${extra || el.className.replace(/\s*is-active/g, '')} is-active`;
    return el;
  }
  function hideFx(sel, baseClass) {
    const el = $(sel);
    if (!el) return;
    el.hidden = true;
    el.className = baseClass;
  }

  function flashFrozen(event) {
    const el = resetFx('#ice-overlay', 'fx-layer ice-overlay');
    if (!el) return;
    sound('frozen');
    const names = (event?.frozen || []).join('、');
    if (names) app()?.notify(`❄️ ${names} 被寒冰蘑菇凍結！`);
    setTimeout(() => hideFx('#ice-overlay', 'fx-layer ice-overlay'), 520);
  }

  function flashBankai() {
    const el = resetFx('#bankai-overlay', 'fx-layer bankai-overlay');
    if (!el) return;
    sound('bankai');
    setTimeout(() => sound('lightning'), 120);
    setTimeout(() => hideFx('#bankai-overlay', 'fx-layer bankai-overlay'), 1250);
  }

  function flashTotem() {
    const el = resetFx('#totem-overlay', 'fx-layer totem-overlay');
    if (!el) return;
    sound('totem');
    setTimeout(() => hideFx('#totem-overlay', 'fx-layer totem-overlay'), 1500);
  }

  function flashIndulgence() {
    const el = resetFx('#indulgence-overlay', 'fx-layer indulgence-overlay');
    if (!el) return;
    sound('paper');
    setTimeout(() => hideFx('#indulgence-overlay', 'fx-layer indulgence-overlay'), 1400);
  }

  function flashBankrupt(event) {
    const el = $('#event-flash');
    if (!el) return;
    const names = (event?.names || []).join('、') || '玩家';
    el.className = 'event-flash bankrupt-flash';
    el.hidden = false;
    el.innerHTML = `<div class="bankrupt-scene"><span>👻</span><div><p>MARKET ELIMINATION</p><h2>負債淘汰</h2><strong>${h(names)} 化為罷工幽靈</strong><small>總資產跌破 −1,000，籌碼與道具全數清算。</small></div></div>`;
    sound('ghost');
    setTimeout(() => { el.hidden = true; el.className = 'event-flash'; }, 2600);
  }

  function tilePoint(index) {
    const board = $('#board');
    const tile = board?.querySelector(`[data-tile-index="${index}"]`);
    if (!board || !tile) return null;
    const rect = board.getBoundingClientRect();
    const tr = tile.getBoundingClientRect();
    return { x: tr.left - rect.left + tr.width / 2, y: tr.top - rect.top + tr.height / 2 };
  }

  const VECTOR_LOCK_MS = 520;

  function releaseVectorLock(tokens = []) {
    document.body.classList.remove('vector-locking');
    tokens.forEach(token => {
      token.classList.remove('vector-locked');
      token.removeAttribute('data-vector-lock');
    });
  }

  // 先讓受害者棋子停在原格並顯示鎖定準心，0.5 秒後才真正傳送與觸發格子效果。
  function beginVectorLock(pending) {
    if (!pending) return;
    const ids = new Set((pending.candidates || []).map(c => c.playerId));
    const tokens = $$('#board .token').filter(token => ids.has(token.dataset.playerId));
    const names = (pending.candidates || []).map(c => c.name).filter(Boolean).join('、') || '目標';
    const expectedAt = String(pending.at);
    releaseVectorLock($$('#board .token.vector-locked'));
    clearTimeout(vectorLockTimer);
    vectorLockUntil = Date.now() + VECTOR_LOCK_MS;
    document.body.classList.add('vector-locking');
    tokens.forEach(token => {
      token.classList.add('vector-locked');
      token.dataset.vectorLock = '1';
    });
    app()?.notify?.(`🎯 矢量操作鎖定 ${names}！`);
    vectorLockTimer = setTimeout(() => {
      vectorLockTimer = null;
      const current = state();
      const active = current?.ext?.vectorPending;
      if (!active || String(active.at) !== expectedAt) {
        vectorLockUntil = 0;
        releaseVectorLock(tokens);
        return;
      }
      const before = app()?.cashSnapshot?.();
      let event = null;
      try {
        event = window.__partyEngine?.extResolveVectorPending?.(current) || null;
      } catch (err) {
        console.error(err);
        app()?.notify?.('矢量操作傳送結算失敗。');
      }
      vectorLockUntil = 0;
      releaseVectorLock(tokens);
      app()?.save?.();
      app()?.render?.();
      if (event && before) app()?.animateCashChanges?.(before);
    }, VECTOR_LOCK_MS);
  }

  function flashVector(event) {
    const board = $('#board');
    if (!board || !event) return;
    const hits = Array.isArray(event.hits) && event.hits.length
      ? event.hits
      : [{ playerId: event.playerId, from: event.from, to: event.to }];
    const tiles = [];
    for (const hit of hits) {
      if (Number.isInteger(hit.from)) tiles.push(hit.from);
      if (Number.isInteger(hit.to)) tiles.push(hit.to);
    }
    const points = [...new Set(tiles)].map(tilePoint).filter(Boolean);
    if (!points.length) return;
    board.querySelectorAll('.vector-smoke').forEach(n => n.remove());
    points.forEach((pt, i) => {
      const puff = document.createElement('span');
      puff.className = 'vector-smoke';
      puff.style.left = `${pt.x}px`;
      puff.style.top = `${pt.y}px`;
      puff.style.animationDelay = `${i * .08}s`;
      puff.innerHTML = '<i></i><i></i><i></i>';
      board.appendChild(puff);
      setTimeout(() => puff.remove(), 1000);
    });
    sound('swing');
    const names = hits.map(hit => hit.name || state()?.players?.find(x => x.id === hit.playerId)?.name || '玩家');
    const destination = event.to ?? hits[0]?.to;
    app()?.notify(hits.length > 1
      ? `⬆️ 矢量操作：${names.join('、')} 被傳送到第 ${destination} 格！`
      : `⬆️ ${names[0] || '玩家'} 被矢量操作傳送到第 ${destination} 格！`);
  }

  function eventSound(event) {
    const kind = event?.kind;
    const amount = Number(event?.amount) || 0;
    if (kind === 'selfEnergy') return 'magic';
    if (kind === 'allEnergy') return 'ghost';
    return amount >= 0 ? 'coin' : 'cashLoss';
  }

  function eventPromptKeyOf(p) {
    const ev = p?.ext?.eventPrompt;
    return ev ? `${ev.playerId}:${ev.at}:${ev.eventId}` : '';
  }

  function openEventPrompt(p) {
    const ev = p?.ext?.eventPrompt;
    if (!ev) return;
    if (!isLocalOwner(p, ev.playerId)) return;
    const key = eventPromptKeyOf(p);
    if (modal === 'event' && eventPromptKey === key) return;
    eventPromptKey = key;
    modal = 'event';
    const amount = Number(ev.amount) || 0;
    const energyEvent = ev.kind === 'allEnergy' || ev.kind === 'selfEnergy';
    const amountText = amount ? `${amount > 0 ? '+' : ''}${energyEvent ? `${amount} 技能點` : `${money(amount)} 總資產`}` : '';
    updateExtModal({
      kicker: `EVENT TILE · 第 ${p.round} 季`, icon: ev.icon || '❓', title: ev.name || '突發事件', type: 'event',
      text: ev.text || '市場上突然出現一則消息，影響所有企業。',
      body: `<div class="event-prompt-box">
        <span class="event-prompt-icon">${ev.icon || '❓'}</span>
        <div><small>觸發事件</small><strong>${h(ev.name || '突發事件')}</strong><p>${h(ev.text || '')}</p></div>
        ${amountText ? `<em class="${amount > 0 ? 'good' : 'bad'}">${h(amountText)}</em>` : ''}
      </div>`,
      actions: `<button class="primary" data-event-ok="1" type="button">確認事件</button>`
    });
    sound(eventSound(ev));
  }

  // -------------------------------------------------------------------------
  // 擴充 Modal
  // -------------------------------------------------------------------------
  function openExtModal({ kicker = '', icon = '✦', title = '', text = '', body = '', actions = '', type = 'info' }) {
    ensureRoot();
    const el = $('#ext-modal');
    if (!el) return;
    el.hidden = false;
    el.querySelector('.ext-kicker').textContent = kicker;
    el.querySelector('.ext-icon').textContent = icon;
    el.querySelector('.ext-title').textContent = title;
    el.querySelector('.ext-text').textContent = text;
    el.querySelector('.ext-body').innerHTML = body;
    el.querySelector('.ext-actions').innerHTML = actions;
    el.dataset.type = type;
    sound('slide');
    el.querySelector('.ext-modal-close').onclick = () => { if (['auction', 'decision', 'tax', 'invest', 'insider', 'star', 'replace', 'event'].includes(type)) { app()?.notify('請先完成目前事件。'); return; } closeExtModal(); };
  }
  function closeExtModal() { const el = $('#ext-modal'); if (el) el.hidden = true; modal = null; replaceDropConfirm = false; }
  function updateExtModal(data) { openExtModal(data); }

  function openStarOffer(p) {
    const offer = p?.ext?.starOffer;
    if (!offer) return;
    const player = p.players.find(x => x.id === offer.playerId);
    if (!player) return;
    const price = Number(offer.price) || 0;
    const goal = p.starGoal || 3;
    const check = window.__partyEngine?.extCanBuyStar?.(p);
    const canBuy = Boolean(check?.ok);
    modal = 'star';
    updateExtModal({
      kicker: `STAR OFFER · 第 ${p.round} 季`, icon: '⭐', title: '出發格 · 購買星星', type: 'star',
      text: offer.landed ? `${player.name} 停在出發格，可以購買 1 顆星。` : `${player.name} 經過出發格，可以購買 1 顆星。`,
      body: `<div class="star-offer-box">
        <div class="star-offer-glow">⭐</div>
        <div class="star-offer-info"><span>目前星價</span><strong>${money(price)}</strong><small>${player.name} 目前 ${player.stars} / ${goal} 顆星 · 總資產 ${money(player.cash)}</small></div>
        <p class="star-offer-note">每次有人買星，全場星價就會上漲。${canBuy ? '' : `（${check?.reason || (player.cash < price ? '總資產不足' : '目前無法購買')}）`}</p>
      </div>`,
      actions: `<button class="secondary" data-star-offer="skip" type="button">這次不買</button><button class="primary" data-star-offer="buy" type="button" ${canBuy ? '' : 'disabled'}>⭐ 買下星星 · ${money(price)}</button>`
    });
  }

  function openReplaceOffer(p) {
    const offer = p?.ext?.replaceOffer;
    if (!offer) return;
    const player = p.players.find(x => x.id === offer.playerId);
    if (!player) return;
    const { ITEMS = [], MYTHIC_BY_ID = {} } = window.__partyData || {};
    const offerKind = offer.itemKind === 'normal' ? 'normal' : 'mythic';
    const meta = offerKind === 'normal'
      ? (ITEMS.find(x => x.id === offer.itemId) || { name: offer.itemId, icon: '🎁', desc: '' })
      : (MYTHIC_BY_ID[offer.itemId] || { name: offer.itemId, icon: '❓', desc: '' });
    const sourceText = offer.source === 'debug'
      ? '透過測試工具加入新道具，但道具欄已滿（3/3）。'
      : `以 ${money(offer.price || 0)} 標下新道具，但道具欄已滿（3/3）。`;
    const slots = [
      ...(player.mythics || []).map((entry, index) => {
        const m = MYTHIC_BY_ID[entry.id] || { name: entry.id, icon: '🗿', desc: '' };
        return { kind: 'mythic', index, name: m.name, icon: m.icon, desc: m.desc };
      }),
      ...(player.items || []).map((id, index) => {
        const m = ITEMS.find(x => x.id === id) || { name: id, icon: '🎁', desc: '' };
        return { kind: 'normal', index, name: m.name, icon: m.icon, desc: m.desc };
      })
    ];
    modal = 'replace';
    const confirm = replaceDropConfirm;
    updateExtModal({
      kicker: offer.source === 'debug' ? `DEBUG · 第 ${p.round} 季` : `BLACK MARKET · 第 ${p.round} 季`, icon: '🛒', title: confirm ? '確認丟棄新道具？' : '背包已滿 · 替換或丟棄', type: 'replace',
      text: confirm ? '丟棄後無法復原，這件剛獲得的新道具會直接消失。' : `${player.name} ${sourceText}請選擇替換或丟棄新道具。`,
      body: confirm
        ? `<div class="replace-warning"><span>⚠️</span><div><strong>${h(meta.icon)} ${h(meta.name)}</strong><small>這件新道具將被永久丟棄，已支付的成本不會退還。</small></div></div>`
        : `<div class="replace-box">
            <div class="replace-new"><span class="replace-item-icon">${meta.icon}</span><div><small>剛獲得的新道具</small><strong>${h(meta.name)}</strong><p>${h(meta.desc || '')}</p></div></div>
            <div class="replace-grid">
              ${slots.map(s => `<button type="button" class="replace-slot ${s.kind}" data-replace-kind="${s.kind}" data-replace-index="${s.index}"><span>${s.icon}</span><div><strong>${h(s.name)}</strong><small>${s.kind === 'mythic' ? '神話道具' : '普通道具'} · 點擊替換</small></div></button>`).join('')}
            </div>
            <p class="replace-note">選擇一個現有道具替換，或丟棄剛獲得的新道具（需二次確認）。</p>
          </div>`,
      actions: confirm
        ? `<button class="secondary" data-replace-back type="button">返回</button><button class="danger" data-replace-drop-confirm type="button">確定丟棄新道具</button>`
        : `<button class="danger" data-replace-drop type="button">丟棄新道具</button>`
    });
  }

  function openSpecialModal(s) {
    const p = state();
    if (!p) return;
    const owner = specialOwnerId(p);
    if (owner && !isLocalOwner(p, owner)) return;
    modal = s.type;
    const nameOf = id => p.players.find(x => x.id === id)?.name || '';
    if (s.type === 'auction') {
      const a = p.ext.auction;
      const cur = s.current || window.__partyEngine?.extAuctionCurrent?.(p);
      const myTurn = isLocalOwner(p, cur?.id);
      updateExtModal({
        kicker: `BLACK MARKET · 第 ${p.round} 季`, icon: '🛒', title: '黑市拍賣', type: 'auction',
        text: '隱藏的神話道具正在拍賣。每次抬價 250，最後一位出價者得標。',
        body: `<div class="auction-box"><div class="auction-item">❓<span>隱藏神話道具</span></div><div class="auction-stats"><div><small>目前出價</small><strong>${money(a.highestBid || a.basePrice)}</strong></div><div><small>下次出價</small><strong>${money(a.currentPrice)}</strong></div><div><small>最高出價者</small><strong>${h(nameOf(a.highestBidder) || '尚無')}</strong></div><div><small>目前玩家持有</small><strong class="auction-cash ${Number(cur?.cash) < 0 ? 'negative' : ''}">${money(cur?.cash || 0)}</strong></div></div><p class="auction-turn">輪到 <b>${h(cur?.name || '')}</b> 決定${cur ? ` · 持有 ${money(cur.cash)} 總資產` : ''}</p></div>`,
        actions: `<button class="secondary" data-auction="pass" ${myTurn ? '' : 'disabled'}>放棄</button><button class="primary" data-auction="bid" ${myTurn ? '' : 'disabled'}>出價 ${money(a.currentPrice)} ↑</button>`
      });
    } else if (s.type === 'invest') {
      const offer = p.ext.investOffer;
      const player = p.players.find(x => x.id === offer.playerId);
      updateExtModal({
        kicker: 'INVESTMENT · 股票憑證', icon: '📈', title: '投資機會', type: 'invest',
        text: `${player?.name || ''} 可投入 50% 總資產，季末結算：大牛市 3 倍（10%）、平穩期 1.5 倍（40%）、龐氏騙局歸零（50%）。`,
        body: `<div class="invest-box"><span>投入金額</span><strong>${money(offer.cost)}</strong><small>目前總資產 ${money(player?.cash || 0)}</small><div class="odds"><i>3× · 10%</i><i>1.5× · 40%</i><i>0× · 50%</i></div></div>`,
        actions: `<button class="secondary" data-invest="no">跳過</button><button class="primary" data-invest="yes" ${offer.cost <= 0 ? 'disabled' : ''}>投入 ${money(offer.cost)}</button>`
      });
    } else if (s.type === 'tax') {
      const offer = p.ext.taxChoice;
      const player = p.players.find(x => x.id === offer.playerId);
      const amount = Math.floor(Math.max(0, player?.cash || 0) * 0.5);
      const ticket = player?.mythics?.find(x => x.id === 'indulgence');
      updateExtModal({
        kicker: 'TAX OFFICE · 查稅局', icon: '🏛️', title: '國稅局找上門', type: 'tax',
        text: `${player?.name || ''} 被查出帳目異常。選擇繳交 50% 總資產，或接受 2 回合羈押。`,
        body: `<div class="tax-box"><div><span>應繳稅額</span><strong>${money(amount)}</strong></div>${ticket ? `<p class="ticket-note">🎫 你持有贖罪券（${ticket.charges} 次），可全額抵銷本次稅金。</p>` : ''}</div>`,
        actions: `<button class="secondary" data-tax="detain">接受羈押 2 回合</button><button class="primary" data-tax="pay">繳稅 ${money(amount)}</button>`
      });
    } else if (s.type === 'insider') {
      const offer = p.ext.insiderOffer;
      const player = p.players.find(x => x.id === offer.playerId);
      updateExtModal({
        kicker: 'INSIDER TRADING · 內線交易', icon: '🌈', title: '命運輪盤', type: 'insider',
        text: `${player?.name || ''} 可以花 100 啟動命運輪盤。輪盤停止後需按確認才會套用結果，用過後此格會移位重生。`,
        body: `<div class="wheel-preview">${['🌟', '💀', '💸', '✂️', '🎒', '🕶️', '🤑', '👻', '⭐', '💱', '🥣', '🤡'].map(x => `<span>${x}</span>`).join('')}</div>`,
        actions: `<button class="secondary" data-insider="no">放棄</button><button class="primary" data-insider="yes" ${player?.cash < 100 ? 'disabled' : ''}>支付 100 啟動</button>`
      });
    }
  }

  function openFateDice() {
    const p = state();
    const player = p?.players?.[p.turnIndex];
    if (!p || !player || !isLocalOwner(p, player.id)) return;
    openExtModal({
      kicker: 'SPECIAL ITEM · 命運骰子',
      icon: '🎲',
      title: '選擇前進步數',
      text: '選擇 1–6 步，命運骰子使用後會消失。',
      type: 'fateDice',
      body: `<div class="fate-dice-grid" role="group" aria-label="選擇 1 到 6 步">${[1, 2, 3, 4, 5, 6].map(value => `<button type="button" data-fate-step="${value}" aria-label="前進 ${value} 步">${value}</button>`).join('')}</div>`
    });
  }

  function afterSpecialChange() {
    const p = state();
    if (!p) return;
    if (p.status !== 'playing') {
      if (modal && ['auction', 'invest', 'tax', 'insider', 'star', 'replace', 'event'].includes(modal)) closeExtModal();
      return;
    }
    // 棋子移動／骰子動畫期間絕不彈出互動視窗，避免提前暴雷。
    if (app()?.isAnimating?.()) return;
    // 內線交易輪盤播放期間，先讓輪盤完成演出。
    if (wheelOpen || p.ext?.wheelPending) return;
    // 事件格提示優先於所有決策與特殊格視窗。
    if (p.ext?.eventPrompt) {
      if (modal && ['auction', 'invest', 'tax', 'insider', 'star', 'replace', 'truth', 'tile', 'debug-items'].includes(modal)) closeExtModal();
      openEventPrompt(p);
      return;
    }
    if (modal === 'event') closeExtModal();
    if (p.pendingDecision && modal && ['truth', 'tile', 'debug-items'].includes(modal)) closeExtModal();
    const owner = specialOwnerId(p);
    if (hasSpecialOffer(p)) {
      if (modal && ['truth', 'tile', 'debug-items', 'event'].includes(modal)) closeExtModal();
      if (!isLocalOwner(p, owner)) {
        if (modal && ['auction', 'invest', 'tax', 'insider', 'star', 'replace'].includes(modal)) closeExtModal();
        return;
      }
      if (p.ext?.replaceOffer) { openReplaceOffer(p); return; }
      if (p.ext?.starOffer) { openStarOffer(p); return; }
      if (p.ext?.auction) {
        const cur = window.__partyEngine?.extAuctionCurrent?.(p) || null;
        openSpecialModal({ type: 'auction', current: cur });
        return;
      }
      if (p.ext?.investOffer) { openSpecialModal({ type: 'invest' }); return; }
      if (p.ext?.taxChoice) { openSpecialModal({ type: 'tax' }); return; }
      if (p.ext?.insiderOffer) { openSpecialModal({ type: 'insider' }); return; }
    }
    if (modal && ['auction', 'invest', 'tax', 'insider', 'star', 'replace', 'event'].includes(modal)) closeExtModal();
  }

  // app.js 的快速決策視窗會先詢問這裡，確保事件提示／特殊格／動畫全部結束後才彈出。
  function decisionBlocked(p) {
    if (!p) return false;
    if (app()?.isAnimating?.()) return true;
    if (p.ext?.vectorPending) return true;
    if (Date.now() < vectorLockUntil) return true;
    if (p.ext?.eventPrompt) return true;
    if (wheelOpen || p.ext?.wheelPending) return true;
    if (hasSpecialOffer(p)) return true;
    if (Date.now() < decisionGateUntil) return true;
    return false;
  }

  // -------------------------------------------------------------------------
  // 輪盤
  // -------------------------------------------------------------------------
  function showWheel(data) {
    const p = state();
    if (!p || !data) return;
    if (data.playerId && !isLocalOwner(p, data.playerId)) { lastWheelKey = String(data.at || data.index || ''); return; }
    const el = $('#wheel-overlay');
    if (!el) return;
    const effects = window.__partyData?.WHEEL_EFFECTS || [];
    const symbols = (effects.length ? effects.map(e => e.icon) : ['🌟', '💀', '💸', '✂️', '🎒', '🕶️', '🤑', '👻', '⭐', '💱', '🥣', '🤡']);
    const effect = data.effect || effects[data.index] || null;
    const index = Number.isInteger(data.index) ? data.index : Math.max(0, effects.findIndex(e => e.id === effect?.id));
    wheelTimers.forEach(t => clearTimeout(t));
    wheelTimers = [];
    wheelResolving = false;
    wheelOpen = true;
    el.hidden = false;
    el.innerHTML = `<div class="wheel-card"><p class="ext-kicker">DESTINY WHEEL</p>
      <div class="wheel-stage"><div class="wheel-ring">${symbols.map((s, i) => `<span style="--i:${i}">${s}</span>`).join('')}<div class="wheel-center">🌈</div></div><div class="wheel-pointer">▲</div></div>
      <h3>命運輪盤轉動中…</h3><div class="wheel-result" hidden></div></div>`;
    sound('wheel');
    const ring = el.querySelector('.wheel-ring');
    const rotation = 5 * 360 + ((180 - index * 30) % 360 + 360) % 360;
    requestAnimationFrame(() => {
      if (!ring || !el.isConnected) return;
      ring.style.transition = 'transform 2s cubic-bezier(.12,.7,.16,1)';
      ring.style.transform = `rotate(${rotation}deg)`;
    });
    wheelTimers.push(setTimeout(() => {
      const title = el.querySelector('.wheel-card h3');
      if (title) title.textContent = '命運已定，等待確認…';
      // 輪盤完全靜止 1 秒後只顯示確認提示；效果必須等玩家按下確認才套用。
      wheelTimers.push(setTimeout(() => readyWheel(el, data, effect), 1000));
    }, 2000));
  }

  function readyWheel(el, data, effect) {
    if (!el || el.hidden) return;
    wheelResolving = false;
    const resultNode = el.querySelector('.wheel-result');
    if (!resultNode) return;
    resultNode.hidden = false;
    resultNode.innerHTML = `<strong>${effect?.icon || '🌈'} ${h(effect?.name || '命運結果')}</strong><p>${h(effect?.desc || '按下確認後才會正式套用。')}</p><button class="primary" type="button" data-wheel-confirm>確認並套用</button>`;
    sound('click');
    const button = resultNode.querySelector('[data-wheel-confirm]');
    if (button) button.onclick = () => confirmWheel(el, data);
  }

  function confirmWheel(el, data) {
    if (wheelResolving) return;
    const p = state();
    if (!p || !el) return;
    wheelResolving = true;
    // 先關閉視窗，再正式套用效果與播放對應動畫，避免動畫疊在提示視窗上。
    el.hidden = true;
    wheelOpen = false;
    Promise.resolve(app()?.run?.(() => {
      const result = window.__partyEngine?.extResolveWheel?.(state(), { playerId: data.playerId, at: data.at });
      if (result) app()?.notify?.(`🌈 ${result.effect?.name || '命運輪盤'}：${result.text || ''}`);
      else { lastWheelKey = ''; app()?.notify?.('輪盤結果已失效。'); }
    })).finally(() => {
      wheelResolving = false;
      afterSpecialChange();
    });
  }

  // -------------------------------------------------------------------------
  // 真理之門 / 道具挑選 / 格子挑選
  // -------------------------------------------------------------------------
  function openTruthGate() {
    const p = state();
    if (!p) return;
    if (!canUseLocalAction(p)) { app()?.notify('現在不是你的回合，請等待其他玩家。'); return; }
    if (p.phase !== 'roll') { app()?.notify('神話道具只能在擲骰前使用。'); return; }
    const player = p.players[p.turnIndex];
    const entry = player?.mythics?.find(x => x.id === 'truthGate');
    const normal = (window.__partyData?.ITEMS || []).filter(i => !i.hidden);
    const mythics = (window.__partyData?.MYTHIC_ITEMS || []).filter(i => !i.hidden);
    const inventoryCount = (player?.items?.length || 0) + (player?.mythics?.length || 0);
    const cashOk = (player?.cash || 0) >= 1000;
    const hasSpace = inventoryCount < 3;
    const bankai = Boolean(player?.ext?.bankai);
    const canBuy = cashOk && hasSpace && !bankai;
    const canSell = inventoryCount > 0;
    const buyReason = !cashOk ? '總資產不足 1,000' : bankai ? '卍解期間禁止獲取新道具' : !hasSpace ? '道具欄已滿（3/3）' : '';
    const sellOptions = [
      ...(player?.items || []).map((id, idx) => {
        const it = normal.find(x => x.id === id) || { icon: '🎁', name: id };
        return `<option value="normal:${idx}">${it.icon} ${h(it.name)}</option>`;
      }),
      ...(player?.mythics || []).map((m, idx) => {
        const it = mythics.find(x => x.id === m.id) || { icon: '🗿', name: m.id };
        return `<option value="mythic:${idx}">${it.icon} ${h(it.name)}（神話）</option>`;
      })
    ].join('');
    updateExtModal({
      kicker: 'TRUTH GATE · 真理之門', icon: '🚪', title: `真理之門（${entry?.charges ?? 0} 次）`, type: 'truth',
      text: '將 1,000 總資產煉成指定普通道具，或把 1 個道具煉成 1,000 總資產。',
      body: `<div class="truth-grid">
        <div><h4>💰 1000 → 普通道具</h4><select id="truth-buy" ${canBuy ? '' : 'disabled'}>${normal.map(i => `<option value="${i.id}">${i.icon} ${h(i.name)}</option>`).join('') || '<option value="">沒有可煉成的道具</option>'}</select><button class="secondary" data-truth="buy" ${canBuy ? '' : 'disabled'}>煉成道具</button>${buyReason ? `<small class="truth-lock">${h(buyReason)}</small>` : '<small class="truth-hint">金錢轉道具僅能產出普通道具。</small>'}</div>
        <div><h4>🎒 道具 → 1000</h4><select id="truth-sell" ${canSell ? '' : 'disabled'}>${sellOptions || '<option value="">背包裡沒有道具</option>'}</select><button class="secondary" data-truth="sell" ${canSell ? '' : 'disabled'}>煉成 1000</button><small class="${canSell ? 'truth-hint' : 'truth-lock'}">${canSell ? '普通與神話道具都可煉成 1,000。' : '背包裡沒有道具可以煉成金錢。'}</small></div>
      </div>`,
      actions: `<button class="secondary" data-truth="close">取消</button>`
    });
  }

  function openDebugItemPicker(kind) {
    const p = state();
    if (!p) return;
    if (!canUseLocalAction(p)) { app()?.notify('現在不是你的回合，請等待其他玩家。'); return; }
    const { ITEMS = [], MYTHIC_ITEMS = [] } = window.__partyData || {};
    const normal = ITEMS;
    const mythics = MYTHIC_ITEMS;
    const showNormal = kind !== 'mythic';
    const showMythic = kind !== 'normal';
    const entries = [
      ...(showNormal ? normal.map(i => ({ kind: 'normal', meta: i, hidden: false })) : []),
      ...(showMythic ? mythics.map(i => ({ kind: 'mythic', meta: i, hidden: Boolean(i.hidden) })) : [])
    ];
    updateExtModal({
      kicker: 'DEBUG · 測試模式', icon: '🧪', title: '新增道具', type: 'debug-items',
      text: '點擊即可直接加入目前玩家的道具欄（含一般與隱藏道具）。道具欄已滿時會自動開啟替換視窗。',
      body: `<div class="debug-item-grid">${entries.map(e => `<button type="button" class="debug-item ${e.kind}" data-give-kind="${e.kind}" data-give-id="${e.meta.id}"><span>${e.meta.icon}</span><strong>${h(e.meta.name)}${e.hidden ? '（隱藏）' : ''}</strong><small>${h(e.meta.desc)}</small></button>`).join('') || '<div class="empty-state">目前沒有可新增的道具。</div>'}</div>`,
      actions: `<button class="secondary" data-truth="close">取消</button>`
    });
  }

  function openTilePicker(opts, callback) {
    const p = state();
    if (!p) return;
    if (!canUseLocalAction(p)) { app()?.notify('現在不是你的回合，請等待其他玩家。'); return; }
    tilePick = { opts, callback };
    const tiles = p.board || [];
    updateExtModal({
      kicker: 'TARGET TILE', icon: '🎯', title: opts.title || '選擇格子', type: 'tile',
      text: opts.text || '點擊地圖上的格子。',
      body: `<div class="tile-picker">${tiles.map(t => `<button type="button" class="pick-tile ${t.special ? 'special' : ''} ${t.type}" data-pick-tile="${t.index}" ${opts.excludeStart && t.index === 0 ? 'disabled' : ''}><small>${String(t.index).padStart(2, '0')}</small><span>${t.icon}</span><strong>${h(t.label)}</strong></button>`).join('')}</div>`,
      actions: `<button class="secondary" data-truth="close">取消</button>`
    });
  }

  // -------------------------------------------------------------------------
  // 除錯面板
  // -------------------------------------------------------------------------
  function ensureDebugPanel(p) {
    let panel = $('#debug-panel');
    if (!p?.ext?.debug || !canUseLocalAction(p)) { panel?.remove(); return; }
    const side = $('.side-stack');
    if (!side) return;
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'debug-panel';
      panel.className = 'panel debug-panel';
      side.appendChild(panel);
    }
    panel.innerHTML = `<div class="panel-title"><h3>🧪 測試工具</h3><span class="pill">DEBUG</span></div>
      <p class="debug-hint">點「新增道具」可獲得一般或隱藏道具；先點玩家或幽靈，再點格子即可瞬移。</p>
      <div class="debug-buttons"><button class="quiet" data-debug-action="add">➕ 新增道具</button><button class="quiet" data-debug-action="end-turn" ${app()?.isAnimating?.() || p.status !== 'playing' ? 'disabled' : ''}>⏭️ 結束回合</button></div>
      <p class="debug-selected">${debugSelected ? `已選：${debugSelected.type === 'ghost' ? '👻 幽靈' : h(p.players.find(x => x.id === debugSelected.id)?.name || '玩家')} → 點格子傳送` : '尚未選擇傳送目標'}</p>`;
  }

  // -------------------------------------------------------------------------
  // HUD / 憑證 / 回合鎖
  // -------------------------------------------------------------------------
  function ensureHud(p) {
    if (!p) return;
    const side = $('.side-stack');
    if (!side) return;
    let hud = $('#party-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'party-hud';
      hud.className = 'panel party-hud';
      side.insertBefore(hud, side.firstChild);
    }
    const ext = p.ext || {};
    const mode = window.__partyData?.GAME_MODES?.[ext.mode] || { icon: '🌟', name: '企業之星', win: '' };
    const certs = (ext.certificates || []).filter(c => !c.resolved);
    const domain = ext.domain;
    const domainOwner = domain ? p.players.find(x => x.id === domain.ownerId) : null;
    const domainTiles = domainOwner ? [-1, 0, 1].map(d => (domainOwner.position + d + p.board.length) % p.board.length) : [];
    hud.innerHTML = `<div class="hud-mode ${ext.mode}"><span>${mode.icon} ${h(mode.name)}</span><small>第 ${p.round} / ${p.maxRounds} 季${p.round >= p.maxRounds ? ' · 最終季' : ''}</small></div>
      <div class="hud-pills">
        ${ext.mode === 'star' ? `<span class="hud-pill star">⭐ 星價 ${money(ext.starPrice)}</span><span class="hud-pill">已賣 ${ext.starSold || 0} 顆</span>` : ''}
        ${ext.mode === 'tycoon' ? `<span class="hud-pill ${ext.inflation >= 2 ? 'danger' : ''}">${ext.inflation >= 4 ? '🚨 通膨 ×4' : ext.inflation >= 2 ? '⚠️ 通膨 ×2' : '🌤 平穩期'}</span><span class="hud-pill">目標 ${money(ext.target)}</span>` : ''}
        ${ext.mode === 'evil' ? `<span class="hud-pill danger">💀 保護費 ${money(ext.doomPrice)}</span><span class="hud-pill">毀滅日 ${Math.max(1, ext.doomEvery - ((p.round - 1) % ext.doomEvery))} 季後</span>` : ''}
        ${ext.suddenDeath ? '<span class="hud-pill danger">⚡ 驟死賽</span>' : ''}
        ${p.net ? `<span class="hud-pill">🌐 ${h(p.net.roomCode)}</span>` : ''}
      </div>
      ${certs.length ? `<div class="cert-box"><div class="cert-head"><span>📈 股票憑證</span><small>季末結算</small></div>${certs.map(c => { const pl = p.players.find(x => x.id === c.playerId); return `<div class="cert-row"><span>${h(pl?.name || '')}</span><strong>${money(c.principal)}</strong></div>`; }).join('')}</div>` : ''}
      ${domain ? `<div class="domain-box">🌐 弱者的領域：第 ${domainTiles.join('、')} 格（${h(domainOwner?.name || '')}，跟隨移動）</div>` : ''}
      ${ext.vector ? `<div class="domain-box vector">⬆️ 矢量操作：回合結束拖到第 ${ext.vector.destination ?? '?'} 格</div>` : ''}
    `;
  }

  function clearTurnLock() {
    document.body.classList.remove('spectator-mode');
    const overlay = $('#spectator-note');
    if (overlay) overlay.hidden = true;
  }

  function lockForeignTurn(p) {
    if (!p?.net) return;
    const mine = window.PartyNet?.canAct(p);
    const ownerId = specialOwnerId(p) || p.players[p.turnIndex]?.id || null;
    const ownerLocal = isLocalOwner(p, ownerId);
    const waiting = p.status === 'playing' && (hasSpecialOffer(p) ? !ownerLocal : !mine);
    document.body.classList.toggle('spectator-mode', p.status === 'playing' && (!mine || (hasSpecialOffer(p) && !ownerLocal)));
    $$('#turn-content [data-action]').forEach(btn => {
      if (['open-settlement', 'new-game'].includes(btn.dataset.action)) return;
      if (!mine) btn.disabled = true;
    });
    let overlay = $('#spectator-note');
    if (waiting) {
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'spectator-note';
        document.body.appendChild(overlay);
      }
      const ownerName = playerName(p, ownerId) || window.PartyNet?.ownerName(p) || '其他玩家';
      overlay.innerHTML = `👀 等待 <strong>${h(ownerName)}</strong> 決定中...`;
      overlay.hidden = false;
    } else if (overlay) {
      overlay.hidden = true;
    }
  }

  // -------------------------------------------------------------------------
  // 結算
  // -------------------------------------------------------------------------
  function hideSettlement() { const el = $('#settlement-overlay'); if (el) el.hidden = true; }
  function chart(series, { width = 660, height = 220, unit = '', rounds = [] } = {}) {
    const all = series.flatMap(s => s.values);
    const max = Math.max(1, ...all), min = Math.min(0, ...all);
    const pad = { l: 52, r: 18, t: 18, b: 30 };
    const w = width - pad.l - pad.r, hgt = height - pad.t - pad.b;
    const n = Math.max(1, series[0]?.values.length - 1);
    const x = i => pad.l + (n === 0 ? w / 2 : (i / n) * w);
    const y = v => pad.t + hgt - ((v - min) / Math.max(1, max - min)) * hgt;
    const grid = [0, 0.25, 0.5, 0.75, 1].map(t => {
      const val = min + (max - min) * t;
      return `<line x1="${pad.l}" y1="${y(val)}" x2="${width - pad.r}" y2="${y(val)}" class="chart-grid"/><text x="${pad.l - 8}" y="${y(val) + 4}" text-anchor="end" class="chart-axis">${Math.round(val).toLocaleString()}</text>`;
    }).join('');
    const lines = series.map((s, si) => {
      const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
      return `<polyline points="${pts}" fill="none" stroke="${s.color || colors[si % colors.length]}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>${s.values.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3.2" fill="${s.color || colors[si % colors.length]}"><title>${h(s.name)} · 第 ${rounds[i] ?? i} 季：${v.toLocaleString()}${unit}</title></circle>`).join('')}`;
    }).join('');
    const xLabels = (series[0]?.values || []).map((_, i) => `<text x="${x(i)}" y="${height - 8}" text-anchor="middle" class="chart-axis">${rounds[i] ?? i}</text>`).join('');
    return `<svg viewBox="0 0 ${width} ${height}" class="line-chart" role="img"><g>${grid}</g><g>${lines}</g><g>${xLabels}</g></svg>`;
  }
  function legend(series) {
    return `<div class="chart-legend">${series.map((s, i) => `<span><i style="background:${s.color || colors[i % colors.length]}"></i>${h(shorten(s.name))}</span>`).join('')}</div>`;
  }

  function openSettlement(p) {
    ensureRoot();
    const el = $('#settlement-overlay');
    if (!el || !p) return;
    if (Date.now() < settlementLockUntil) { app()?.notify('毀滅日雷射播放中，請稍候…'); return; }
    const data = window.__partyEngine?.extSettlementData?.(p) || null;
    if (!data) return;
    data.cash.forEach((s, i) => s.color = colors[i % colors.length]);
    data.stars.forEach((s, i) => s.color = colors[i % colors.length]);
    const winners = data.winners.map(x => x.name).join('、') || '無人';
    const tabs = [['cash', '總資產']];
    if (data.mode?.id === 'star') tabs.push(['stars', '星數排行']);
    if (data.mode?.id === 'evil') tabs.push(['survival', '生還季數']);
    tabs.push(['items', '道具明細']);
    const tabButtons = tabs.map(([id, label], i) => `<button data-settle-tab="${id}" class="${i === 0 ? 'active' : ''}" type="button">${label}</button>`).join('');
    el.hidden = false;
    el.innerHTML = `<div class="ext-modal-backdrop"></div>
      <div class="settlement-card">
        <button class="ext-modal-close" data-settle-close type="button">×</button>
        <div class="settle-head"><div><p class="ext-kicker">FINAL SETTLEMENT · ${h(data.mode.name)}</p><h2>${h(data.title)}</h2>${data.subtitle ? `<p class="settle-subtitle">${h(data.subtitle)}</p>` : ''}<p>${data.subtitle ? `共 ${data.rounds.length} 個紀錄點` : `${h(winners)} 獲勝 · 共 ${data.rounds.length} 個紀錄點`}</p></div><span class="settle-trophy">🏆</span></div>
        <div class="settle-tabs">${tabButtons}</div>
        <div class="settle-body"></div>
        <div class="settle-footer">
          ${p.net ? `<div id="confirm-ratio" class="confirm-ratio">等待全員確認…</div>` : ''}
          <div class="settle-actions">${p.net ? `<button class="primary" id="confirm-result" type="button">確認結果</button>` : `<button class="primary" data-settle-close type="button">關閉</button>`}</div>
        </div>
      </div>`;
    const body = el.querySelector('.settle-body');
    const itemRows = [...data.itemTotals].sort((a, b) => b.total - a.total).flatMap(s => {
      const list = s.details?.length ? s.details : [{ name: '（未獲得道具）', count: 0 }];
      return list.map((d, i) => `<tr>${i === 0 ? `<td rowspan="${list.length}" class="item-player"><strong>${h(shorten(s.name, 8))}</strong><small>共 ${s.total} 件</small></td>` : ''}<td>${h(d.name)}</td><td>${d.count}</td></tr>`);
    }).join('');
    const renderTab = tab => {
      el.querySelectorAll('[data-settle-tab]').forEach(b => b.classList.toggle('active', b.dataset.settleTab === tab));
      if (tab === 'cash') body.innerHTML = `<div class="chart-wrap">${chart(data.cash, { rounds: data.rounds })}</div>${legend(data.cash)}<p class="chart-note">X 軸：季數　Y 軸：總資產</p>`;
      else if (tab === 'stars') body.innerHTML = `<div class="chart-wrap">${chart(data.stars, { rounds: data.rounds })}</div>${legend(data.stars)}<p class="chart-note">X 軸：季數　Y 軸：星數</p>`;
      else if (tab === 'survival') body.innerHTML = `<div class="rank-list">${[...data.survival].sort((a, b) => Number(b.alive) - Number(a.alive) || b.seasons - a.seasons).map((s, i) => `<div class="rank-row ${s.alive ? 'alive' : 'out'}"><span>${i + 1}</span><strong>${h(shorten(s.name, 8))}</strong><em>${s.seasons} 季</em><small>${s.alive ? '存活' : '👻 罷工團'}</small></div>`).join('')}</div>`;
      else body.innerHTML = `<table class="item-table item-detail-table"><thead><tr><th>玩家</th><th>道具名稱</th><th>獲得次數</th></tr></thead><tbody>${itemRows}</tbody></table><p class="chart-note">依玩家道具獲取總量排序；神話與普通道具合併計算。</p>`;
    };
    renderTab(tabs[0][0]);
    el.querySelectorAll('[data-settle-tab]').forEach(b => b.onclick = () => { renderTab(b.dataset.settleTab); sound('click'); });
    el.querySelectorAll('[data-settle-close]').forEach(b => b.onclick = () => hideSettlement());
    const confirm = el.querySelector('#confirm-result');
    if (confirm) confirm.onclick = () => {
      const res = window.PartyNet.confirmResult(window.PartyNet.myPlayerId);
      confirm.disabled = true;
      confirm.textContent = '已確認';
      if (res) updateConfirm(res);
      else updateConfirm({ confirmed: null, total: p.players.length });
    };
    if (p.net && window.PartyNet.lobby?.confirmRatio) updateConfirm(window.PartyNet.lobby.confirmRatio);
    sound('slide');
  }
  function updateConfirm(ratio) {
    const el = $('#confirm-ratio');
    if (!el || !ratio) return;
    if (ratio.confirmed == null) el.textContent = `已送出確認，等待其他玩家…（共 ${ratio.total} 人）`;
    else el.textContent = `等待確認比例 ${ratio.confirmed}/${ratio.total}`;
  }

  // -------------------------------------------------------------------------
  // 繪製後掛載
  // -------------------------------------------------------------------------
  function afterRender(p) {
    ensureRoot();
    if (!p || !app()) return;
    const recentAt = at => {
      const t = Number(at);
      return Number.isFinite(t) && t > 0 && Date.now() - t <= 8000;
    };
    ensureHud(p);
    ensureDebugPanel(p);
    document.body.classList.toggle('debug-mode', Boolean(p.ext?.debug));
    lockForeignTurn(p);
    const net = window.PartyNet;
    if (net?.active && net.lobby && net.lobby.status !== 'playing') showLobby(net.lobby);
    const subsidy = p.cornerSubsidyEvent;
    const subsidyKey = subsidy?.at ? `${subsidy.playerId}:${subsidy.at}` : '';
    if (subsidyKey && subsidyKey !== lastCornerSubsidyKey) {
      lastCornerSubsidyKey = subsidyKey;
      flashCornerSubsidy(subsidy);
    }
    const investment = app()?.visibleInvestmentSettlement?.(p.ext?.investmentSettlement);
    const investmentKey = investment?.at ? `${investment.round}:${investment.at}` : '';
    if (!investmentKey && lastInvestmentSettlementKey) {
      lastInvestmentSettlementKey = '';
      investmentSoundTimers.forEach(t => clearTimeout(t));
      investmentSoundTimers = [];
    }
    if (investmentKey && investmentKey !== lastInvestmentSettlementKey) {
      lastInvestmentSettlementKey = investmentKey;
      investmentSoundTimers.forEach(t => clearTimeout(t));
      investmentSoundTimers = [];
      const soundByMarket = { '大牛市': 'marketBull', '平穩期': 'marketStable', '龐氏騙局': 'marketPonzi' };
      [...new Set((investment.results || []).map(result => result.label))].forEach((market, index) => {
        const soundName = soundByMarket[market];
        if (soundName) investmentSoundTimers.push(setTimeout(() => sound(soundName), index * 260));
      });
      investmentSoundTimers.push(setTimeout(() => app()?.dismissInvestmentSettlement?.(investmentKey), 12000));
    }
    const ev = p.ext?.lastEvent;
    if (ev?.at && `${ev.type}:${ev.at}` !== lastEventKey) {
      lastEventKey = `${ev.type}:${ev.at}`;
      if (ev.type === 'inflation') flashInflation(ev.stage);
      else if (ev.type === 'doom') flashDoom(ev);
      else if (ev.type === 'suddenDeath') flashSuddenDeath(ev);
      else if (ev.type === 'witch') flashWitch();
      else if (ev.type === 'domainHit') flashDomainHit(ev);
      else if (ev.type === 'iceMushroom') { if (recentAt(ev.at)) flashFrozen(ev); }
      else if (ev.type === 'bankai') { if (recentAt(ev.at)) flashBankai(); }
      else if (ev.type === 'bankrupt') { if (recentAt(ev.at)) flashBankrupt(ev); }
      else if (ev.type === 'ghostStrike' && !net?.active) { if (recentAt(ev.at)) flashGhostInterference(ev); }
    }
    const totem = p.ext?.totemEvent;
    if (totem?.at && String(totem.at) !== lastTotemKey) {
      lastTotemKey = String(totem.at);
      if (recentAt(totem.at)) flashTotem(totem);
    }
    const indulgence = p.ext?.indulgenceEvent;
    if (indulgence?.at && String(indulgence.at) !== lastIndulgenceKey) {
      lastIndulgenceKey = String(indulgence.at);
      if (recentAt(indulgence.at)) flashIndulgence(indulgence);
    }
    const vectorPending = p.ext?.vectorPending;
    if (vectorPending?.at && String(vectorPending.at) !== lastVectorPendingKey) {
      lastVectorPendingKey = String(vectorPending.at);
      beginVectorLock(vectorPending);
    }
    const vector = p.ext?.vectorEvent;
    if (vector?.at && String(vector.at) !== lastVectorKey) {
      lastVectorKey = String(vector.at);
      if (recentAt(vector.at)) flashVector(vector);
    }
    const pendingVictory = p.ext?.pendingVictory;
    if (pendingVictory?.at) {
      const key = `${pendingVictory.round}:${(pendingVictory.playerIds || []).join(',')}:${pendingVictory.at}`;
      if (key !== lastVictoryKey) {
        lastVictoryKey = key;
        if (recentAt(pendingVictory.at)) {
          flashVictoryPending({
            ...pendingVictory,
            text: `${(pendingVictory.names || []).join('、')}已達標，本季將進行結算`
          });
        }
      }
    }
    if (p.pendingDecision) {
      const key = `${p.sync?.gameId || ''}:${p.round}:${p.turnIndex}:${p.pendingDecision.playerId}:${p.pendingDecision.scenarioId || p.pendingDecision.kind}`;
      if (key !== decisionGateKey) {
        decisionGateKey = key;
        decisionGateUntil = Date.now() + 1000;
        clearTimeout(decisionTimer);
        decisionTimer = setTimeout(() => {
          if (state()?.pendingDecision) app()?.render?.();
        }, 1080);
      }
    }
    if (p.status !== 'playing') {
      const key = `${p.sync?.gameId || ''}:${p.round}:${p.winnerIds?.join(',')}`;
      if (key !== lastFinishKey) {
        lastFinishKey = key;
        const ending = playEnding(p);
        // 毀滅日雷射至少完整播放，才允許開啟結算；星／首富結局動畫播放完再進結算。
        const doomDelay = Math.max(0, settlementLockUntil - Date.now());
        const delay = Math.max(ending ? 3200 : 0, doomDelay, 900);
        setTimeout(() => { if (state()?.status !== 'playing') openSettlement(state()); }, delay);
      }
    }
    if (p.round >= p.maxRounds && lastFinalRound !== p.round) {
      lastFinalRound = p.round;
      if (p.status === 'playing') {
        flashFinalSeason(p.round, p.maxRounds);
        document.querySelector('#round-badge')?.classList.add('final-season');
      }
    }
    if (p.ext?.suddenDeathEvent && !p.ext._suddenShown) {
      // 事件只顯示一次；以 lastEventKey 控制即可，這裡保留給舊存檔。
    }
    const settle = $('#settlement-overlay');
    if (settle && !settle.hidden && window.PartyNet?.lobby?.confirmRatio) updateConfirm(window.PartyNet.lobby.confirmRatio);
    afterSpecialChange();
    const wheel = p.ext?.wheelPending;
    if (wheel?.at && String(wheel.at) !== lastWheelKey) {
      lastWheelKey = String(wheel.at);
      showWheel(wheel);
    }
  }

  // -------------------------------------------------------------------------
  // 事件委派
  // -------------------------------------------------------------------------
  function bindEvents() {
    document.addEventListener('click', e => {
      const p = state();
      const fateStep = e.target.closest('[data-fate-step]');
      if (fateStep) {
        const value = Number(fateStep.dataset.fateStep);
        closeExtModal();
        app()?.fateDiceRoll?.(value);
        return;
      }
      const specialBtn = e.target.closest('[data-auction],[data-invest],[data-tax],[data-insider],[data-star-offer],[data-replace-kind],[data-replace-drop],[data-replace-drop-confirm],[data-replace-back]');
      if (specialBtn && p && hasSpecialOffer(p) && !isLocalOwner(p, specialOwnerId(p))) {
        app()?.notify('現在不是你的決策，請等待目前玩家完成。');
        return;
      }

      // 事件格專屬提示
      const eventOk = e.target.closest('[data-event-ok]');
      if (eventOk) {
        try {
          app().runAction({type:'CLEAR_EVENT_PROMPT'}, () => {
            if (window.__partyEngine?.extClearEventPrompt) window.__partyEngine.extClearEventPrompt(p);
            else if (p?.ext) p.ext.eventPrompt = null;
          });
          closeExtModal();
          eventPromptKey = '';
          sound('click');
        } catch (err) { app()?.notify(err.message); sound('error'); }
        return;
      }

      // 起點買星
      const starOffer = e.target.closest('[data-star-offer]');
      if (starOffer) {
        const offer = p?.ext?.starOffer;
        if (!offer) return;
        const buy = starOffer.dataset.starOffer === 'buy';
        try {
          if (buy) {
            app().runAction({type:'STAR_OFFER',buy:true}, () => {
              const stars = window.__partyEngine.extBuyStar(p);
              sound('star');
              app()?.notify(`買到第 ${stars} 顆星！`);
            });
          } else {
            app().runAction({type:'STAR_OFFER',buy:false}, () => { window.__partyEngine.extSkipStarOffer(p); sound('click'); });
          }
          closeExtModal();
        } catch (err) { app()?.notify(err.message); sound('error'); }
        return;
      }

      // 黑市滿包：替換或丟棄新道具
      const replaceSlot = e.target.closest('[data-replace-kind]');
      if (replaceSlot) {
        const kind = replaceSlot.dataset.replaceKind;
        const index = Number(replaceSlot.dataset.replaceIndex);
        try {
          app().runAction({type:'REPLACE_ITEM',kind,index}, () => { window.__partyEngine.extResolveReplace(p, { kind, index }); });
          closeExtModal();
          sound('coin');
        } catch (err) { app()?.notify(err.message); sound('error'); }
        return;
      }
      if (e.target.closest('[data-replace-drop]')) {
        replaceDropConfirm = true;
        openReplaceOffer(p);
        sound('click');
        return;
      }
      if (e.target.closest('[data-replace-back]')) {
        replaceDropConfirm = false;
        openReplaceOffer(p);
        sound('click');
        return;
      }
      if (e.target.closest('[data-replace-drop-confirm]')) {
        try {
          app().runAction({type:'REPLACE_ITEM',dropNew:true}, () => { window.__partyEngine.extResolveReplace(p, { dropNew: true }); });
          closeExtModal();
          sound('ghost');
        } catch (err) { app()?.notify(err.message); sound('error'); }
        return;
      }

      // 擴充 modal 按鈕
      const auction = e.target.closest('[data-auction]');
      if (auction) {
        const a = p?.ext?.auction;
        if (!a) return;
        const action = auction.dataset.auction;
        try {
          // 拍賣採「目前出價者」狀態，僅本人可操作；輪值由引擎推進。
          const current = window.__partyEngine?.extAuctionCurrent?.(p);
          if (current && window.PartyNet?.active && window.PartyNet.myPlayerId && current.id !== window.PartyNet.myPlayerId) {
            app()?.notify(`現在由 ${current.name} 決定，請稍候。`);
            return;
          }
          app().runAction({type:'AUCTION_ACTION',action}, () => { window.__partyEngine.extAuctionAction(p, action); }, { allowAuction: true });
          sound(action === 'bid' ? 'coin' : 'click');
        } catch (err) { app()?.notify(err.message); sound('error'); }
        return;
      }
      const invest = e.target.closest('[data-invest]');
      if (invest) {
        app().runAction({type:'INVEST',yes:invest.dataset.invest === 'yes'}, () => { window.__partyEngine.extInvest(p, invest.dataset.invest === 'yes'); });
        closeExtModal(); sound('slide');
        return;
      }
      const tax = e.target.closest('[data-tax]');
      if (tax) {
        const action = tax.dataset.tax;
        app().runAction({type:'TAX',action}, () => { action === 'pay' ? window.__partyEngine.extTaxPay(p) : window.__partyEngine.extTaxDetain(p); });
        closeExtModal();
        sound(action === 'pay' ? 'coin' : 'cuff');
        return;
      }
      const insider = e.target.closest('[data-insider]');
      if (insider) {
        if (insider.dataset.insider !== 'yes') { app().runAction({type:'INSIDER',yes:false}, () => { p.ext.insiderOffer = null; }); closeExtModal(); return; }
        app().runAction({type:'INSIDER',yes:true}, () => { window.__partyEngine.extInsiderPay(p); });
        closeExtModal();
        sound('wheel');
        return;
      }
      const truth = e.target.closest('[data-truth]');
      if (truth) {
        const act = truth.dataset.truth;
        if (act === 'close') { closeExtModal(); return; }
        if (act === 'buy') {
          const sel = $('#truth-buy');
          const itemId = sel?.value;
          if (!itemId) { app()?.notify('沒有可煉成的道具。'); return; }
          app().runAction({type:'TRUTH_GATE',payload:{mode:'buy',itemId,mythic:false}}, () => { window.__partyEngine.extUseMythic(p, 'truthGate', { mode: 'buy', itemId, mythic: false }); });
        } else if (act === 'sell') {
          const val = $('#truth-sell').value || '';
          const [kind, index] = val.split(':');
          app().runAction({type:'TRUTH_GATE',payload:{mode:'sell',kind,index:Number(index)}}, () => { window.__partyEngine.extUseMythic(p, 'truthGate', { mode: 'sell', kind, index: Number(index) }); });
        }
        closeExtModal(); sound('star');
        return;
      }
      const give = e.target.closest('[data-give-id]');
      if (give) {
        app().debugGive(give.dataset.giveKind, give.dataset.giveId);
        closeExtModal(); sound('coin');
        return;
      }
      const pick = e.target.closest('[data-pick-tile]');
      if (pick) {
        const idx = Number(pick.dataset.pickTile);
        const cb = tilePick?.callback;
        closeExtModal();
        if (cb) cb(idx);
        return;
      }
      const dbg = e.target.closest('[data-debug-action]');
      if (dbg) {
        const act = dbg.dataset.debugAction;
        if (act === 'add') openDebugItemPicker('all');
        else if (act === 'item') openDebugItemPicker('normal');
        else if (act === 'mythic') openDebugItemPicker('mythic');
        else if (act === 'end-turn') { closeExtModal(); app()?.debugEndTurn?.(); }
        return;
      }
      const empty = e.target.closest('[data-empty-slot]');
      if (empty && p?.ext?.debug) {
        openDebugItemPicker('all');
        return;
      }
      const extClose = e.target.closest('.ext-modal-close, [data-ext-close]');
      if (extClose && e.target.closest('#ext-modal')) {
        const el = $('#ext-modal');
        if (['auction', 'decision', 'tax', 'invest', 'insider', 'star', 'replace', 'event'].includes(el?.dataset.type)) { app()?.notify('請先完成目前事件。'); return; }
        closeExtModal(); return;
      }

      // 除錯傳送：先選玩家 / 幽靈，再點格子
      if (p?.ext?.debug && app()?.page === 'game') {
        if (app()?.isMapPicking?.()) return;
        const token = e.target.closest('#board .token[data-player-id]');
        if (token) { debugSelected = { type: 'player', id: token.dataset.playerId }; ensureDebugPanel(state()); app()?.notify('已選取玩家，請點擊目的地格子。'); return; }
        const ghostPiece = e.target.closest('#board .ghost-piece');
        if (ghostPiece) { debugSelected = { type: 'ghost' }; ensureDebugPanel(state()); app()?.notify('已選取幽靈，請點擊目的地格子。'); return; }
        const tile = e.target.closest('#board [data-tile-index]');
        if (tile && debugSelected) {
          const idx = Number(tile.dataset.tileIndex);
          if (debugSelected.type === 'ghost') app().debugGhostTo(idx);
          else app().debugTeleport(debugSelected.id, idx);
          debugSelected = null;
          ensureDebugPanel(state());
          return;
        }
      }
    });

    document.addEventListener('click', e => {
      // 大廳/連線/結算關閉
      if (e.target.closest('[data-settle-close]')) hideSettlement();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const el = $('#ext-modal');
        if (el && !el.hidden && !['auction', 'invest', 'tax', 'insider', 'star', 'replace', 'event'].includes(el.dataset.type)) closeExtModal();
      }
    });
  }

  function init() {
    ensureRoot();
    bindEvents();
    renderSetupExtras();
    // 掃 QR Code 進來的網址帶有 ?room=代碼：直接打開加入視窗並填好代碼，再把網址清乾淨。
    const invited = roomCodeFromLink(location.href);
    if (invited && !window.PartyNet?.active) {
      openConnect('join', invited);
      try { const url = new URL(location.href); url.searchParams.delete('room'); history.replaceState(history.state, '', url.href); } catch { }
    }
    // 將模式資料提供給動態 UI
    window.__partyData = window.__partyData || {
      GAME_MODES: {
        star: { id: 'star', name: '企業之星', icon: '🌟', desc: '出發格買星 500 起，每賣出一顆全場星價 +500，還能溢價強買。', defaultRounds: 10, defaultTarget: 3, win: '先拿 3 星；季末比較星數。', cup: '企業之星盃' },
        tycoon: { id: 'tycoon', name: '首富競爭', icon: '💰', desc: '總資產 8,000 獲勝。季數過半通膨 2 倍，倒數兩季 4 倍。', defaultRounds: 12, defaultTarget: 8000, win: '總資產率先達到 8,000。', cup: '首富競爭盃' },
        evil: { id: 'evil', name: '邪惡企業', icon: '💀', desc: '每 5 季毀滅日收保護費，付不出來就變成藍色幽靈。', defaultRounds: 15, defaultTarget: 0, win: '成為唯一的倖存者。', cup: '邪惡企業盃' },
        random: { id: 'random', name: '隨機模式', icon: '🎲', desc: '開局隨機抽出三種模式之一。', defaultRounds: 12, defaultTarget: 0, win: '依抽到的模式決定。', cup: '命運隨機盃' }
      }
    };
  }

  return {
    init, renderSetupExtras, showLobby, hideLobby, onGameStart, afterRender,
    openJoin: (code, name) => openConnect('join', code, name),
    openSettlement, hideSettlement, openTilePicker, openTruthGate, openWheel: showWheel, openFateDice,
    closeExtModal, openDebugItemPicker, updateConfirm, clearTurnLock,
    playGhostInterference: flashGhostInterference, playSkillCue,
    flashCornerSubsidy,
    decisionBlocked, flashFrozen
  };
})();

globalThis.PartyUI = PartyUI;
