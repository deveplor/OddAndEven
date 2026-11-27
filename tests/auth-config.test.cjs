const { test } = require('node:test');
const assert = require('node:assert/strict');
const { checkAuth } = require('../scripts/check-auth.cjs');
const config = { apiKey: 'public-test-key', authDomain: 'test.firebaseapp.com', origin: 'https://game.example' };
const reply = (status, data) => ({ status, ok: status === 200, json: async () => data });

test('configuration diagnostics catch a disabled PIN provider and blocked popup origin independently', async () => {
  const requests = [];
  const results = await checkAuth(config, async (url, options) => {
    requests.push({ url, options });
    if (url.includes('/projects?')) return reply(200, { authorizedDomains: ['game.example'] });
    if (url.includes('signInWithPassword')) return reply(400, { error: { message: 'PASSWORD_LOGIN_DISABLED' } });
    if (options.headers.Referer === 'https://test.firebaseapp.com/') {
      return reply(403, { error: { details: [{ reason: 'API_KEY_HTTP_REFERRER_BLOCKED' }] } });
    }
    return reply(200, { authUri: 'https://accounts.google.com/o/oauth2/auth' });
  });
  assert.deepEqual(results.map(r => r.ok), [true, false, true, false]);
  assert.match(results[1].message, /Enable Email\/Password/);
  assert.match(results[3].message, /https:\/\/test.firebaseapp.com\/\*/);
  assert.ok(requests.every(r => !r.url.includes('signUp')));
  assert.equal(JSON.parse(requests.find(r => r.url.includes('signInWithPassword')).options.body).email, 'firebase-config-check@example.invalid');
});

test('configuration diagnostics pass after both providers and origins respond correctly', async () => {
  const results = await checkAuth(config, async url => {
    if (url.includes('/projects?')) return reply(200, { authorizedDomains: ['game.example'] });
    if (url.includes('signInWithPassword')) return reply(400, { error: { message: 'INVALID_LOGIN_CREDENTIALS' } });
    return reply(200, { authUri: 'https://accounts.google.com/o/oauth2/auth' });
  });
  assert.ok(results.every(r => r.ok));
});

test('rate limiting and unexpected Google authorization hosts never produce false passes', async () => {
  const results = await checkAuth(config, async url => {
    if (url.includes('/projects?')) return reply(200, { authorizedDomains: ['wrong.example'] });
    if (url.includes('signInWithPassword')) return reply(400, { error: { message: 'TOO_MANY_ATTEMPTS_TRY_LATER' } });
    return reply(200, { authUri: 'https://unexpected.example/' });
  });
  assert.ok(results.every(r => !r.ok));
});
