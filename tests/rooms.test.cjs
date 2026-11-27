const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Room } = require('../room-engine.js');
const { Network } = require('../room-network.js');
const host = { id: 'host-player', name: 'CAPTAIN' };
function setup(format = '2V2', balls = 12) {
  const room = new Room(format, host, balls);
  for (let i = 1; i < room.capacity; i++) { room.join({ id: 'player-' + i, name: 'PLAYER_' + i }); room.ready('player-' + i, true); }
  return room;
}
function ball(room, bat, bowl) {
  const { batter, bowler } = room.actors(), { round, match } = room.state;
  room.pick(batter, bat, round, match); room.pick(bowler, bowl, round, match);
}
test('2v2 needs four real, ready, balanced players; only the host can start', () => {
  const room = new Room('2V2', host);
  room.join({ id: 'p2', name: 'SECOND' }); room.ready('p2', true);
  assert.throws(() => room.start(host.id), /All 4/);
  room.join({ id: 'p3', name: 'THIRD' }); room.join({ id: 'p4', name: 'FOURTH' });
  assert.throws(() => room.start(host.id), /ready/);
  room.ready('p3', true); room.ready('p4', true);
  assert.throws(() => room.start('p2'), /Only the host/);
  room.start(host.id, 0); assert.equal(room.state.stage, 'CHOOSE');
  assert.throws(() => room.choose('p2', 'BAT'), /captain/);
});
test('duplicate names and over-capacity joins are rejected', () => {
  const room = setup('1V1');
  assert.throws(() => room.join({ id: 'extra', name: 'THIRD' }), /full/);
  const empty = new Room('2V2', host);
  assert.throws(() => empty.join({ id: 'other', name: 'CAPTAIN' }), /already/);
});
test('choices stay private until both lock; duplicates and stale turns cannot score twice', () => {
  const room = setup('1V1'); room.start(host.id, 0); room.choose(host.id, 'BAT');
  const { round, match } = room.state;
  const snapshot = room.pick(host.id, 6, round, match);
  assert.deepEqual(snapshot.locked, [host.id]); assert.equal(snapshot.last, null); assert.equal(snapshot.picks, undefined);
  room.pick(host.id, 2, round, match); room.pick('player-1', 1, round, match);
  assert.equal(room.state.scores[0], 6);
  assert.throws(() => room.pick(host.id, 6, round, match), /ended/);
  assert.equal(room.state.balls[0], 1);
});
test('2v2 alternates bowlers after six balls and brings in the second batter after a wicket', () => {
  const room = setup(); room.start(host.id, 0); room.choose(host.id, 'BAT');
  assert.equal(room.actors().bowler, 'player-1');
  assert.throws(() => room.pick('player-3', 3, room.state.round, room.state.match), /Wait/);
  for (let i = 0; i < 6; i++) ball(room, 3, 2);
  assert.equal(room.actors().bowler, 'player-3');
  ball(room, 2, 2); assert.equal(room.actors().batter, 'player-2');
  ball(room, 4, 4); assert.equal(room.state.stage, 'BREAK'); assert.equal(room.state.scores[0], 18);
});
test('innings limits, chase wins, ties and rematches are consistent', () => {
  const room = setup('1V1', 6); room.start(host.id, 0); room.choose(host.id, 'BAT');
  for (let i = 0; i < 6; i++) ball(room, 1, 2);
  assert.equal(room.state.stage, 'BREAK'); room.nextInnings(host.id);
  ball(room, 6, 1); assert.equal(room.state.stage, 'PLAY');
  ball(room, 1, 1); assert.equal(room.state.stage, 'FINISHED'); assert.equal(room.state.winner, 'DRAW');
  room.rematch(host.id); assert.equal(room.state.stage, 'LOBBY'); assert.equal(room.player('player-1').ready, false);
  room.ready('player-1', true); room.start(host.id, 0); room.choose(host.id, 'BAT');
  ball(room, 1, 1); room.nextInnings(host.id); ball(room, 2, 1);
  assert.equal(room.state.winner, 1); assert.equal(room.state.stage, 'FINISHED');
});
test('disconnect pauses all play, clears hidden choices and resumes the same player', () => {
  const room = setup(); room.start(host.id, 0); room.choose(host.id, 'BAT');
  const oldRound = room.state.round;
  room.pick(host.id, 5, oldRound, room.state.match); room.disconnect('player-1');
  assert.equal(room.state.stage, 'PAUSED'); assert.equal(room.state.locked.length, 0);
  room.join({ id: 'player-1', name: 'PLAYER_1' });
  assert.equal(room.state.stage, 'PLAY'); assert.equal(room.state.players.length, 4);
  assert.throws(() => room.pick(host.id, 5, oldRound, room.state.match), /ended/);
});

