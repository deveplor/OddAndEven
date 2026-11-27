const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

for (const file of ['hand_cricket.html', 'hand_cricket.js', 'mobile.html', 'profile.html', 'store.html']) {
  test(`${file}: opening a page must not reset existing player progress`, () => {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.doesNotMatch(source, /executeAuthoritativeV2FreshReset|oddandeven_stats_reset_epoch_v2/);
    const start = source.indexOf('function sanitizeRecordForFreshEpoch(rec)');
    const end = source.indexOf('try { window.__sanitizeRecordForFreshEpoch', start);
    assert.ok(start >= 0 && end > start);
    const context = vm.createContext({});
    vm.runInContext(source.slice(start, end), context);
    const legacy = { statsEpoch: 'old', matches: 31, rankedMatches: 12, wins: 18, losses: 13,
      xp: 25000, elo: 1834, peak: 1950, totalRuns: 1200, wicketsTaken: 75, referralXp: 100 };
    const normalized = context.sanitizeRecordForFreshEpoch(legacy);
    assert.deepEqual(JSON.parse(JSON.stringify(normalized)), legacy);
    assert.notEqual(normalized, legacy);
  });
}
