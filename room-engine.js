(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OAERoom = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const cleanName = value => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 16);
  class Room {
    constructor(format, host, maxBalls = 12) {
      if (!host?.id || cleanName(host.name).length < 3) throw Error('Sign in before creating a room.');
      this.capacity = format === '2V2' ? 4 : 2;
      this.state = { version: 1, revision: 0, format: this.capacity === 4 ? '2V2' : '1V1', host: host.id,
        stage: 'LOBBY', players: [{ id: host.id, name: cleanName(host.name), team: 0, connected: true, ready: true }],
        round: 0, match: 0, maxBalls: [6, 12, 18, 30].includes(maxBalls) ? maxBalls : 12,
        scores: [0, 0], wickets: [0, 0], balls: [0, 0], locked: [], last: null };
      this.picks = new Map();
    }
    change() { this.state.revision++; return this.snapshot(); }
    snapshot() { return JSON.parse(JSON.stringify(this.state)); }
    player(id) { return this.state.players.find(p => p.id === id); }
    team(n) { return this.state.players.filter(p => p.team === n); }
    join(player) {
      if (!player?.id || cleanName(player.name).length < 3) throw Error('A valid player name is required.');
      const existing = this.player(player.id);
      if (existing) { existing.connected = true; this.resume(); return this.change(); }
      if (this.state.stage !== 'LOBBY') throw Error('This match has already started.');
      if (this.state.players.length >= this.capacity) throw Error('Room full. Ask the host to create another room.');
      const name = cleanName(player.name);
      if (this.state.players.some(p => p.name === name)) throw Error('This account is already in the room.');
      const team = this.team(0).length <= this.team(1).length ? 0 : 1;
      this.state.players.push({ id: player.id, name, team, connected: true, ready: false });
      return this.change();
    }
    disconnect(id) {
      const player = this.player(id);
      if (!player) return this.snapshot();
      if (this.state.stage === 'LOBBY') this.state.players = this.state.players.filter(p => p.id !== id);
      else {
        player.connected = false;
        if (!['PAUSED', 'FINISHED'].includes(this.state.stage)) {
          this.state.resumeStage = this.state.stage;
          this.state.stage = 'PAUSED';
          this.picks.clear(); this.state.locked = []; this.state.round++;
        }
      }
      return this.change();
    }
    resume() {
      if (this.state.stage === 'PAUSED' && this.state.players.every(p => p.connected)) {
        this.state.stage = this.state.resumeStage; delete this.state.resumeStage;
      }
    }
    ready(id, value) {
      if (this.state.stage !== 'LOBBY' || !this.player(id)) throw Error('Join the lobby first.');
      this.player(id).ready = Boolean(value); return this.change();
    }
    switchTeam(id) {
      if (this.state.stage !== 'LOBBY' || !this.player(id)) throw Error('Teams are locked during a match.');
      const p = this.player(id), other = 1 - p.team;
      if (this.team(other).length >= this.capacity / 2) throw Error('That team is full. Ask a player to leave before switching.');
      p.team = other; p.ready = false; return this.change();
    }
    canStart() {
      return this.state.stage === 'LOBBY' && this.state.players.length === this.capacity &&
        this.team(0).length === this.capacity / 2 && this.team(1).length === this.capacity / 2 &&
        this.state.players.every(p => p.connected && p.ready);
    }
    start(id, toss = Math.random()) {
      if (id !== this.state.host) throw Error('Only the host can start the match.');
      if (!this.canStart()) throw Error(`All ${this.capacity} connected players must be ready.`);
      this.state.match++; this.state.round++;
      this.state.scores = [0, 0]; this.state.wickets = [0, 0]; this.state.balls = [0, 0];
      this.state.last = null; this.state.winner = null; this.state.locked = []; this.picks.clear();
      this.state.tossTeam = toss < 0.5 ? 0 : 1;
      this.state.tossCaptain = this.team(this.state.tossTeam)[0].id;
      this.state.stage = 'CHOOSE'; return this.change();
    }
    choose(id, decision) {
      if (this.state.stage !== 'CHOOSE' || id !== this.state.tossCaptain || !['BAT', 'BOWL'].includes(decision)) throw Error('The toss-winning captain chooses bat or bowl.');
      this.state.batting = decision === 'BAT' ? this.state.tossTeam : 1 - this.state.tossTeam;
      this.state.firstBatting = this.state.batting; this.state.innings = 1; this.state.stage = 'PLAY';
      return this.change();
    }
    actors() {
      if (this.state.stage !== 'PLAY') return null;
      const batting = this.state.batting, bowling = 1 - batting;
      return { batter: this.team(batting)[this.state.wickets[batting]].id,
        bowler: this.team(bowling)[Math.floor(this.state.balls[batting] / 6) % this.team(bowling).length].id };
    }
    pick(id, value, round, match) {
      const actors = this.actors();
      if (!actors || round !== this.state.round || match !== this.state.match) throw Error('That turn has ended. Use the current turn.');
      if (![actors.batter, actors.bowler].includes(id)) throw Error('Wait for your turn to bat or bowl.');
      if (!Number.isInteger(value) || value < 1 || value > 6) throw Error('Choose a number from 1 to 6.');
      if (this.picks.has(id)) return this.snapshot(); // Retransmission cannot change a locked choice.
      this.picks.set(id, value); this.state.locked.push(id);
      if (this.picks.size < 2) return this.change();
      const bat = this.picks.get(actors.batter), bowl = this.picks.get(actors.bowler), team = this.state.batting;
      this.state.balls[team]++;
      if (bat === bowl) this.state.wickets[team]++; else this.state.scores[team] += bat;
      this.state.last = { bat, bowl, out: bat === bowl, batter: actors.batter, bowler: actors.bowler, round };
      this.picks.clear(); this.state.locked = []; this.state.round++;
      const chased = this.state.innings === 2 && this.state.scores[team] > this.state.scores[1 - team];
      const ended = this.state.wickets[team] >= this.team(team).length || this.state.balls[team] >= this.state.maxBalls;
      if (chased || (ended && this.state.innings === 2)) {
        this.state.stage = 'FINISHED';
        this.state.winner = this.state.scores[0] === this.state.scores[1] ? 'DRAW' : this.state.scores[0] > this.state.scores[1] ? 0 : 1;
      } else if (ended) {
        this.state.stage = 'BREAK'; this.state.batting = 1 - team; this.state.innings = 2;
      }
      return this.change();
    }
    nextInnings(id) {
      if (id !== this.state.host || this.state.stage !== 'BREAK') throw Error('The host starts the next innings.');
      this.state.stage = 'PLAY'; return this.change();
    }
    rematch(id) {
      if (id !== this.state.host || this.state.stage !== 'FINISHED') throw Error('Finish the match first.');
      this.state.players = this.state.players.filter(p => p.connected);
      this.state.players.forEach(p => { p.ready = p.id === id; });
      this.state.stage = 'LOBBY'; return this.change();
    }
    action(id, packet) {
      switch (packet?.type) {
        case 'READY': return this.ready(id, packet.ready);
        case 'TEAM': return this.switchTeam(id);
        case 'START': return this.start(id);
        case 'CHOOSE': return this.choose(id, packet.decision);
        case 'PICK': return this.pick(id, packet.value, packet.round, packet.match);
        case 'NEXT': return this.nextInnings(id);
        case 'REMATCH': return this.rematch(id);
        default: throw Error('Unknown room action.');
      }
    }
  }
  return { Room, cleanName };
});
