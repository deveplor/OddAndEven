const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const assert = require('node:assert/strict');

for (const file of ['hand_cricket.js', 'mobile.html', 'bots.html']) {
  test(`${file}: AI receives only prior turns and batting/bowling memories stay separate`, () => {
    const source = fs.readFileSync(file, 'utf8');
    const start = source.indexOf('      function handleGameplayTurn(userNum)');
    const code = source.slice(start, source.indexOf('      function resolveGameplayNumbers(', start));
    const STATE = { phase: 'INNINGS_1', currentBatter: 'USER', userNumHistory: [] };
    const observed = [];
    const ctx = { STATE, requireAccountAndPassword: () => true, isMultiplayer: () => false, SoundFX: { click() {} }, stopTurnTimer() {}, recordNumberPickTelemetry() {},
      generateBotNumber: batting => { observed.push({ batting, history: [...STATE.userNumHistory] }); return 2; },
      resolveGameplayNumbers() {}
    };
    vm.createContext(ctx); vm.runInContext(code, ctx);
    ctx.handleGameplayTurn(6);
    STATE.currentBatter = 'AI';
    ctx.handleGameplayTurn(9);
    assert.deepEqual(observed, [{ batting: false, history: [] }, { batting: true, history: [6] }]);
    assert.deepEqual([...STATE.userBattingHistory], [6]);
    assert.deepEqual([...STATE.userBowlingHistory], [9]);
  });
}
