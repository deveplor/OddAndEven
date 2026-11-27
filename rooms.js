(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const session = OAEAccountSession.active(localStorage, sessionStorage);
  const params = new URLSearchParams(location.search);
  const mobile = params.get('view') === 'mobile' || (!params.has('view') && matchMedia('(max-width: 767px)').matches);
  $('backArena').href = mobile ? 'mobile.html' : 'hand_cricket.html';
  $('guestGate').hidden = Boolean(session); $('playerName').textContent = session ? '@' + session.username : 'Guest';
  if (params.get('format') === '2V2') $('format').value = '2V2';
  $('joinCode').value = String(params.get('room') || '').toUpperCase().slice(0, 10);
  let state = null, code = '', busy = false, submitted = '', network = null, recorded = '';
  function status(message, error = false) { $('connectionStatus').textContent = message; $('connectionStatus').classList.toggle('error', error); }
  function setBusy(value) { busy = value; $('createRoom').disabled = value || !session; $('joinRoom').disabled = value || !session; }
  setBusy(false);
  let identity;
  if (session) {
    const key = 'oddandeven_room_identity_' + session.username;
    try { identity = JSON.parse(sessionStorage.getItem(key) || 'null'); } catch (_) {}
    if (!identity?.id || !identity?.token) {
      identity = { id: crypto.randomUUID(), token: crypto.randomUUID(), name: session.username };
      sessionStorage.setItem(key, JSON.stringify(identity));
    }
    identity.name = session.username;
    network = new OAERoomNetwork.Network(window.Peer, identity, render, status);
  }
  function name(id) { return state.players.find(p => p.id === id)?.name || 'Player'; }
  function actors() {
    if (state.stage !== 'PLAY') return null;
    const batters = state.players.filter(p => p.team === state.batting), bowlers = state.players.filter(p => p.team !== state.batting);
    return { batter: batters[state.wickets[state.batting]]?.id, bowler: bowlers[Math.floor(state.balls[state.batting] / 6) % bowlers.length]?.id };
  }
  function recordResult() {
    const id = `${code}:${state.match}`;
    if (recorded === id) return;
    recorded = id;
    try {
      const key = 'oddandeven_room_history_' + session.username;
      const history = JSON.parse(localStorage.getItem(key) || '[]');
      const entry = { id, date: new Date().toISOString(), format: state.format, scores: state.scores,
        teams: [0, 1].map(n => state.players.filter(p => p.team === n).map(p => p.name).join(' + ')), winner: state.winner };
      localStorage.setItem(key, JSON.stringify([entry, ...(Array.isArray(history) ? history.filter(x => x.id !== id) : [])].slice(0, 20)));
    } catch (_) { status('Match finished. Browser storage is full, so this result could not be saved.', true); }
  }
  function render(next) {
    state = next;
    $('roomSetup').hidden = true; $('liveRoom').hidden = false; $('roomCode').textContent = code;
    $('formatLabel').textContent = `${state.format === '2V2' ? '2v2 SQUAD' : '1v1 DUEL'} · ${state.maxBalls / 6} OVERS`;
    const me = state.players.find(p => p.id === identity.id), host = state.host === identity.id;
    [0, 1].forEach(team => {
      const suffix = team ? 'B' : 'A';
      $('score' + suffix).replaceChildren(document.createTextNode(String(state.scores[team])), Object.assign(document.createElement('small'), { textContent: ' / ' + state.wickets[team] }));
      $('overs' + suffix).textContent = `${Math.floor(state.balls[team] / 6)}.${state.balls[team] % 6} / ${state.maxBalls / 6} overs`;
      const roster = $('team' + suffix); roster.replaceChildren();
      const members = state.players.filter(p => p.team === team);
      for (let i = 0; i < (state.format === '2V2' ? 2 : 1); i++) {
        const p = members[i], li = document.createElement('li');
        if (!p) { li.className = 'vacant'; li.textContent = 'Waiting for player'; }
        else {
          const label = document.createElement('span'); label.textContent = p.name + (p.id === identity.id ? ' · You' : '') + (i === 0 ? ' (C)' : '');
          const badge = document.createElement('small'); badge.textContent = !p.connected ? 'Disconnected' : p.ready ? 'Ready' : 'Not ready';
          li.append(label, badge);
        }
        roster.append(li);
      }
    });
    $('lobbyControls').hidden = state.stage !== 'LOBBY'; $('startMatch').hidden = !host;
    $('startMatch').disabled = state.players.length !== (state.format === '2V2' ? 4 : 2) || !state.players.every(p => p.connected && p.ready);
    $('readyButton').textContent = me?.ready ? 'Ready ✓ · Undo' : 'I’m ready';
    $('switchTeam').hidden = state.format !== '2V2';
    $('tossControls').hidden = !(state.stage === 'CHOOSE' && state.tossCaptain === identity.id);
    $('nextInnings').hidden = !(state.stage === 'BREAK' && host); $('rematch').hidden = !(state.stage === 'FINISHED' && host);
    $('reconnect').hidden = host || state.stage !== 'DISCONNECTED';
    $('numberChoices').hidden = state.stage !== 'PLAY';
    $('roundLabel').textContent = state.stage === 'PLAY' ? `INNINGS ${state.innings} · TURN ${state.round}` : state.stage;
    const active = actors(), myTurn = active && [active.batter, active.bowler].includes(identity.id);
    const turnKey = `${state.match}:${state.round}`;
    if (submitted && submitted !== turnKey) submitted = '';
    document.querySelectorAll('[data-number]').forEach(b => { b.disabled = !myTurn || state.locked.includes(identity.id) || submitted === turnKey; });
    $('lastBall').textContent = state.last ? `${name(state.last.batter)} played ${state.last.bat} · ${name(state.last.bowler)} bowled ${state.last.bowl} · ${state.last.out ? 'Wicket!' : '+' + state.last.bat + ' runs'}` : '';
    let title = '', hint = '';
    if (state.stage === 'LOBBY') { title = `${state.players.length}/${state.format === '2V2' ? 4 : 2} players connected`; hint = 'Mark ready when you are settled. The host starts when everyone is ready.'; }
    if (state.stage === 'CHOOSE') { title = `Team ${state.tossTeam ? 'B' : 'A'} won the toss`; hint = `${name(state.tossCaptain)} chooses whether to bat or bowl.`; }
    if (state.stage === 'PLAY') {
      title = myTurn ? (active.batter === identity.id ? 'You’re batting.' : 'You’re bowling.') : 'Watch your teammates.';
      hint = state.locked.includes(identity.id) || submitted === turnKey ? 'Your number is locked. Waiting for the other player.' : `${name(active.batter)} bats · ${name(active.bowler)} bowls. ${myTurn ? 'Pick a number from 1 to 6.' : 'Your controls unlock when it is your turn.'}`;
      if (state.innings === 2) hint += ` Target: ${state.scores[state.firstBatting] + 1}.`;
    }
    if (state.stage === 'BREAK') { title = `Target: ${state.scores[state.firstBatting] + 1}`; hint = 'First innings complete. The host starts the chase.'; }
    if (state.stage === 'PAUSED') { title = 'Match paused'; hint = 'A player disconnected. Choices were cleared; the match resumes when they reconnect with this tab.'; }
    if (state.stage === 'DISCONNECTED') { title = 'Connection lost'; hint = 'Reconnect to resume. If the host closed the page, create a new room.'; }
    if (state.stage === 'FINISHED') { title = state.winner === 'DRAW' ? 'Match drawn.' : `Team ${state.winner ? 'B' : 'A'} wins!`; hint = 'Result saved to your local room history. The host can open the lobby for a rematch.'; recordResult(); }
    $('phaseTitle').textContent = title; $('phaseHint').textContent = hint;
  }
  async function enter(host) {
    if (busy || !session) return;
    if (!host && !/^OAE-[A-Z2-9]{6}$/.test($('joinCode').value.trim().toUpperCase())) { status('Enter the full room code, for example OAE-ABC234.', true); return; }
    setBusy(true); submitted = ''; state = null;
    try {
      if (host) {
        const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
        code = 'OAE-' + Array.from(crypto.getRandomValues(new Uint8Array(6)), n => alphabet[n % alphabet.length]).join('');
        status('Opening your room…'); await network.host(code, $('format').value, Number($('overs').value));
      } else { code = $('joinCode').value.trim().toUpperCase(); status('Connecting to ' + code + '…'); await network.join(code); }
    } catch (error) { network.close(); status(error.message, true); }
    finally { setBusy(false); }
  }
  $('createForm').addEventListener('submit', e => { e.preventDefault(); enter(true); });
  $('joinForm').addEventListener('submit', e => { e.preventDefault(); enter(false); });
  $('joinCode').addEventListener('input', () => { $('joinCode').value = $('joinCode').value.toUpperCase().replace(/[^A-Z0-9-]/g, ''); });
  function action(packet) { if (network) { status('Room ' + code + ' · Connected'); network.action(packet); } }
  $('readyButton').onclick = () => action({ type: 'READY', ready: !state.players.find(p => p.id === identity.id)?.ready });
  $('switchTeam').onclick = () => action({ type: 'TEAM' }); $('startMatch').onclick = () => action({ type: 'START' });
  $('chooseBat').onclick = () => action({ type: 'CHOOSE', decision: 'BAT' }); $('chooseBowl').onclick = () => action({ type: 'CHOOSE', decision: 'BOWL' });
  $('nextInnings').onclick = () => action({ type: 'NEXT' }); $('rematch').onclick = () => action({ type: 'REMATCH' });
  function pick(button) {
    if (button.disabled || !state || state.stage !== 'PLAY') return;
    submitted = `${state.match}:${state.round}`;
    const packet = { type: 'PICK', value: Number(button.dataset.number), round: state.round, match: state.match };
    render(state); action(packet);
  }
  document.querySelectorAll('[data-number]').forEach(button => button.onclick = () => pick(button));
  document.addEventListener('keydown', event => {
    if (event.repeat || /INPUT|SELECT|TEXTAREA/.test(event.target.tagName) || !/^[1-6]$/.test(event.key)) return;
    const button = document.querySelector(`[data-number="${event.key}"]`); if (button && !button.disabled) { event.preventDefault(); pick(button); }
  });
  $('copyInvite').onclick = async () => {
    const link = new URL('rooms.html', location.href); link.searchParams.set('room', code);
    try { await navigator.clipboard.writeText(link.href); status('Invite link copied. Send it to your friends.'); }
    catch (_) { status('Copy this invite link: ' + link.href); }
  };
  $('leaveRoom').onclick = () => {
    if (state && !['LOBBY', 'FINISHED', 'DISCONNECTED'].includes(state.stage) && !confirm('Leave this match? The host leaving closes the room for everyone.')) return;
    network.close(); state = null; $('liveRoom').hidden = true; $('roomSetup').hidden = false; status('You left the room.'); setBusy(false);
  };
  $('reconnect').onclick = async () => { status('Reconnecting…'); try { await network.join(code); } catch (e) { status(e.message, true); } };
  window.addEventListener('pagehide', () => network?.close());
  if (params.get('create') === '1' && session) enter(true);
})();
