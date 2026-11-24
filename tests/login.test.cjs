const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const source = fs.readFileSync('index.html', 'utf8');
const handler = source.slice(source.indexOf('      async function handleAuthSubmit()'), source.indexOf('      function boot()'));
const helper = source.slice(source.indexOf('      async function ensureUserRegisteredInFirebaseAuth('), source.indexOf('      async function pushAccountToFirebase('));
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
  vm.createContext(ctx); vm.runInContext(handler, ctx);
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
