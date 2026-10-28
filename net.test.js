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
