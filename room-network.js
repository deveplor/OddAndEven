(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./room-engine.js'));
  else root.OAERoomNetwork = factory(root.OAERoom);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (engine) {
  'use strict';
  class Network {
    constructor(PeerClass, identity, onState, onStatus) {
      this.PeerClass = PeerClass; this.identity = identity; this.onState = onState; this.onStatus = onStatus;
      this.connections = new Map(); this.tokens = new Map(); this.pending = new Set(); this.generation = 0;
    }
    status(message, error = false) { this.onStatus(message, error); }
    send(connection, packet) { if (connection?.open) connection.send(packet); }
    publish() {
      const state = this.room.snapshot(); this.onState(state);
      this.connections.forEach(c => this.send(c, { type: 'STATE', state }));
    }
    async openPeer(id) {
      if (!this.PeerClass) throw Error('The room service could not load. Reload the page and check your connection.');
      const generation = this.generation;
      const peer = this.peer = id ? new this.PeerClass(id) : new this.PeerClass();
      return new Promise((resolve, reject) => {
        let opened = false;
        const timer = setTimeout(() => reject(Error('Room service did not respond. Retry on a stable connection.')), 15000);
        peer.on('open', () => { if (generation !== this.generation) return; clearTimeout(timer); opened = true; resolve(peer); });
        peer.on('error', error => {
          if (generation !== this.generation) return;
          const message = error.type === 'unavailable-id' ? 'That room code is already in use. Create a new room.' :
            error.type === 'peer-unavailable' ? 'Room not found. Check the code and keep the host page open.' :
              'Connection failed. Retry, or try another network if peer connections are blocked.';
          clearTimeout(timer); if (!opened) reject(Error(message)); else this.status(message, true);
        });
        peer.on('disconnected', () => {
          if (generation === this.generation && !peer.destroyed) {
            this.status('Room discovery disconnected. Reconnecting…');
            try { peer.reconnect(); } catch (_) { this.status('Could not reconnect. Leave and rejoin the room.', true); }
          }
        });
        this.peerTimer = timer;
      });
    }
    async host(code, format, maxBalls) {
      this.close(); const generation = this.generation;
      this.role = 'HOST'; this.code = code;
      this.room = new engine.Room(format, this.identity, maxBalls);
      const peer = await this.openPeer('oae-v25-' + code);
      if (generation !== this.generation) return;
      peer.on('connection', connection => this.accept(connection, generation));
      this.publish(); this.status('Room is open. Share the code or invite link.');
    }
    accept(connection, generation) {
      if (generation !== this.generation || this.pending.size >= 8) { connection.close(); return; }
      this.pending.add(connection);
      let playerId = null;
      const timer = setTimeout(() => { if (!playerId) connection.close(); this.pending.delete(connection); }, 10000);
      connection.on('data', packet => {
        if (generation !== this.generation || !packet || typeof packet !== 'object') return;
        try {
          if (!playerId) {
            if (packet.type !== 'HELLO' || packet.protocol !== 1 || !/^[a-zA-Z0-9-]{8,64}$/.test(packet.id) || !/^[a-zA-Z0-9-]{16,80}$/.test(packet.token)) throw Error('This room needs the latest game version. Reload and retry.');
            const knownToken = this.tokens.get(packet.id);
            if (knownToken && knownToken !== packet.token) throw Error('This player session is already in use.');
            if (this.connections.get(packet.id)?.open) throw Error('This player is already connected.');
            this.room.join({ id: packet.id, name: packet.name });
            playerId = packet.id; this.tokens.set(playerId, packet.token); this.connections.set(playerId, connection);
            clearTimeout(timer); this.pending.delete(connection); this.publish(); return;
          }
          if (packet.type === 'LEAVE') { connection.close(); return; }
          // Identity comes from the accepted connection, never from action payloads.
          this.room.action(playerId, packet); this.publish();
        } catch (error) { this.send(connection, { type: 'ERROR', message: error.message }); }
      });
      const disconnected = () => {
        clearTimeout(timer); this.pending.delete(connection);
        if (generation !== this.generation || !playerId || this.connections.get(playerId) !== connection) return;
        this.connections.delete(playerId); this.room.disconnect(playerId); this.publish();
      };
      connection.on('close', disconnected); connection.on('error', disconnected);
    }
    async join(code) {
      this.close(); const generation = this.generation;
      this.role = 'GUEST'; this.code = code;
      const peer = await this.openPeer();
      if (generation !== this.generation) return;
      const connection = this.hostConnection = peer.connect('oae-v25-' + code, { reliable: true, serialization: 'json' });
      this.joinTimer = setTimeout(() => {
        if (generation === this.generation && !this.receivedState) this.status('Could not join. Confirm the host is online; try another network if needed.', true);
      }, 18000);
      connection.on('open', () => this.send(connection, { type: 'HELLO', protocol: 1, ...this.identity }));
      connection.on('data', packet => {
        if (generation !== this.generation || !packet || typeof packet !== 'object') return;
        if (packet.type === 'STATE' && packet.state?.version === 1 && Array.isArray(packet.state.players)) {
          if (this.receivedState && packet.state.revision <= this.receivedState.revision) return;
          this.receivedState = packet.state; clearTimeout(this.joinTimer);
          this.status('Connected to room ' + code); this.onState(packet.state);
        } else if (packet.type === 'ERROR') this.status(String(packet.message).slice(0, 240), true);
        else if (packet.type === 'CLOSED') this.status('The host closed this room. Leave and create or join another room.', true);
      });
      const disconnected = () => {
        if (generation !== this.generation) return;
        clearTimeout(this.joinTimer); this.status('Host connection lost. Select Reconnect while the host keeps the room open.', true);
        if (this.receivedState) this.onState({ ...this.receivedState, stage: 'DISCONNECTED' });
      };
      connection.on('close', disconnected); connection.on('error', disconnected);
    }
    action(packet) {
      try {
        if (this.role === 'HOST') { this.room.action(this.identity.id, packet); this.publish(); }
        else if (this.hostConnection?.open) this.send(this.hostConnection, packet);
        else throw Error('Not connected. Reconnect before playing.');
      } catch (error) { this.status(error.message, true); }
    }
    close() {
      this.generation++; clearTimeout(this.peerTimer); clearTimeout(this.joinTimer);
      this.connections.forEach(c => { try { this.send(c, { type: 'CLOSED' }); c.close(); } catch (_) {} });
      this.pending.forEach(c => { try { c.close(); } catch (_) {} });
      try { this.send(this.hostConnection, { type: 'LEAVE' }); this.hostConnection?.close(); this.peer?.destroy(); } catch (_) {}
      this.connections.clear(); this.pending.clear(); this.tokens.clear();
      this.peer = null; this.hostConnection = null; this.room = null; this.receivedState = null;
    }
  }
  return { Network };
});
