import test from 'node:test';
import assert from 'node:assert/strict';
import {PartyNet, roomInviteLink, roomCodeFromLink} from './net.js';

class FakeConnection {
  constructor(peer) { this.peer = peer; this.handlers = new Map(); this.sent = []; this.open = false; }
  on(event, handler) { this.handlers.set(event, handler); }
  emit(event, value) { if (event === 'open') this.open = true; this.handlers.get(event)?.(value); }
  send(message) { this.sent.push(message); }
  close() { this.open = false; }
}

class FakePeer {
  constructor() { this.handlers = new Map(); FakePeer.last = this; }
  on(event, handler) { this.handlers.set(event, handler); }
  emit(event, value) { this.handlers.get(event)?.(value); }
  connect(peerId) { this.connectTarget = peerId; this.connection = new FakeConnection(peerId); return this.connection; }
  destroy() {}
}

test('多人房間可設定保護費抬升價，並帶入開局設定', () => {
  const previousLocation = globalThis.location;
  const previousPeer = globalThis.Peer;
  globalThis.location = {protocol: 'file:'};
  globalThis.Peer = FakePeer;
  try {
    PartyNet.createRoom({name: '房主'});
    FakePeer.last.emit('open', 'host-peer-id');
    assert.equal(PartyNet.code, 'host-peer-id');
    assert.equal(PartyNet.lobby.doomStep, 500);
    PartyNet.addPlayer('peer-test', '玩家');
    PartyNet.setMode('evil');
    PartyNet.setDoomStep(750);
    assert.equal(PartyNet.lobby.doomStep, 750);

    let config = null;
    PartyNet.onStart = value => { config = value; };
    PartyNet.startGame();
    assert.equal(config.mode, 'evil');
    assert.equal(config.doomEvery, 5);
    assert.equal(config.doomPrice, 1000);
    assert.equal(config.doomStep, 750);
  } finally {
    PartyNet.leave(false);
    if (previousPeer === undefined) delete globalThis.Peer;
    else globalThis.Peer = previousPeer;
    if (previousLocation === undefined) delete globalThis.location;
    else globalThis.location = previousLocation;
  }
});

test('PeerJS 客機連接房主 ID，房主送出連線成功系統訊息', () => {
  const previousPeer = globalThis.Peer;
  globalThis.Peer = FakePeer;
  try {
    PartyNet.createRoom({name: '房主'});
    const hostPeer = FakePeer.last;
    hostPeer.emit('open', 'host-peer-id');
    const hostConnection = new FakeConnection('client-peer-id');
    hostPeer.emit('connection', hostConnection);
    hostConnection.emit('open');
    assert.deepEqual(hostConnection.sent[0], {type: 'SYSTEM', message: '連線成功'});

    PartyNet.leave(false);
    PartyNet.joinRoom('host-peer-id', '客機');
    const clientPeer = FakePeer.last;
    clientPeer.emit('open', 'client-peer-id');
    assert.equal(clientPeer.connectTarget, 'host-peer-id');
    clientPeer.connection.emit('open');
    assert.equal(clientPeer.connection.sent[0].t, 'hello');
  } finally {
    PartyNet.leave(false);
    if (previousPeer === undefined) delete globalThis.Peer;
    else globalThis.Peer = previousPeer;
  }
});

test('房主只派發客機 Action，忽略客機狀態並向客機派發 Event', () => {
  const previousPeer = globalThis.Peer;
  globalThis.Peer = FakePeer;
  try {
    PartyNet.createRoom({name: '房主'});
    const hostPeer = FakePeer.last;
    hostPeer.emit('open', 'host-peer-id');
    const connection = new FakeConnection('client-peer-id');
    hostPeer.emit('connection', connection);
    connection.emit('open');

    const actions = [];
    let receivedState = false;
    PartyNet.onAction = (action, peerId) => actions.push({action, peerId});
    PartyNet.onState = () => { receivedState = true; };
    connection.emit('data', {t: 'action', action: {type: 'ROLL_DICE', playerId: 'player-2'}});
    connection.emit('data', {t: 'state', game: {players: []}});
    assert.deepEqual(actions, [{action: {type: 'ROLL_DICE', playerId: 'player-2'}, peerId: 'client-peer-id'}]);
    assert.equal(receivedState, false);

    const events = [];
    PartyNet.onEvent = event => events.push(event);
    PartyNet.broadcastEvent({type: 'GHOST_ATTACK', target: 'player-2'});
    assert.deepEqual(events, [{type: 'GHOST_ATTACK', target: 'player-2'}]);
    assert.deepEqual(connection.sent.at(-1), {
      t: 'event', event: {type: 'GHOST_ATTACK', target: 'player-2'},
      mid: connection.sent.at(-1).mid, fromPeer: 'host-peer-id', at: connection.sent.at(-1).at
    });
  } finally {
    PartyNet.leave(false);
    if (previousPeer === undefined) delete globalThis.Peer;
    else globalThis.Peer = previousPeer;
  }
});

