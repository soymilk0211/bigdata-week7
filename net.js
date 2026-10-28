// 多人房間 / PeerJS P2P 連線層

// ---- 5 碼房間代碼 ----------------------------------------------------------
// 房主用「前綴 + 5 碼」向 PeerJS 配對伺服器登記，畫面上只顯示 5 碼（去掉容易看錯的 0/O/1/I）。
// 改了房間訊息或對局格式時，把前綴的版本號往上加，新舊版本就進不了同一個房間。
export const ROOM_PREFIX = 'econparty-v1-';
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function makeRoomCode(random = Math.random) {
  let code = '';
  for (let i = 0; i < 5; i++) code += ROOM_ALPHABET[Math.floor(random() * ROOM_ALPHABET.length)];
  return code;
}
// 使用者輸入的代碼：去掉空白和連字號、轉大寫；不是 5 碼時回傳空字串。
export function normalizeRoomCode(input) {
  const code = String(input ?? '').replace(/[\s-]/g, '').toUpperCase();
  return code.length === 5 && [...code].every(c => ROOM_ALPHABET.includes(c)) ? code : '';
}
export const roomPeerId = code => ROOM_PREFIX + code;

export const PartyNet = (() => {
  const rid = () => (globalThis.crypto?.randomUUID?.() || `p-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  // 客機每 3 秒送一次 ping；房主 12 秒沒收到任何訊息就把該玩家標成「已離線」（手機鎖螢幕或直接關頁時 PeerJS 常常不會發出 close）。
  const PING_MS = 3000;
  const OFFLINE_MS = 12000;
  const MAX_PLAYERS = 8;
  const cleanName = (name, fallback) => String(name ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 16) || fallback;
  const isOnline = p => p.host || p.connected !== false;

  class Net {
    constructor() {
      this.code = '';
      this.peerId = '';
      this.hostId = '';
      this.host = false;
      this.name = '';
      this.lobby = null;
      this.active = false;
      this.connectedPeers = new Set();
      this.peers = new Map();
      this.seen = new Set();
      this.lastSeen = new Map();
      this._peer = null;
      this._beat = null;
      this._lastBeat = 0;
      this.onLobby = null;
      this.onStart = null;
      this.onState = null;
      this.onAction = null;
      this.onEvent = null;
      this.onReturnLobby = null;
      this.onStatus = null;
      this.onError = null;
      this.onHostLost = null;
    }

    get isHost() { return this.host; }
    get isClient() { return this.active && !this.host; }
    get myIndex() { return this.lobby?.players?.findIndex(p => p.peerId === this.peerId) ?? -1; }
    get myPlayerId() { const i = this.myIndex; return i >= 0 ? `player-${i + 1}` : null; }
    get myPlayer() { return this.lobby?.players?.[this.myIndex] || null; }

    status(text) { try { this.onStatus?.(text); } catch { } }
    error(text) { try { this.onError?.(text); } catch { } }

    createRoom({ name, roleId = 'random' } = {}) {
      this.leave(false);
      const PeerConstructor = globalThis.Peer;
      if (typeof PeerConstructor !== 'function') throw Error('PeerJS 尚未載入，請確認網路連線後重新整理。');
      this.host = true;
      this.active = true;
      this.name = cleanName(name, '房主');
      this.lobby = {
        code: '', hostId: '', status: 'waiting', mode: 'star', rounds: 10, target: 0,
        starGoal: 3, doomEvery: 5, doomPrice: 1000, doomStep: 500, debug: false,
        confirms: [], createdAt: Date.now(),
        players: []
      };
      this.openHostPeer(PeerConstructor, roleId, 0);
      this.emitLobby();
      this.status('正在建立 PeerJS 房間…');
      return this.lobby;
    }

    // 用新的 5 碼登記；代碼剛好被別的房間用走（unavailable-id）就換一個再試。
    openHostPeer(PeerConstructor, roleId, attempt) {
      const code = makeRoomCode();
      const peer = new PeerConstructor(roomPeerId(code));
      this._peer = peer;
      let opened = false;
      peer.on('open', peerId => {
        if (!this.active || this._peer !== peer) return;
        opened = true;
        this.peerId = peerId;
        this.hostId = peerId;
        this.code = code;
        this.lobby.code = code;
        this.lobby.hostId = peerId;
        this.lobby.players = [{ peerId, name: this.name, roleId, host: true, connected: true }];
        this.emitLobby();
        this.broadcastLobby();
        this.startBeat();
        this.status(`房間 ${this.code} 已建立，等待玩家加入。`);
      });
      peer.on('connection', conn => this.wireConnection(conn));
      peer.on('error', error => {
        if (this._peer !== peer) return;
        if (error?.type === 'unavailable-id' && !opened && attempt < 5) {
          try { peer.destroy(); } catch { }
          this.openHostPeer(PeerConstructor, roleId, attempt + 1);
          return;
        }
        this.error(error?.message || 'PeerJS 連線錯誤');
      });
    }

    joinRoom(code, name) {
      this.leave(false);
      // 5 碼代碼轉成房主登記的 ID；不是 5 碼時當成完整的 Peer ID（舊的連結）。
      const shortCode = normalizeRoomCode(code);
      this.code = shortCode || String(code || '').trim();
      if (!this.code || this.code.length > 128) throw Error('請輸入 5 碼房間代碼。');
      const PeerConstructor = globalThis.Peer;
      if (typeof PeerConstructor !== 'function') throw Error('PeerJS 尚未載入，請確認網路連線後重新整理。');
      this.host = false;
      this.hostId = shortCode ? roomPeerId(shortCode) : this.code;
      this.active = true;
      this.name = cleanName(name, '玩家');
      this.lobby = {
        code: this.code, hostId: this.hostId, status: 'waiting', mode: 'star', rounds: 10, target: 0,
        starGoal: 3, doomEvery: 5, doomPrice: 1000, doomStep: 500, debug: false,
        confirms: [], players: [{ peerId: this.peerId, name: this.name, roleId: 'random', connected: true }]
      };
      const peer = new PeerConstructor();
      this._peer = peer;
      peer.on('open', peerId => {
        if (!this.active || this._peer !== peer) return;
        this.peerId = peerId;
        this.lobby.players[0].peerId = peerId;
        this.wireConnection(peer.connect(this.hostId));
      });
      peer.on('error', error => {
        if (this._peer !== peer) return;
        // 找不到房間：回到加入畫面（代碼和名字留著），不要停在空的大廳。
        if (error?.type === 'peer-unavailable' && !this.peers.get(this.hostId)?.conn?.open) {
          const code = this.code, name = this.name;
          this.leave();
          this.error('找不到這個房間：請確認 5 碼代碼，並請房主把遊戲頁面開在最前面（重新整理會換代碼）。');
          this.onHostLost?.(code, name);
          return;
        }
        this.error(error?.message || 'PeerJS 連線錯誤');
      });
      this.emitLobby();
      this.status(`正在加入房間 ${this.code}…`);
      return this.lobby;
    }

    leave(notify = true) {
      // 先告訴對方：客機離開大廳，或房主關閉房間（直接斷線時對方可能很久才發現）。
      if (this.active) this.sendData({ t: this.host ? 'closed' : 'leave' }, this.host ? 'all' : this.hostId);
      this.active = false;
      clearInterval(this._beat);
      this._beat = null;
      for (const rec of this.peers.values()) { try { rec.conn?.close(); } catch { } }
      try { this._peer?.destroy(); } catch { }
      this.peers.clear();
      this.connectedPeers.clear();
      this.lastSeen.clear();
      this._peer = null;
      this.host = false;
      this.code = '';
      this.hostId = '';
      this.lobby = null;
      this.seen.clear();
      if (notify) this.emitLobby();
    }

    wireConnection(conn) {
        if (!conn?.peer) return;
        const peerId = conn.peer;
        this.peers.set(peerId, { conn });
        const current = () => this.active && this.peers.get(peerId)?.conn === conn;
        conn.on('open', () => {
          if (!current()) return;
          this.connectedPeers.add(peerId);
          this.lastSeen.set(peerId, Date.now());
          if (this.host) {
            const player = this.lobby?.players.find(entry => entry.peerId === peerId);
            if (player) player.connected = true;
            conn.send({ type: 'SYSTEM', message: '連線成功' });
            this.broadcastLobby();
            this.status(`${peerId} 已連線。`);
          } else {
            this.sendData({ t: 'hello', name: this.name }, this.hostId);
            this.startBeat();
            this.status('PeerJS 已連線。');
          }
        });
        conn.on('data', data => {
          if (!current()) return;
          this.heard(peerId);
          let message = data;
          if (typeof message === 'string') {
            try { message = JSON.parse(message); } catch { return; }
          }
          if (message?.type === 'SYSTEM') {
            console.log(message.message);
            return;
          }
          this.handleData(message, peerId);
        });
        conn.on('close', () => {
          if (!current()) return;
          this.connectedPeers.delete(peerId);
          this.peers.delete(peerId);
          this.lastSeen.delete(peerId);
          if (this.host) this.playerGone(peerId);
          else if (peerId === this.hostId) this.hostGone();
        });
        conn.on('error', error => this.error(error?.message || 'PeerJS 資料連線錯誤'));
    }

    addPlayer(peerId, name) {
      if (!this.host || !this.lobby) return;
      let player = this.lobby.players.find(p => p.peerId === peerId);
      if (!player) {
        if (this.lobby.status !== 'waiting') { this.refuse(peerId, '對局已開始，暫時無法加入。'); return; }
        if (this.lobby.players.length >= MAX_PLAYERS) { this.refuse(peerId, `房間已滿（最多 ${MAX_PLAYERS} 人）。`); return; }
        player = { peerId, name: this.uniqueName(cleanName(name, '玩家'), peerId), roleId: 'random', host: false, connected: true };
        this.lobby.players.push(player);
      } else if (name) player.name = this.uniqueName(cleanName(name, player.name), peerId);
      this.emitLobby();
    }

    // 名字重複時加上編號（開局時名字不能重複）。
    uniqueName(name, peerId) {
      const taken = new Set((this.lobby?.players || []).filter(p => p.peerId !== peerId).map(p => p.name));
      if (!taken.has(name)) return name;
      for (let n = 2; ; n++) {
        const next = `${name.slice(0, 13)} ${n}`;
        if (!taken.has(next)) return next;
      }
    }

    // 房主拒絕加入：通知對方後不再廣播給他，對方收到後會自己斷線。
    refuse(peerId, text) {
      this.sendData({ t: 'refused', text }, peerId);
      const rec = this.peers.get(peerId);
      this.peers.delete(peerId);
      this.connectedPeers.delete(peerId);
      this.lastSeen.delete(peerId);
      setTimeout(() => { try { rec?.conn?.close(); } catch { } }, 1000)?.unref?.();
    }

    // 房主：玩家離開或斷線。開始前直接移出大廳；對局中只標成已離線（座位還在）。
    playerGone(peerId) {
      const player = this.lobby?.players.find(p => p.peerId === peerId);
      if (!player || player.host) return;
      if (this.lobby.status === 'waiting') this.dropPlayer(peerId);
      else player.connected = false;
      this.broadcastLobby();
      this.recheckConfirms();
    }

    dropPlayer(peerId) {
      const rec = this.peers.get(peerId);
      this.peers.delete(peerId);
      this.connectedPeers.delete(peerId);
      this.lastSeen.delete(peerId);
      if (this.lobby) this.lobby.players = this.lobby.players.filter(p => p.host || p.peerId !== peerId);
      try { rec?.conn?.close(); } catch { }
    }

    // 客機：和房主的連線沒了。開始前回到加入畫面（帶著代碼）；對局中只提示。
    hostGone() {
      if (this.lobby?.status === 'playing') { this.error('和房主的連線中斷了，對局無法繼續同步。'); return; }
      const code = this.code, name = this.name;
      this.leave();
      this.error('和房主的連線中斷了，請重新加入。');
      this.onHostLost?.(code, name);
    }

    heard(peerId) {
      this.lastSeen.set(peerId, Date.now());
      if (!this.host) return;
      const player = this.lobby?.players.find(p => p.peerId === peerId);
      if (player && player.connected === false) { player.connected = true; this.broadcastLobby(); }
    }

    startBeat() {
      clearInterval(this._beat);
      this._lastBeat = Date.now();
      this._beat = setInterval(() => this.beat(), PING_MS);
      this._beat?.unref?.();
    }

    beat(now = Date.now()) {
      if (!this.active) return;
      const paused = now - this._lastBeat > PING_MS * 3;
      this._lastBeat = now;
      if (!this.host) { this.sendData({ t: 'ping' }, this.hostId); return; }
      // 房主頁面剛從背景回來時計時器停過，先不判斷，等下一輪。
      if (paused) return;
      let changed = false;
      for (const p of this.lobby?.players || []) {
        if (!isOnline(p)) continue;
        if (now - (this.lastSeen.get(p.peerId) ?? now) > OFFLINE_MS) { p.connected = false; changed = true; }
      }
      if (changed) { this.broadcastLobby(); this.recheckConfirms(); }
    }

    setMode(mode) {
      if (!this.host || !this.lobby) return;
      this.lobby.mode = mode;
      this.broadcastLobby();
    }
    setRounds(rounds) { if (!this.host || !this.lobby) return; this.lobby.rounds = Math.min(30, Math.max(3, Math.round(Number(rounds)) || 10)); this.broadcastLobby(); }
    setDebug(debug) { if (!this.host || !this.lobby) return; this.lobby.debug = Boolean(debug); this.broadcastLobby(); }
    setTarget(target) { if (!this.host || !this.lobby) return; this.lobby.target = Number(target) || 0; this.broadcastLobby(); }
    setStarGoal(goal) { if (!this.host || !this.lobby) return; this.lobby.starGoal = Math.max(1, Number(goal) || 3); this.broadcastLobby(); }
    setDoomEvery(every) { if (!this.host || !this.lobby) return; this.lobby.doomEvery = Math.max(1, Number(every) || 5); this.broadcastLobby(); }
    setDoomPrice(price) { if (!this.host || !this.lobby) return; this.lobby.doomPrice = Math.max(100, Number(price) || 1000); this.broadcastLobby(); }
    setDoomStep(step) { if (!this.host || !this.lobby) return; this.lobby.doomStep = Math.max(100, Number(step) || 500); this.broadcastLobby(); }

    selectRole(roleId) {
      if (!this.active) return;
      if (this.host) {
        const p = this.myPlayer; if (p) { p.roleId = roleId; }
        this.broadcastLobby();
      } else if (this.hostId) {
        this.sendData({ t: 'role', roleId }, this.hostId);
      }
    }

    renameSelf(name) {
      if (!this.active) return;
      if (this.host) { const p = this.myPlayer; if (p) p.name = this.uniqueName(cleanName(name, p.name), p.peerId); this.broadcastLobby(); }
      else if (this.hostId) this.sendData({ t: 'rename', name }, this.hostId);
    }

    startGame() {
      if (!this.host || !this.lobby) throw Error('只有房主可以開始對局。');
      const online = this.lobby.players.filter(isOnline);
      if (online.length < 2) throw Error('至少需要 2 位在線玩家。');
      if (online.length > MAX_PLAYERS) throw Error(`最多 ${MAX_PLAYERS} 位玩家。`);
      const fixed = online.filter(p => p.roleId !== 'random').map(p => p.roleId);
      if (new Set(fixed).size !== fixed.length) throw Error('企業角色不可重複（未定新創集團除外）。');
      // 已離線的玩家不加入這局，否則輪到他時整局會卡住；他回來時會看到原因。
      for (const p of this.lobby.players) if (!isOnline(p)) this.refuse(p.peerId, '對局已經開始；你剛才離線，沒有加入這局。');
      this.lobby.players = online;
      this.lobby.status = 'playing';
      this.lobby.confirms = [];
      const config = {
        seed: Date.now(),
        players: this.lobby.players.map(p => ({ name: p.name, roleId: p.roleId })),
        mode: this.lobby.mode,
        rounds: this.lobby.rounds,
        target: this.lobby.target,
        starGoal: this.lobby.starGoal,
        doomEvery: this.lobby.doomEvery,
        doomPrice: this.lobby.doomPrice,
        doomStep: this.lobby.doomStep,
        debug: this.lobby.debug,
        net: {
          roomCode: this.code, hostId: this.hostId,
          owners: Object.fromEntries(this.lobby.players.map((p, i) => [`player-${i + 1}`, p.peerId])),
          peerNames: Object.fromEntries(this.lobby.players.map((p, i) => [p.peerId, p.name]))
        }
      };
      this.broadcastData({ t: 'start', config });
      this.broadcastLobby();
      this.onStart?.(config);
    }

    // 房主建立棋盤失敗時，讓大家回到大廳並顯示原因（不然客機會一直停在「初始化中」）。
    cancelStart(reason) {
      if (!this.host || !this.lobby) return;
      this.lobby.status = 'waiting';
      this.broadcastLobby();
      const text = `無法開始對局：${reason}`;
      this.broadcastData({ t: 'error', text });
      this.error(text);
    }

    publish(state) {
      if (!this.active || !this.host || !state) return;
      this.broadcastState(state);
    }

    sendAction(action) {
      if (!this.active || this.host || !this.hostId || !action?.type) return false;
      this.sendData({ t: 'action', action }, this.hostId);
      return true;
    }

    broadcastState(game) {
      if (!this.active || !this.host || !game) return;
      this.broadcastData({ t: 'state', game });
    }

    broadcastEvent(event) {
      if (!this.active || !this.host || !event?.type) return;
      this.onEvent?.(event, this.peerId);
      this.broadcastData({ t: 'event', event });
    }

    broadcastData(msg) {
      this.sendData(msg, 'all');
    }

    sendData(msg, target = 'all') {
      if (!this.active) return;
      const packet = { ...msg, mid: rid(), fromPeer: this.peerId, at: Date.now() };
      if (target === 'all') {
        for (const [peerId, rec] of this.peers) {
          if (peerId !== this.peerId && rec.conn?.open) { try { rec.conn.send(packet); } catch { } }
        }
      } else {
        const rec = this.peers.get(target);
        if (rec?.conn?.open) { try { rec.conn.send(packet); } catch { } }
      }
    }

    _markSeen(mid) {
      if (!mid) return false;
      if (this.seen.has(mid)) return true;
      this.seen.add(mid);
      if (this.seen.size > 500) this.seen.delete(this.seen.values().next().value);
      return false;
    }

    handleData(msg, fromPeer) {
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'SYSTEM') { console.log(msg.message); return; }
      if (msg.fromPeer === this.peerId) return;
      if (msg.t === 'ping') return;
      if (this._markSeen(msg.mid)) return;
      if (msg.t === 'lobby' && msg.lobby) {
        this.lobby = msg.lobby;
        if (msg.lobby.hostId) this.hostId = msg.lobby.hostId;
        if (msg.lobby.code) this.code = msg.lobby.code;
        this.emitLobby();
        return;
      }
      if (msg.t === 'hello') {
        if (this.host) {
          this.addPlayer(fromPeer, msg.name);
          const p = this.lobby.players.find(x => x.peerId === fromPeer);
          if (p) p.connected = true;
          this.connectedPeers.add(fromPeer);
          this.broadcastLobby();
          this.sendData({ t: 'lobby', lobby: this.lobby }, fromPeer);
        }
        return;
      }
      if (msg.t === 'state' && msg.game) {
        if (!this.host && fromPeer === this.hostId) this.onState?.(msg.game, fromPeer);
        return;
      }
      if (msg.t === 'action' && this.host) {
        this.onAction?.(msg.action, fromPeer);
        return;
      }
      if (msg.t === 'event' && !this.host && fromPeer === this.hostId) {
        this.onEvent?.(msg.event, fromPeer);
        return;
      }
      if (msg.t === 'start' && msg.config) {
        if (this.lobby) this.lobby.status = 'playing';
        this.onStart?.(msg.config);
        return;
      }
      if (msg.t === 'role' && this.host) {
        const p = this.lobby.players.find(x => x.peerId === fromPeer);
        if (p) { p.roleId = msg.roleId; this.broadcastLobby(); }
        return;
      }
      if (msg.t === 'rename' && this.host) {
        const p = this.lobby.players.find(x => x.peerId === fromPeer);
        if (p && msg.name) { p.name = this.uniqueName(cleanName(msg.name, p.name), p.peerId); this.broadcastLobby(); }
        return;
      }
      if (msg.t === 'confirm' && this.host) {
        this.confirmResult(msg.playerId || '');
        return;
      }
      if (msg.t === 'confirm-update' && msg.lobby) {
        this.lobby = msg.lobby; this.emitLobby(); return;
      }
      if (msg.t === 'return-lobby') {
        if (this.lobby) this.lobby.status = 'waiting';
        this.onReturnLobby?.(this.lobby);
        return;
      }
      if (msg.t === 'leave' && this.host) { this.playerGone(fromPeer); return; }
      if (msg.t === 'closed' && !this.host && fromPeer === this.hostId) {
        const playing = this.lobby?.status === 'playing';
        this.leave();
        this.error(playing ? '房主已關閉房間，對局結束。' : '房主已關閉房間。');
        return;
      }
      if (msg.t === 'refused' && !this.host && fromPeer === this.hostId) { this.leave(); this.error(msg.text || '無法加入房間。'); return; }
      if (msg.t === 'error') { this.error(msg.text || '連線錯誤'); return; }
    }

    broadcastLobby() {
      if (!this.lobby) return;
      this.emitLobby();
      this.broadcastData({ t: 'lobby', lobby: this.lobby });
    }

    emitLobby() {
      try { this.onLobby?.(this.lobby); } catch (e) { console.error(e); }
    }

    confirmResult(playerId) {
      if (!this.active) return { confirmed: 0, total: 0 };
      if (!this.host) {
        if (this.hostId) this.sendData({ t: 'confirm', playerId: playerId || this.myPlayerId }, this.hostId);
        return null;
      }
      if (!this.lobby) return null;
      if (playerId && !this.lobby.confirms.includes(playerId)) this.lobby.confirms.push(playerId);
      // 已離線的玩家不用確認；回到大廳時把他們移出。
      const online = this.lobby.players.filter(isOnline);
      const total = online.length;
      const confirmed = online.filter(p => { const i = this.lobby.players.indexOf(p); return this.lobby.confirms.includes(`player-${i + 1}`) || this.lobby.confirms.includes(p.peerId); }).length;
      this.lobby.confirmRatio = { confirmed, total };
      if (confirmed >= total) {
        for (const p of this.lobby.players) if (!isOnline(p)) this.refuse(p.peerId, '你剛才離線，已移出房間；要再玩請重新加入。');
        this.lobby.players = online;
        this.lobby.status = 'waiting';
        this.lobby.confirms = [];
        this.lobby.confirmRatio = { confirmed: 0, total };
        this.broadcastLobby();
        this.broadcastData({ t: 'return-lobby' });
        this.onReturnLobby?.(this.lobby);
      } else {
        this.broadcastLobby();
      }
      return this.lobby.confirmRatio;
    }

    // 等待確認結果時有人離線，重新計算（最後一位沒確認的人離開時不會卡住）。
    recheckConfirms() {
      if (this.host && this.lobby?.status === 'playing' && this.lobby.confirms?.length) this.confirmResult('');
    }

    // ---- 權限 -----------------------------------------------------------
    canAct(state) {
      if (!this.active || !state) return true;
      const owners = state.net?.owners;
      if (!owners) return true;
      const active = state.players?.[state.turnIndex];
      if (!active) return true;
      const owner = owners[active.id];
      return !owner || owner === this.peerId;
    }

    ownerName(state) {
      const active = state?.players?.[state?.turnIndex];
      const owner = state?.net?.owners?.[active?.id];
      return state?.net?.peerNames?.[owner] || '';
    }
  }

  return new Net();
})();

// ---- 邀請連結（大廳 QR Code 的內容） ------------------------------------
// 目前網址加上 ?room=代碼；file:// 或 localhost 的網址別的裝置打不開，回傳空字串。
export function roomInviteLink(href, code) {
  const roomCode = String(code || '').trim();
  if (!roomCode) return '';
  let url;
  try { url = new URL(href); } catch { return ''; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
  if (/^(localhost|127(\.\d+){3}|\[::1\])$/i.test(url.hostname)) return '';
  url.hash = '';
  url.searchParams.set('room', roomCode);
  return url.href;
}

// 從網址讀出 ?room=代碼，沒有時回傳空字串。
export function roomCodeFromLink(href) {
  try { return (new URL(href).searchParams.get('room') || '').trim(); } catch { return ''; }
}

globalThis.PartyNet = PartyNet;
