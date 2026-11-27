(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OAEAccountSession = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const SECRET_SALT = 'OddAndEven.in::HandCricketVault::2026::v1';
  const SESSION = 'oddandeven_active_session_v1';
  const USERS = 'oddandeven_encrypted_users_v1';
      function fnv1aHash(str) {
        let h = 0x811c9dc5;
        for (let i = 0; i < str.length; i++) {
          h ^= str.charCodeAt(i);
          h = Math.imul(h, 0x01000193);
        }
        return (h >>> 0).toString(16).padStart(8, '0');
      }

      function encryptPayload(plainObj) {
        const json = JSON.stringify(plainObj);
        const key = SECRET_SALT + '::' + fnv1aHash(SECRET_SALT);
        const bytes = [];
        for (let i = 0; i < json.length; i++) {
          const code = json.charCodeAt(i) ^ key.charCodeAt(i % key.length) ^ ((i * 31) & 0xff);
          bytes.push(String.fromCharCode(code));
        }
        const b64 = btoa(unescape(encodeURIComponent(bytes.join(''))));
        const sig = fnv1aHash(json + '::' + SECRET_SALT);
        return `OAE1.${sig}.${b64}`;
      }

      function decryptPayload(cipherText) {
        if (!cipherText || typeof cipherText !== 'string' || !cipherText.startsWith('OAE1.')) {
          return null;
        }
        try {
          const parts = cipherText.split('.');
          if (parts.length !== 3) return null;
          const sig = parts[1];
          const b64 = parts[2];
          const raw = decodeURIComponent(escape(atob(b64)));
          const key = SECRET_SALT + '::' + fnv1aHash(SECRET_SALT);
          const chars = [];
          for (let i = 0; i < raw.length; i++) {
            const c = raw.charCodeAt(i) ^ key.charCodeAt(i % key.length) ^ ((i * 31) & 0xff);
            chars.push(String.fromCharCode(c));
          }
          const json = chars.join('');
          if (fnv1aHash(json + '::' + SECRET_SALT) !== sig) return null;
          return JSON.parse(json);
        } catch (e) {
          return null;
        }
      }


  function active(local, tab) {
    try {
      if (local.getItem('oddandeven_signed_out_v1') === '1') return null;
      return [decryptPayload(local.getItem(SESSION)), decryptPayload(tab.getItem(SESSION))]
        .filter(s => s && /^[A-Z0-9_]{3,16}$/.test(s.username || '') && !['GUEST', 'PLAYER', 'YOU'].includes(s.username))
        .sort((a, b) => (Date.parse(b.loggedInAt) || 0) - (Date.parse(a.loggedInAt) || 0))[0] || null;
    } catch (_) { return null; }
  }
  function signOut(local, tab) {
    local.setItem('oddandeven_signed_out_v1', '1');
    local.removeItem(SESSION); tab.removeItem(SESSION);
    local.removeItem('oddandeven_just_logged_in');
    local.removeItem('oddandeven_pending_cloud_sync_v1');
  }
  function removeFromDevice(username, local, tab) {
    const session = active(local, tab);
    const name = String(username || '').trim().toUpperCase();
    if (!session || session.username !== name) throw Error('Enter the username of the signed-in account.');
    const users = decryptPayload(local.getItem(USERS)) || {};
    delete users[name];
    local.setItem(USERS, encryptPayload(users));
    let map = {};
    try { map = JSON.parse(local.getItem('oddandeven_google_uid_map_v1') || '{}'); } catch (_) {}
    for (const key of Object.keys(map)) if (map[key]?.username === name) delete map[key];
    local.setItem('oddandeven_google_uid_map_v1', JSON.stringify(map));
    if (local.getItem('oddandeven_last_user_v1') === name) local.removeItem('oddandeven_last_user_v1');
    // Do not write purged_accounts or pending_cloud_delete: those propagate to the server.
    signOut(local, tab);
  }
  return { active, signOut, removeFromDevice, encode: encryptPayload, decode: decryptPayload };
});