test('重複收到相同封包時只處理一次', () => {
  const previousPeer = globalThis.Peer;
  globalThis.Peer = FakePeer;
  try {
    PartyNet.createRoom({name: '房主'});
    const hostPeer = FakePeer.last;
    hostPeer.emit('open', 'host-peer-id');
    const connection = new FakeConnection('client-peer-id');
    hostPeer.emit('connection', connection);
    let received = 0;
    PartyNet.onAction = () => { received++; };
    const packet = {t: 'action', action: {type: 'ROLL_DICE'}, mid: 'duplicate-roll'};
    connection.emit('data', packet);
    connection.emit('data', packet);
    assert.equal(received, 1);
  } finally {
    PartyNet.leave(false);
    if (previousPeer === undefined) delete globalThis.Peer;
    else globalThis.Peer = previousPeer;
  }
});

test('大廳 QR Code 的邀請連結：線上網址加上 ?room=，本機網址不產生', () => {
  const code = '3f2a9c1e-7b4d-4e8a-9c2f-1a2b3c4d5e6f';
  assert.equal(roomInviteLink('https://soymilk0211.github.io/bigdata-week7/', code), `https://soymilk0211.github.io/bigdata-week7/?room=${code}`);
  assert.equal(roomInviteLink('https://soymilk0211.github.io/bigdata-week7/index.html?room=OLD#rules', ` ${code} `), `https://soymilk0211.github.io/bigdata-week7/index.html?room=${code}`);
  assert.equal(roomInviteLink('http://192.168.1.20:4173/', 'abc'), 'http://192.168.1.20:4173/?room=abc');
  assert.equal(roomInviteLink('https://soymilk0211.github.io/bigdata-week7/', ''), '');
  for (const href of ['file:///C:/game/index.html', 'http://127.0.0.1:4173/', 'http://localhost:4173/', 'http://[::1]:4173/', 'not a url']) {
    assert.equal(roomInviteLink(href, code), '', href);
  }
});

test('掃 QR Code 打開的網址可以讀回房間代碼', () => {
  const code = '3f2a9c1e-7b4d-4e8a-9c2f-1a2b3c4d5e6f';
  assert.equal(roomCodeFromLink(roomInviteLink('https://soymilk0211.github.io/bigdata-week7/', code)), code);
  assert.equal(roomCodeFromLink('https://soymilk0211.github.io/bigdata-week7/'), '');
  assert.equal(roomCodeFromLink('https://soymilk0211.github.io/bigdata-week7/?room=%20abc%20'), 'abc');
  assert.equal(roomCodeFromLink('not a url'), '');
});

// ---- 有人離開大廳／斷線 -------------------------------------------------
function withHost(run) {
  const previousPeer = globalThis.Peer;
  globalThis.Peer = FakePeer;
  const errors = [];
  PartyNet.onError = text => errors.push(text);
  try {
    PartyNet.createRoom({name: '房主'});
    const hostPeer = FakePeer.last;
    hostPeer.emit('open', 'host-peer-id');
    const join = (peerId, name) => {
      const connection = new FakeConnection(peerId);
      hostPeer.emit('connection', connection);
      connection.emit('open');
      connection.emit('data', {t: 'hello', name});
      return connection;
    };
    run({join, errors});
  } finally {
    PartyNet.leave(false);
    PartyNet.onError = null;
    PartyNet.onStart = null;
    if (previousPeer === undefined) delete globalThis.Peer;
    else globalThis.Peer = previousPeer;
  }
}
const names = () => PartyNet.lobby.players.map(p => p.name);

