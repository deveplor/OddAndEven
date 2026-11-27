(function () {
  'use strict';
  const icon = name => `<svg class="hub-icon" aria-hidden="true"><use href="arena-icons.svg#${name}"></use></svg>`;
  window.OAEIcons = { icon, item: item => icon(item.id.startsWith('bat_') ? 'bat' : item.id.startsWith('theme_') ? 'pitch' : item.category === 'CARDS' || item.category === 'CUSTOM' ? 'card' : item.id.startsWith('badge_') ? 'shield' : item.category === 'BANNERS' ? 'flag' : 'spark') };
  document.addEventListener('DOMContentLoaded', () => {
    const profile = document.body.classList.contains('profile-hub');
    const mobile = new URLSearchParams(location.search).get('view') === 'mobile' || (!new URLSearchParams(location.search).has('view') && matchMedia('(max-width: 767px)').matches);
    const view = mobile ? 'mobile' : 'desktop';
    const main = document.querySelector('main');
    if (!main) return;
    const intro = document.createElement('section'); intro.className = 'hub-intro';
    intro.innerHTML = `<div class="hub-eyebrow">${icon('brand')} ODD &amp; EVEN / PLAYER HUB</div><h1>${profile ? 'Your game. Your identity.' : 'Make it your arena.'}</h1><p>${profile ? 'Your player card, match history, and account in one place.' : 'Spend earned XP on player cards, badges, and pitch cosmetics.'}</p><nav aria-label="Player hub"><a href="profile.html?view=${view}" ${profile ? 'aria-current="page"' : ''}>${icon('user')}Profile</a><a href="store.html?view=${view}" ${!profile ? 'aria-current="page"' : ''}>${icon('bag')}Store</a><a href="rooms.html?view=${view}">${icon('rooms')}Rooms</a><a href="${mobile ? 'mobile.html' : 'hand_cricket.html'}">${icon('pitch')}Arena</a></nav>`;
    main.prepend(intro);
    document.querySelectorAll('a[href="mobile.html"]').forEach(a => { a.href = mobile ? 'mobile.html' : 'hand_cricket.html'; a.setAttribute('aria-label', 'Return to arena'); });
    // Keep advanced panels available without making the first screen a wall of cards.
    if (profile) {
      for (const [id, label] of [['accountInformationSection', 'Account details'], ['profileEsportsGamerCardSection', 'Player card studio'], ['unlockedCardsSection', 'Your collection']]) {
        const section = document.getElementById(id); if (!section) continue;
        const details = document.createElement('details'); details.className = 'hub-details';
        const summary = document.createElement('summary'); summary.textContent = label;
        section.before(details); details.append(summary, section);
      }
      const actions = document.getElementById('accountActions');
      const identityCard = main.querySelector('.glass-card-glow');
      if (actions && identityCard) identityCard.after(actions);
      const signedIn = window.OAEAccountSession.active(localStorage, sessionStorage);
      for (const id of ['btnSignOutAccount', 'btnDangerRemoveAccount']) {
        const button = document.getElementById(id); if (button) button.disabled = !signedIn;
      }
      if (signedIn) {
        let matches = [];
        try { matches = JSON.parse(localStorage.getItem('oddandeven_room_history_' + signedIn.username) || '[]'); } catch (_) {}
        if (Array.isArray(matches) && matches.length) {
          const history = document.createElement('section'); history.className = 'glass-card hub-room-history';
          const title = document.createElement('h2'); title.textContent = 'Recent room matches'; history.append(title);
          for (const match of matches.slice(0, 5)) {
            const row = document.createElement('p');
            row.textContent = `${match.format || 'Room'} · ${match.teams?.[0] || 'Team A'} ${match.scores?.[0] ?? 0} — ${match.scores?.[1] ?? 0} ${match.teams?.[1] || 'Team B'} · ${match.winner === 'DRAW' ? 'Draw' : 'Team ' + (match.winner ? 'B' : 'A') + ' won'}`;
            history.append(row);
          }
          actions.after(history);
        }
      }
    } else {
      const showcase = document.getElementById('card3dInner')?.closest('section');
      if (showcase) {
        const details = document.createElement('details'); details.className = 'hub-details';
        const summary = document.createElement('summary'); summary.textContent = 'Your equipped player card';
        showcase.before(details); details.append(summary, showcase);
      }
    }
  });
})();
