const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const source = fs.readFileSync('index.html', 'utf8');
const handler = source.slice(source.indexOf('      async function handleAuthSubmit()'), source.indexOf('      function boot()'));
const helper = source.slice(source.indexOf('      async function ensureUserRegisteredInFirebaseAuth('), source.indexOf('      async function pushAccountToFirebase('));
const errors = source.slice(source.indexOf('      function authErrorMessage('), source.indexOf('      async function usernameIsTaken('));
function context(overrides = {}) {
  const messages = []; const sessions = []; const busy = [];
  const ctx = {
    authBusy: false, authMode: 'LOGIN',
    el: { inputAuthUsername: { value: 'TESTER' }, inputAuthPin5: { value: '24680' } },
    readCountrySelection: () => ({ dial: '+91', cName: 'India', cFlag: 'IN' }),
    ADMIN_CONFIG: {}, FAKE_SEED_NAMES: [], RESERVED_USERNAMES: [],
    loadEncryptedUsersMap: () => ({}), loadPurgedAccountsList: () => [], isRecentSignup: () => false,
    cloudAuthoritativeAccounts: {}, saveEncryptedUsersMap() {},
    showBanner: message => messages.push(message), setAuthBusy: value => busy.push(value),
    ensureFirebaseReady: async () => true, fbDb: {}, FIREBASE_APP_ID: 'test',
    fbDoc: (...parts) => parts, fbGetDoc: async () => ({ exists: () => false }),
    withTimeout: promise => promise, console: { warn() {} },
    verifyUserCredentials: () => true, finalizePlayerSession: async p => sessions.push(p),
    updateCloudSyncedColsForUser() {}, ...overrides
  };
  vm.createContext(ctx); vm.runInContext(errors + handler, ctx);
  return { ctx, messages, sessions, busy };
}
test('a partial cloud cache does not prevent a fresh account lookup', async () => {
  const c = context({ fbGetDoc: async ref => ({ exists: () => ref.includes('accounts'), data: () => ({ encryptedAuth: 'verified', authProvider: 'pin' }) }) });
  await c.ctx.handleAuthSubmit();
  assert.equal(c.sessions.length, 1);
  assert.equal(c.sessions[0].pin5, '24680');
  assert.equal(c.busy.at(-1), false);
});
test('network errors never claim an account is missing and release the busy state', async () => {
  const c = context({ fbGetDoc: async () => { throw new Error('offline'); } });
  await c.ctx.handleAuthSubmit();
  assert.equal(c.sessions.length, 0);
  assert.ok(c.messages.some(m => m.includes('Could not verify')));
  assert.ok(!c.messages.includes('Username not found'));
  assert.equal(c.busy.at(-1), false);
});
test('Google accounts are directed to Google instead of PIN verification', async () => {
  const c = context({ loadEncryptedUsersMap: () => ({ TESTER: { googleUid: 'test-google' } }) });
  await c.ctx.handleAuthSubmit();
  assert.ok(c.messages.some(m => m.includes('Continue with Google')));
  assert.equal(c.sessions.length, 0);
  assert.equal(c.busy.at(-1), false);
});
test('wrong PIN does not create a session', async () => {
  const c = context({ loadEncryptedUsersMap: () => ({ TESTER: { encryptedAuth: 'x' } }), verifyUserCredentials: () => false });
  await c.ctx.handleAuthSubmit();
  assert.equal(c.sessions.length, 0);
  assert.ok(c.messages.includes('Username or password is wrong'));
});
test('PIN login signs in without creating or falling back to an anonymous user', async () => {
  let created = 0; let signedIn = 0;
  const ctx = { ensureFirebaseReady: async () => true, fbAuth: {}, fbUpdateProfile: null,
    fbCreateUserWithEmailAndPassword: async () => { created++; },
    fbSignInWithEmailAndPassword: async () => { signedIn++; throw new Error('wrong-password'); }
  };
  vm.createContext(ctx); vm.runInContext(helper, ctx);
  await assert.rejects(ctx.ensureUserRegisteredInFirebaseAuth('TESTER', '24680'));
  assert.equal(created, 0); assert.equal(signedIn, 1);
});


test('new PIN signup succeeds when legacy account reads are denied', async () => {
  const writes = [];
  const c = context({ authMode: 'SIGNUP',
    fbGetDoc: async ref => {
      if (ref[1] !== 'artifacts') throw Object.assign(new Error('denied'), { code: 'permission-denied' });
      return { exists: () => false };
    },
    derivePasswordVerifier: () => 'verifier',
    ensureUserRegisteredInFirebaseAuth: async () => ({ uid: 'pin-user' }),
    fbRunTransaction: async (_, run) => run({ get: async () => ({ exists: () => false }), set: (ref, data) => writes.push(data) }),
    stampRecentSignup() {}, unmarkAccountPurgedLocal() {}, unpurgeCloudAccount: async () => {}
  });
  await c.ctx.handleAuthSubmit();
  assert.equal(c.sessions.length, 1, c.messages.join('; '));
  assert.equal(writes[0].firebaseUid, 'pin-user');
  assert.equal(writes[0].pin5, undefined);
});