test('開始前客機離開或斷線，房主馬上把他移出大廳', () => {
  withHost(({join}) => {
    const a = join('guest-a', '小明');
    const b = join('guest-b', '阿華');
    assert.deepEqual(names(), ['房主', '小明', '阿華']);
    a.emit('data', {t: 'leave'});
    assert.deepEqual(names(), ['房主', '阿華']);
    b.emit('close');
    assert.deepEqual(names(), ['房主']);
    // 同一個人用新的頁面（新的 Peer ID）回來，只會有一筆
    join('guest-a2', '小明');
    assert.deepEqual(names(), ['房主', '小明']);
  });
});

test('名字重複時自動加上編號，開局不會因為名字重複而失敗', () => {
  withHost(({join}) => {
    join('guest-a', '玩家 1');
    join('guest-b', '玩家 1');
    const c = join('guest-c', ' 房主 ');
    assert.deepEqual(names(), ['房主', '玩家 1', '玩家 1 2', '房主 2']);
    c.emit('data', {t: 'rename', name: '玩家 1'});
    assert.equal(names()[3], '玩家 1 3');
    let config = null;
    PartyNet.onStart = value => { config = value; };
    PartyNet.startGame();
    assert.equal(new Set(config.players.map(p => p.name)).size, 4);
  });
});

test('房主 12 秒沒收到客機訊息就標成已離線，收到訊息後恢復；開始時已離線的人不加入', () => {
  withHost(({join}) => {
    const a = join('guest-a', '小明');
    const b = join('guest-b', '阿華');
    const t0 = Date.now();
    for (let t = t0 + 3000; t <= t0 + 15000; t += 3000) {
      PartyNet.lastSeen.set('guest-a', t);  // 小明每 3 秒有 ping
      PartyNet.beat(t);
    }
    assert.deepEqual(PartyNet.lobby.players.map(p => p.connected !== false), [true, true, false]);
    b.emit('data', {t: 'ping'});
    assert.equal(PartyNet.lobby.players[2].connected, true);
    PartyNet.lobby.players[2].connected = false;

    let config = null;
    PartyNet.onStart = value => { config = value; };
    PartyNet.startGame();
    assert.deepEqual(config.players.map(p => p.name), ['房主', '小明']);
    assert.deepEqual(Object.values(config.net.owners), ['host-peer-id', 'guest-a']);
    assert.deepEqual(names(), ['房主', '小明']);
    assert.equal(b.sent.at(-1).t, 'refused');
    assert.match(b.sent.at(-1).text, /你剛才離線/);
    assert.equal(b.sent.some(m => m.t === 'start'), false);
    assert.equal(a.sent.some(m => m.t === 'start'), true);
  });
});

test('房主的頁面在背景停過時，先不判斷誰離線', () => {
  withHost(({join}) => {
    join('guest-a', '小明');
    PartyNet.beat(Date.now() + 60000);
    assert.equal(PartyNet.lobby.players[1].connected, true);
  });
});

test('只剩 1 位在線玩家時不能開始；第 9 位加入會被拒絕', () => {
  withHost(({join}) => {
    const a = join('guest-a', '小明');
    PartyNet.lobby.players[1].connected = false;
    assert.throws(() => PartyNet.startGame(), /至少需要 2 位在線玩家/);
    assert.equal(PartyNet.lobby.status, 'waiting');
    PartyNet.lobby.players[1].connected = true;
    for (let i = 2; i <= 7; i++) join(`guest-${i}`, `玩家${i}`);
    assert.equal(PartyNet.lobby.players.length, 8);
    const ninth = join('guest-9', '第九位');
    assert.equal(PartyNet.lobby.players.length, 8);
    assert.equal(ninth.sent.at(-1).t, 'refused');
    assert.match(ninth.sent.at(-1).text, /房間已滿/);
    assert.equal(a.open, true);
  });
});

test('季數限制在 3–30，避免建立棋盤失敗', () => {
  withHost(() => {
    PartyNet.setRounds(99);
    assert.equal(PartyNet.lobby.rounds, 30);
    PartyNet.setRounds(1);
    assert.equal(PartyNet.lobby.rounds, 3);
    PartyNet.setRounds('abc');
    assert.equal(PartyNet.lobby.rounds, 10);
  });
});