// Exercise the production network controller with independent peers and serialized messages.
class Events { constructor() { this.events = {}; } on(n, fn) { (this.events[n] ||= []).push(fn); } emit(n, v) { (this.events[n] || []).forEach(fn => fn(v)); } }
class Connection extends Events {
  send(packet) { if (this.open) queueMicrotask(() => this.other.emit('data', JSON.parse(JSON.stringify(packet)))); }
  close() { if (!this.open) return; this.open = this.other.open = false; this.emit('close'); this.other.emit('close'); }
}
class Peer extends Events {
  static all = new Map(); static next = 0;
  constructor(id) { super(); this.id = id || 'peer-' + Peer.next++; this.links = []; Peer.all.set(this.id, this); queueMicrotask(() => this.emit('open', this.id)); }
  connect(id) {
    const a = new Connection(), b = new Connection(); a.other = b; b.other = a; this.links.push(a);
    queueMicrotask(() => { const target = Peer.all.get(id); if (!target) return this.emit('error', { type: 'peer-unavailable' }); target.links.push(b); target.emit('connection', b); a.open = b.open = true; a.emit('open'); b.emit('open'); });
    return a;
  }
  destroy() { this.destroyed = true; this.links.forEach(c => c.close()); Peer.all.delete(this.id); }
}
const settle = () => new Promise(resolve => setImmediate(resolve));
test('four network clients complete a synchronized 2v2 match and reconnect without duplicate players', async () => {
  const clients = [], states = [], errors = [];
  for (let i = 0; i < 4; i++) clients.push(new Network(Peer, { id: 'player-id-' + i, name: 'USER_' + i, token: 'token-for-player-' + i }, s => { states[i] = s; }, (m, error) => { if (error) errors.push(m); }));
  try {
    await clients[0].host('OAE-ABC234', '2V2', 6);
    for (let i = 1; i < 4; i++) { await clients[i].join('OAE-ABC234'); await settle(); clients[i].action({ type: 'READY', ready: true }); await settle(); }
    assert.ok(states.every(s => s.players.length === 4));
    clients[0].action({ type: 'START' }); await settle();
    const captain = clients.find(c => c.identity.id === states[0].tossCaptain);
    captain.action({ type: 'CHOOSE', decision: 'BAT' }); await settle();
    clients[3].hostConnection.close(); await settle(); assert.equal(states[0].stage, 'PAUSED');
    await clients[3].join('OAE-ABC234'); await settle(); assert.equal(states[0].stage, 'PLAY');
    for (let step = 0; step < 30 && states[0].stage !== 'FINISHED'; step++) {
      if (states[0].stage === 'BREAK') { clients[0].action({ type: 'NEXT' }); await settle(); }
      const actors = clients[0].room.actors();
      for (const [id, value] of [[actors.batter, 2], [actors.bowler, 2]]) {
        clients.find(c => c.identity.id === id).action({ type: 'PICK', value, round: states[0].round, match: states[0].match });
      }
      await settle();
    }
    assert.equal(states[0].stage, 'FINISHED');
    for (const state of states) assert.deepEqual(state, states[0]);
    assert.equal(states[0].winner, 'DRAW');
    assert.ok(errors.every(e => e.includes('Host connection lost')));
  } finally { clients.forEach(c => c.close()); }
});
