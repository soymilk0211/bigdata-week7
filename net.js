// 多人房間 / PeerJS P2P 連線層
export const PartyNet = (() => {
  const rid = () => (globalThis.crypto?.randomUUID?.() || `p-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

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
      this._peer = null;
      this.onLobby = null;
      this.onStart = null;
      this.onState = null;
      this.onAction = null;
      this.onEvent = null;
      this.onReturnLobby = null;
      this.onStatus = null;
      this.onError = null;
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
      this.name = name || '房主';
      this.lobby = {
        code: '', hostId: '', status: 'waiting', mode: 'star', rounds: 10, target: 0,
        starGoal: 3, doomEvery: 5, doomPrice: 1000, doomStep: 500, debug: false,
        confirms: [], createdAt: Date.now(),
        players: []
      };
      const peer = new PeerConstructor();
      this._peer = peer;
      peer.on('open', peerId => {
        if (!this.active || this._peer !== peer) return;
        this.peerId = peerId;
        this.hostId = peerId;
        this.code = peerId;
        this.lobby.code = peerId;
        this.lobby.hostId = peerId;
        this.lobby.players = [{ peerId, name: this.name, roleId, host: true, connected: true }];
        this.emitLobby();
        this.broadcastLobby();
        this.status(`房間 ${this.code} 已建立，等待玩家加入。`);
      });
      peer.on('connection', conn => this.wireConnection(conn));
      peer.on('error', error => this.error(error?.message || 'PeerJS 連線錯誤'));
      this.emitLobby();
      this.status('正在建立 PeerJS 房間…');
      return this.lobby;
    }

    joinRoom(code, name) {
      this.leave(false);
      this.code = String(code || '').trim();
      if (!this.code || this.code.length > 128) throw Error('請輸入有效的 Peer ID。');
      const PeerConstructor = globalThis.Peer;
      if (typeof PeerConstructor !== 'function') throw Error('PeerJS 尚未載入，請確認網路連線後重新整理。');
      this.host = false;
      this.hostId = this.code;
      this.active = true;
      this.name = name || '玩家';
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
      peer.on('error', error => this.error(error?.message || 'PeerJS 連線錯誤'));
      this.emitLobby();
      this.status(`正在加入房間 ${this.code}…`);
      return this.lobby;
    }

    leave(notify = true) {
      this.active = false;
      for (const rec of this.peers.values()) { try { rec.conn?.close(); } catch { } }
      try { this._peer?.destroy(); } catch { }
      this.peers.clear();
      this.connectedPeers.clear();
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
        conn.on('open', () => {
          if (!this.active) return;
          this.connectedPeers.add(peerId);
          if (this.host) {
            const player = this.lobby?.players.find(entry => entry.peerId === peerId);
            if (player) player.connected = true;
            conn.send({ type: 'SYSTEM', message: '連線成功' });
            this.broadcastLobby();
            this.status(`${peerId} 已連線。`);
          } else {
            this.sendData({ t: 'hello', name: this.name }, this.hostId);
            this.status('PeerJS 已連線。');
          }
        });
        conn.on('data', data => {
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
          this.connectedPeers.delete(peerId);
          this.peers.delete(peerId);
          const player = this.lobby?.players.find(entry => entry.peerId === peerId);
          if (player) {
            player.connected = false;
            if (this.host) this.broadcastLobby();
          }
        });
        conn.on('error', error => this.error(error?.message || 'PeerJS 資料連線錯誤'));
    }

    addPlayer(peerId, name) {
      if (!this.host || !this.lobby) return;
      let player = this.lobby.players.find(p => p.peerId === peerId);
      if (!player) {
        if (this.lobby.status !== 'waiting') { this.sendData({ t: 'error', text: '對局已開始，暫時無法加入。' }, peerId); return; }
        player = { peerId, name, roleId: 'random', host: false, connected: false };
        this.lobby.players.push(player);
      } else if (name) player.name = name;
      this.emitLobby();
    }

    setMode(mode) {
      if (!this.host || !this.lobby) return;
      this.lobby.mode = mode;
      this.broadcastLobby();
    }
    setRounds(rounds) { if (!this.host || !this.lobby) return; this.lobby.rounds = Number(rounds) || 10; this.broadcastLobby(); }
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
      if (this.host) { const p = this.myPlayer; if (p) p.name = name; this.broadcastLobby(); }
      else if (this.hostId) this.sendData({ t: 'rename', name }, this.hostId);
    }

    startGame() {
      if (!this.host || !this.lobby) throw Error('只有房主可以開始對局。');
      if (this.lobby.players.length < 2) throw Error('至少需要 2 位玩家。');
      if (this.lobby.players.length > 8) throw Error('最多 8 位玩家。');
      const fixed = this.lobby.players.filter(p => p.roleId !== 'random').map(p => p.roleId);
      if (new Set(fixed).size !== fixed.length) throw Error('企業角色不可重複（未定新創集團除外）。');
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
      if (this._markSeen(msg.mid)) return;
      if (msg.t === 'lobby' && msg.lobby) {
        this.lobby = msg.lobby;
        if (msg.lobby.hostId) this.hostId = msg.lobby.hostId;
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
        if (p && msg.name) { p.name = String(msg.name).slice(0, 16); this.broadcastLobby(); }
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
      const total = this.lobby.players.length;
      const confirmed = this.lobby.players.filter((p, i) => this.lobby.confirms.includes(`player-${i + 1}`) || this.lobby.confirms.includes(p.peerId)).length;
      this.lobby.confirmRatio = { confirmed, total };
      if (confirmed >= total) {
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
