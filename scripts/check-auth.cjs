// Live configuration checks only: no account creation, cloud writes, or saved credentials.
const fs = require('node:fs');
const path = require('node:path');

async function checkAuth(config, request = fetch) {
  const helperOrigin = `https://${config.authDomain}`;
  const endpoint = 'https://identitytoolkit.googleapis.com/v1/';
  async function probe(name, method, referrer, body, accept) {
    try {
      const response = await request(endpoint + method + '?key=' + encodeURIComponent(config.apiKey), {
        method: body ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json', Referer: referrer + '/' },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(12000)
      });
      const data = await response.json();
      const message = data.error?.message || '';
      const reasons = (data.error?.details || []).map(item => item.reason).filter(Boolean);
      const detail = [message, ...reasons].join(' ');
      if (accept(response, data, message)) return { name, ok: true, message: 'Configuration check passed' };
      let fix = 'Inspect Firebase Authentication provider settings and API restrictions.';
      if (/PASSWORD_LOGIN_DISABLED/.test(detail) || (name === 'PIN provider' && /OPERATION_NOT_ALLOWED/.test(detail))) {
        fix = 'Enable Email/Password in Firebase Authentication > Sign-in method (PIN accounts use this provider).';
      } else if (/API_KEY_HTTP_REFERRER_BLOCKED/.test(detail)) {
        fix = `Add ${referrer}/* to the API key website restrictions; keep existing allowed websites.`;
      } else if (/API_KEY_SERVICE_BLOCKED/.test(detail)) {
        fix = 'Allow Identity Toolkit API and Token Service API in the API key restrictions.';
      } else if (/CONFIGURATION_NOT_FOUND|INVALID_OAUTH_CLIENT_ID|OPERATION_NOT_SUPPORTED|OPERATION_NOT_ALLOWED/.test(detail)) {
        fix = 'Enable Google in Firebase Authentication and verify its web OAuth client configuration.';
      }
      return { name, ok: false, message: `HTTP ${response.status}: ${message || reasons.join(', ') || 'unexpected response'}. ${fix}` };
    } catch (error) {
      // Never print full request URLs or response payloads (which may contain tokens).
      return { name, ok: false, message: `Could not complete check (${error.name || 'network error'}). Retry with network access.` };
    }
  }
  const googleBody = { providerId: 'google.com', continueUri: helperOrigin + '/__/auth/handler', oauthScope: 'openid email profile' };
  const googleAccepted = (response, data) => {
    if (!response.ok || !data.authUri) return false;
    try { return new URL(data.authUri).origin === 'https://accounts.google.com'; } catch { return false; }
  };
  return Promise.all([
    probe('Production domain', 'projects', config.origin, null,
      (response, data) => response.ok && data.authorizedDomains?.includes(new URL(config.origin).hostname)),
    probe('PIN provider', 'accounts:signInWithPassword', config.origin,
      { email: 'firebase-config-check@example.invalid', password: 'diagnostic-not-a-user-password', returnSecureToken: true },
      // A deliberately nonexistent identity must be rejected as credentials, not a disabled provider.
      (response, data, message) => response.status === 400 && ['INVALID_LOGIN_CREDENTIALS', 'EMAIL_NOT_FOUND', 'INVALID_PASSWORD'].includes(message)),
    probe('Google from website', 'accounts:createAuthUri', config.origin, googleBody, googleAccepted),
    probe('Google from Firebase popup', 'accounts:createAuthUri', helperOrigin, googleBody, googleAccepted)
  ]);
}

async function main() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const apiKey = source.match(/apiKey:\s*'([^']+)'/)?.[1];
  const authDomain = source.match(/authDomain:\s*'([^']+)'/)?.[1];
  const canonical = source.match(/rel="canonical" href="([^"]+)"/)?.[1];
  if (!apiKey || !authDomain || !canonical) throw new Error('Firebase configuration or canonical URL missing from index.html');
  const origin = new URL(process.argv[2] || canonical).origin;
  console.log(`Checking Firebase configuration for ${origin}`);
  const results = await checkAuth({ apiKey, authDomain, origin });
  for (const result of results) console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.name}: ${result.message}`);
  console.log('These probes do not verify account creation, Google consent, token refresh, or Firestore profile writes. Test those flows in a browser after configuration passes.');
  process.exitCode = results.every(result => result.ok) ? 0 : 1;
}

module.exports = { checkAuth };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
