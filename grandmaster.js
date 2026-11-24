/* Shared, history-only Grandmaster strategy. No current player input is accepted. */
(function (root) {
  'use strict';
  const numbers = Array.from({ length: 10 }, (_, i) => i + 1);
  const normalize = values => {
    const sum = values.reduce((a, b) => a + b, 0);
    return values.map(n => n / sum);
  };

  function predict(history) {
    const h = (history || []).filter(n => Number.isInteger(n) && n >= 1 && n <= 10).slice(-120);
    const frequency = Array(10).fill(0.6);
    h.forEach((n, i) => { frequency[n - 1] += Math.pow(0.96, h.length - 1 - i); });
    let probabilities = normalize(frequency);
    // Back off from long contexts when there is little evidence. Repeated numbers
    // are evidence too: never suppress a real repetition habit.
    for (let order = 1; order <= Math.min(4, h.length - 1); order++) {
      const counts = Array(10).fill(0);
      let evidence = 0;
      for (let i = order; i < h.length; i++) {
        if (h.slice(i - order, i).every((n, j) => n === h[h.length - order + j])) {
          const weight = Math.pow(0.98, h.length - 1 - i);
          counts[h[i] - 1] += weight;
          evidence += weight;
        }
      }
      if (evidence) {
        const confidence = evidence / (evidence + 1.5);
        probabilities = probabilities.map((p, i) => p * (1 - confidence) + counts[i] / evidence * confidence);
      }
    }
    // Detect stable ascending/descending modular sequences, including 10 -> 1.
    if (h.length >= 4) {
      const delta = (h.at(-1) - h.at(-2) + 10) % 10;
      let matches = 0;
      for (let i = h.length - 1; i > Math.max(0, h.length - 6); i--) {
        if ((h[i] - h[i - 1] + 10) % 10 !== delta) break;
        matches++;
      }
      if (matches >= 3) {
        const next = (h.at(-1) - 1 + delta) % 10;
        const confidence = Math.min(0.9, 0.55 + matches * 0.06);
        probabilities = probabilities.map((p, i) => p * (1 - confidence) + (i === next ? confidence : 0));
      }
    }
    return probabilities;
  }

  function sample(weights, random) {
    let draw = random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < weights.length; i++) {
      draw -= weights[i];
      if (draw < 0) return i + 1;
    }
    return 10;
  }

  function choose({ history = [], batting = false, runsNeeded = null, ballsLeft = null, random = Math.random } = {}) {
    const probability = predict(history);
    if (!batting) {
      // Exploit learned habits with a small exploration floor across every number.
      return sample(probability.map(p => Math.pow(p, 3) + 0.00035), random);
    }
    const chasing = Number.isFinite(runsNeeded) && runsNeeded > 0;
    const urgency = chasing && Number.isFinite(ballsLeft) && ballsLeft > 0 ? runsNeeded / ballsLeft : 0;
    const values = numbers.map((n, i) => {
      const survival = 1 - probability[i];
      if (chasing && runsNeeded <= 10) {
        return n >= runsNeeded ? 32 * survival : (n / runsNeeded) * 9 * survival - 16 * probability[i];
      }
      const wicketCost = urgency > 6 ? 8 : 24;
      return n * survival - wicketCost * probability[i];
    });
    const best = Math.max(...values);
    // Softmax avoids deterministic high-number loops while preferring useful runs.
    return sample(values.map(v => Math.exp((v - best) / 1.5)), random);
  }

  const api = Object.freeze({ predict, choose });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OAEGrandmaster = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
