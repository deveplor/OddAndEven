const { test } = require('node:test');
const assert = require('node:assert/strict');
const account = require('../account-session.js');
const store = require('../store-transactions.js');
function storage(seed = {}) { const map = new Map(Object.entries(seed)); return { map, getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)), removeItem: k => map.delete(k) }; }
test('device removal removes only the selected login, without any cloud-deletion marker', () => {
  const session = { username: 'ALICE', loggedInAt: new Date().toISOString() };
  const local = storage({ oddandeven_active_session_v1: account.encode(session), oddandeven_encrypted_users_v1: account.encode({ ALICE: { username: 'ALICE' }, BOB: { username: 'BOB' } }), oddandeven_google_uid_map_v1: JSON.stringify({ uid: { username: 'ALICE' }, other: { username: 'BOB' } }) });
  const tab = storage({ oddandeven_active_session_v1: account.encode(session) });
  assert.throws(() => account.removeFromDevice('BOB', local, tab), /signed-in/);
  account.removeFromDevice('alice', local, tab);
  assert.deepEqual(Object.keys(account.decode(local.getItem('oddandeven_encrypted_users_v1'))), ['BOB']);
  assert.equal(account.active(local, tab), null);
  assert.equal(local.getItem('oddandeven_purged_accounts_v1'), null);
  assert.equal(local.getItem('oddandeven_pending_cloud_delete_v1'), null);
  assert.equal(JSON.parse(local.getItem('oddandeven_google_uid_map_v1')).uid, undefined);
});
test('purchases are idempotent and use the latest wallet balance', () => {
  const local = storage(), item = { id: 'card_one', price: 5000 };
  store.purchase(local, 'ALICE', item, 6000); store.purchase(local, 'ALICE', item, 6000);
  assert.equal(local.getItem('oddandeven_spent_xp_ALICE'), '5000');
  assert.throws(() => store.purchase(local, 'ALICE', { id: 'other', price: 5000 }, 6000), /Not enough/);
  assert.equal(JSON.parse(local.getItem('oddandeven_store_inventory_ALICE')).length, 1);
});
test('failed inventory writes roll back XP spending', () => {
  const local = storage({ oddandeven_spent_xp_ALICE: '10' });
  const save = local.setItem; let fail = true;
  local.setItem = (key, value) => { if (key.includes('inventory') && fail) { fail = false; throw Error('quota'); } save(key, value); };
  assert.throws(() => store.purchase(local, 'ALICE', { id: 'card_one', price: 5000 }, 6000), /could not be saved/);
  assert.equal(local.getItem('oddandeven_spent_xp_ALICE'), '10');
  assert.equal(local.getItem('oddandeven_store_inventory_ALICE'), null);
});