test('建立棋盤失敗時大家回到大廳並看到原因', () => {
  withHost(({join, errors}) => {
    const a = join('guest-a', '小明');
    PartyNet.startGame();
    assert.equal(PartyNet.lobby.status, 'playing');
    PartyNet.cancelStart('季數上限須為 2–30。');
    assert.equal(PartyNet.lobby.status, 'waiting');
    assert.deepEqual(errors, ['無法開始對局：季數上限須為 2–30。']);
    assert.equal(a.sent.at(-1).text, '無法開始對局：季數上限須為 2–30。');
    assert.equal(a.sent.findLast(m => m.t === 'lobby').lobby.status, 'waiting');
  });
});

test('對局中有人斷線只標成已離線；結算確認不用等他，回大廳時移出', () => {
  withHost(({join}) => {
    const a = join('guest-a', '小明');
    const b = join('guest-b', '阿華');
    PartyNet.startGame();
    b.emit('close');
    assert.deepEqual(names(), ['房主', '小明', '阿華']);
    assert.equal(PartyNet.lobby.players[2].connected, false);
    assert.deepEqual(PartyNet.confirmResult('player-1'), {confirmed: 1, total: 2});
    let back = false;
    PartyNet.onReturnLobby = () => { back = true; };
    a.emit('data', {t: 'confirm', playerId: 'player-2'});
    assert.equal(back, true);
    assert.equal(PartyNet.lobby.status, 'waiting');
    assert.deepEqual(names(), ['房主', '小明']);
    assert.equal(b.sent.some(m => m.t === 'refused'), false);  // 連線已經關了，不用再通知
    PartyNet.onReturnLobby = null;
  });
});

test('等確認結果時最後一位沒確認的人離開，不會卡住', () => {
  withHost(({join}) => {
    const a = join('guest-a', '小明');
    const b = join('guest-b', '阿華');
    PartyNet.startGame();
    PartyNet.confirmResult('player-1');
    a.emit('data', {t: 'confirm', playerId: 'player-2'});
    assert.equal(PartyNet.lobby.status, 'playing');
    b.emit('data', {t: 'leave'});
    assert.equal(PartyNet.lobby.status, 'waiting');
    assert.deepEqual(names(), ['房主', '小明']);
  });
});

function withGuest(run) {
  const previousPeer = globalThis.Peer;
  globalThis.Peer = FakePeer;
  const errors = [];
  let lost = null;
  PartyNet.onError = text => errors.push(text);
  PartyNet.onHostLost = (code, name) => { lost = `${code}/${name}`; };
  try {
    PartyNet.joinRoom('host-peer-id', '小明');
    FakePeer.last.emit('open', 'guest-a');
    const connection = FakePeer.last.connection;
    connection.emit('open');
    run({connection, errors, lost: () => lost});
  } finally {
    PartyNet.leave(false);
    PartyNet.onError = null;
    PartyNet.onHostLost = null;
    if (previousPeer === undefined) delete globalThis.Peer;
    else globalThis.Peer = previousPeer;
  }
}

test('客機離開時先通知房主，並定時送 ping', () => {
  withGuest(({connection}) => {
    assert.equal(connection.sent[0].t, 'hello');
    PartyNet.beat();
    assert.equal(connection.sent.at(-1).t, 'ping');
    PartyNet.leave(false);
    assert.equal(connection.sent.at(-1).t, 'leave');
    assert.equal(PartyNet.active, false);
  });
});

test('開始前和房主斷線：回到加入畫面並帶著代碼', () => {
  withGuest(({connection, errors, lost}) => {
    connection.emit('close');
    assert.equal(PartyNet.active, false);
    assert.equal(lost(), 'host-peer-id/小明');
    assert.deepEqual(errors, ['和房主的連線中斷了，請重新加入。']);
  });
});

test('房主關閉房間或拒絕加入時，客機離開房間並看到原因', () => {
  withGuest(({connection, errors, lost}) => {
    connection.emit('data', {t: 'closed'});
    assert.equal(PartyNet.active, false);
    assert.equal(lost(), null);
    assert.deepEqual(errors, ['房主已關閉房間。']);
  });
  withGuest(({connection, errors}) => {
    connection.emit('data', {t: 'refused', text: '對局已開始，暫時無法加入。'});
    assert.equal(PartyNet.active, false);
    assert.deepEqual(errors, ['對局已開始，暫時無法加入。']);
  });
});
