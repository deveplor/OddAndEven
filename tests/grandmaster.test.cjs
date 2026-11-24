const { test } = require('node:test');
const assert = require('node:assert/strict');
const { predict, choose } = require('../grandmaster.js');
function rng(seed = 42) { return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32); }

test('probabilities are normalized for empty, corrupt, and long histories', () => {
  for (const h of [[], [null, NaN, -1, 11, '6'], Array(300).fill(6)]) {
    const p = predict(h);
    assert.equal(p.length, 10);
    assert.ok(p.every(n => Number.isFinite(n) && n >= 0));
    assert.ok(Math.abs(p.reduce((a, b) => a + b) - 1) < 1e-10);
    for (const batting of [true, false]) {
      for (let i = 0; i < 100; i++) assert.ok(choose({ history: h, batting }) >= 1 && choose({ history: h, batting }) <= 10);
    }
  }
});
test('learns repetitions, cycles, and ascending/descending sequences', () => {
  for (const make of [i => 6, i => [3, 8, 4][i % 3], i => i % 10 + 1, i => 10 - i % 10]) {
    const random = rng(); const history = []; let hits = 0;
    for (let i = 0; i < 150; i++) {
      const pick = choose({ history, random });
      if (i >= 20 && pick === make(i)) hits++;
      history.push(make(i));
    }
    assert.ok(hits / 130 > 0.85, `pattern hit rate ${hits / 130}`);
  }
});
test('adapts when the player changes a repeated choice', () => {
  const history = [...Array(50).fill(6), ...Array(12).fill(2)];
  const p = predict(history);
  assert.equal(p.indexOf(Math.max(...p)) + 1, 2);
});
test('avoids a learned bowling trap and chooses safe winning shots', () => {
  const random = rng(); let outs = 0; let wins = 0;
  for (let i = 0; i < 1000; i++) {
    const n = choose({ history: Array(20).fill(10), batting: true, runsNeeded: 3, random });
    if (n === 10) outs++;
    if (n >= 3 && n !== 10) wins++;
  }
  assert.ok(outs < 10);
  assert.ok(wins > 970);
});
test('cannot predict independent random picks above chance', () => {
  const player = rng(123); const random = rng(456); const history = []; let hits = 0;
  for (let i = 0; i < 5000; i++) {
    const bot = choose({ history, random });
    const pick = Math.floor(player() * 10) + 1;
    if (bot === pick) hits++;
    history.push(pick);
  }
  assert.ok(hits / 5000 > .075 && hits / 5000 < .125, `random hit rate ${hits / 5000}`);
});