test('canonical permission failures are not mislabeled as internet failures', async () => {
  const c = context({ fbGetDoc: async () => { throw Object.assign(new Error('denied'), { code: 'permission-denied' }); } });
  await c.ctx.handleAuthSubmit();
  assert.equal(c.sessions.length, 0);
  assert.match(c.messages.at(-1), /server denied/);
  assert.equal(c.busy.at(-1), false);
});

test('retrying a partially saved PIN signup authenticates with the same credentials', async () => {
  let signins = 0;
  const ctx = { ensureFirebaseReady: async () => true, fbAuth: {}, fbUpdateProfile: async () => { throw Error('display name failed'); },
    fbCreateUserWithEmailAndPassword: async () => { throw Object.assign(Error('exists'), { code: 'auth/email-already-in-use' }); },
    fbSignInWithEmailAndPassword: async (_, email, password) => {
      assert.equal(email, 'tester@oddandeven.in'); assert.equal(password, 'OAE#24680_tester');
      signins++; return { user: { uid: 'existing-auth-user' } };
    }
  };
  vm.createContext(ctx); vm.runInContext(helper, ctx);
  assert.equal((await ctx.ensureUserRegisteredInFirebaseAuth('TESTER', '24680', true)).uid, 'existing-auth-user');
  assert.equal(signins, 1);
});

const reserve = source.slice(source.indexOf('      async function reserveGoogleUsername('), source.indexOf('      function chooseGoogleUsername('));
function googleContext(overrides = {}) {
  const writes = []; const saved = [];
  const ctx = { loadEncryptedUsersMap: () => ({}), cloudAuthoritativeAccounts: {},
    ensureFirebaseReady: async () => true, fbDb: {}, FIREBASE_APP_ID: 'test',
    fbDoc: (...parts) => parts, withTimeout: p => p,
    fbRunTransaction: async (_, run) => run({ get: async () => ({ exists: () => false }), set: (ref, data) => writes.push({ ref, data }) }),
    saveGoogleUidMapEntry: (...args) => saved.push(args), ...overrides
  };
  vm.createContext(ctx); vm.runInContext(errors + reserve, ctx);
  return { ctx, writes, saved };
}
const googleUser = { uid: 'google-uid', email: 'test@example.test' };
const country = { dial: '+91', cName: 'India', cFlag: 'IN' };
test('Google signup commits both account and private UID profile', async () => {
  const c = googleContext();
  assert.equal((await c.ctx.reserveGoogleUsername('TESTER', googleUser, country)).ok, true);
  assert.equal(c.writes.length, 2);
  assert.equal(c.writes[0].data.firebaseUid, googleUser.uid);
  assert.equal(c.writes[1].data.username, 'TESTER');
  assert.equal(c.saved.length, 1);
});
test('failed Google profile save never caches or reports a completed signup', async () => {
  const c = googleContext({ fbRunTransaction: async () => { throw Object.assign(Error('denied'), { code: 'permission-denied' }); } });
  const res = await c.ctx.reserveGoogleUsername('TESTER', googleUser, country);
  assert.equal(res.ok, false); assert.match(res.error, /server denied/);
  assert.equal(c.saved.length, 0);
});
test('Google signup does not overwrite another UID after a username race', async () => {
  let written = false;
  const c = googleContext({ fbRunTransaction: async (_, run) => run({
    get: async () => ({ exists: () => true, data: () => ({ googleUid: 'other-user' }) }),
    set: () => { written = true; }
  }) });
  const res = await c.ctx.reserveGoogleUsername('TESTER', googleUser, country);
  assert.equal(res.ok, false); assert.match(res.error, /already created/);
  assert.equal(written, false); assert.equal(c.saved.length, 0);
});
test('Google signup retry preserves the original account creation date', async () => {
  const writes = [];
  const c = googleContext({ fbRunTransaction: async (_, run) => run({
    get: async () => ({ exists: () => true, data: () => ({ googleUid: googleUser.uid, createdAt: 'original-date' }) }),
    set: (_, data) => writes.push(data)
  }) });
  assert.equal((await c.ctx.reserveGoogleUsername('TESTER', googleUser, country)).ok, true);
  assert.equal(writes[0].createdAt, 'original-date');
});
test('blocked Firebase API is diagnosed separately from an internet failure', async () => {
  const c = googleContext({ FIREBASE_CONFIG: { apiKey: 'public-test-key' },
    fetch: async () => ({ ok: false, json: async () => ({ error: { status: 'PERMISSION_DENIED', details: [{ reason: 'API_KEY_SERVICE_BLOCKED' }] } }) })
  });
  const message = await c.ctx.describeAuthError({ code: 'auth/network-request-failed' }, 'Google');
  assert.match(message, /misconfigured/); assert.doesNotMatch(message, /Check your connection/);
});
test('real network failures retain retry guidance when diagnostics also fail', async () => {
  const c = googleContext({ FIREBASE_CONFIG: { apiKey: 'test' }, fetch: async () => { throw Error('offline'); } });
  assert.match(await c.ctx.describeAuthError({ code: 'auth/network-request-failed' }, 'PIN'), /Check your connection/);
});
test('failed Firebase login cannot persist a local session or launch the arena', async () => {
  let wrote = false;
  const start = source.indexOf('      async function finalizePlayerSession(');
  const end = source.indexOf('      function ', start);
  const ctx = { el: { inputAuthPin5: { value: '24680' } },
    ensureUserRegisteredInFirebaseAuth: async () => { throw Error('auth failure'); },
    sessionStorage: { setItem() { wrote = true; } }, localStorage: { setItem() { wrote = true; } }
  };
  vm.createContext(ctx); vm.runInContext(source.slice(start, end), ctx);
  await assert.rejects(ctx.finalizePlayerSession({ username: 'TESTER' }), /auth failure/);
  assert.equal(wrote, false);
});


