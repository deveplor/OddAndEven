(() => {
  const params = new URLSearchParams(location.search);
  const page = { PROFILE: 'profile.html', STORE: 'store.html', MP_SETUP: 'rooms.html' }[(params.get('screen') || '').toUpperCase()];
  if (page) location.replace(page + '?view=' + (location.pathname.endsWith('mobile.html') ? 'mobile' : 'desktop'));
})();