test('successful PIN login persists the authenticated UID before navigation', async () => {
  const events = []; const storage = new Map();
  const start = source.indexOf('      async function finalizePlayerSession(');
  const end = source.indexOf('      function ', start);
  const store = { setItem: (key, value) => { events.push('save'); storage.set(key, value); }, getItem: () => null, removeItem() {} };
  const ctx = {
    el: { inputAuthPin5: { value: '24680' } }, authMode: 'LOGIN',
    ensureUserRegisteredInFirebaseAuth: async () => { await Promise.resolve(); events.push('authenticated'); return { uid: 'verified-uid' }; },
    sessionStorage: store, localStorage: store, SESSION_STORAGE_KEY: 'session', SIGNED_OUT_FLAG_KEY: 'signed-out',
    encryptPayload: JSON.stringify, loadWorldwidePlayersMap: () => ({}), saveWorldwidePlayersMap() {},
    broadcastWorldwideSync() {}, updateUIState() {}, showBanner() {},
    withTimeout: p => p, pushAccountToFirebase: async () => true, pushLeaderboardSeedToFirebase: async () => {},
    navigateToHandCricketArena: () => events.push('navigate')
  };
  vm.createContext(ctx); vm.runInContext(source.slice(start, end), ctx);
  await ctx.finalizePlayerSession({ username: 'TESTER', pin5: '24680' });
  assert.equal(events[0], 'authenticated'); assert.equal(events.at(-1), 'navigate');
  assert.equal(JSON.parse(storage.get('session')).firebaseUid, 'verified-uid');
});

test('unavailable Google account lookup cannot be interpreted as a new user', async () => {
  const start = source.indexOf('      async function lookupGoogleAccount(');
  const end = source.indexOf('      // Best-effort: refresh lastLoginAt', start);
  const ctx = { loadPurgedAccountsList: () => [], loadGoogleUidMap: () => ({}), loadEncryptedUsersMap: () => ({}),
    ensureFirebaseReady: async () => true, fbReady: true, fbDb: {}, FIREBASE_APP_ID: 'test',
    fbDoc: (...p) => p, fbCollection: (...p) => p, fbQueryFn: null, fbWhereFn: null,
    fbGetDoc: async () => ({ exists: () => false }),
    fbGetDocs: async () => { throw Object.assign(Error('offline'), { code: 'unavailable' }); },
    withTimeout: p => p
  };
  vm.createContext(ctx); vm.runInContext(source.slice(start, end), ctx);
  await assert.rejects(ctx.lookupGoogleAccount(googleUser), /offline/);
});

test('desktop account verification does not report a failed read as a missing account', async () => {
  const desktop = fs.readFileSync('hand_cricket.js', 'utf8');
  const start = desktop.indexOf('      window.__verifyCloudAccount =');
  const end = desktop.indexOf('      window.__creditReferralInCloud', start);
  const ctx = { window: {}, db: {}, appId: 'test', doc: (...p) => p,
    getDoc: async () => { throw Error('offline'); }, isRecentCloudSignup: () => false, loadCloudSyncedCols: () => ({})
  };
  vm.createContext(ctx); vm.runInContext(desktop.slice(start, end), ctx);
  assert.equal((await ctx.window.__verifyCloudAccount('TESTER')).checked, false);
});


test('disabled Email/Password reports that the PIN has not been checked', () => {
  const c = googleContext();
  assert.match(c.ctx.authErrorMessage({ code: 'auth/operation-not-allowed' }, 'PIN'), /PIN has not been checked/);
  assert.match(c.ctx.authErrorMessage({ message: 'PASSWORD_LOGIN_DISABLED' }, 'PIN'), /disabled by the website/);
});
test('invalid Google credentials are never described as a wrong username or PIN', () => {
  const c = googleContext();
  const message = c.ctx.authErrorMessage({ code: 'auth/invalid-credential' }, 'Google');
  assert.match(message, /Continue with Google/);
  assert.doesNotMatch(message, /Username or password|PIN/);
});
test('Google OAuth configuration errors are distinct from account credentials', () => {
  const c = googleContext();
  for (const error of [{ code: 'auth/invalid-oauth-client-id' }, { message: 'redirect_uri_mismatch' }]) {
    assert.match(c.ctx.authErrorMessage(error, 'Google'), /Google configuration needs updating/);
  }
});
