const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Rules = require('../puzzle-rules.js');
const candle = (close, low = close - 1, high = close + 1) => [close, high, low, close];
const history = Array.from({ length: 24 }, (_, i) => candle(100 + i % 3));

test('direction grades last future close, including equality, without early future data', () => {
  const q = Rules.create({ type: 'direction', history, horizon: 3, seed: 42 });
  assert.equal(Rules.grade(q, history, [candle(110), candle(120), candle(90)], 'down').ok, true);
  assert.equal(Rules.grade(q, history, [candle(90), candle(110), candle(102)], 'flat').ok, true);
  assert.throws(() => Rules.grade(q, history, [candle(110)], 'up'), /Missing future/);
});

test('region grades visible wick counts and accepts tied busiest bands', () => {
  const h = Array.from({ length: 24 }, (_, i) => [5, 9, i < 12 ? 0 : 4, 5]);
  const q = Rules.create({ type: 'region', history: h, seed: 0 });
  const result = Rules.grade(q, h, [], 'B');
  assert.deepEqual(result.correct, ['A', 'B']);
  assert.equal(result.ok, true);
  assert.match(result.explanation, /A 12회 · B 12회 · C 0회/);
  const resistance = Rules.create({ type: 'region', history: h, seed: 1 });
  assert.deepEqual(Rules.grade(resistance, h, [], 'C').correct, ['C']);
});

test('risk uses equal units and same stop; correct candidate rotates and has positive minimum distance', () => {
  const answers = new Set();
  for (let seed = 0; seed < 3; seed++) {
    const q = Rules.create({ type: 'risk', history, seed });
    const result = Rules.grade(q, history, [], 'A');
    const selected = q.options.find(o => o.id === result.correct[0]);
    answers.add(selected.id);
    assert.ok(q.options.every(o => o.entry > q.stop));
    assert.equal(selected.entry - q.stop, Math.min(...q.options.map(o => o.entry - q.stop)));
    assert.match(q.prompt, /1단위/);
    assert.match(q.hint, /진입가 − 손절선/);
  }
  assert.equal(answers.size, 3);
});

test('breakout uses prior twelve candles only and all future closes, not final close alone', () => {
  const h = history.concat([candle(106, 101, 107)]);
  const q = Rules.create({ type: 'breakout', history: h, horizon: 3 });
  assert.equal(q.level, 103);
  assert.equal(q.side, 'up');
  assert.equal(Rules.grade(q, h, [candle(104), candle(103), candle(109)], 'fail').ok, true);
  assert.match(Rules.grade(q, h, [candle(104), candle(103), candle(109)], 'fail').explanation, /2번째/);
  assert.equal(Rules.grade(q, h, [candle(104), candle(104), candle(109)], 'hold').ok, true);
  const down = history.concat([candle(97, 95, 99)]);
  const dq = Rules.create({ type: 'breakout', history: down, horizon: 2 });
  assert.equal(dq.side, 'down');
  assert.equal(Rules.grade(dq, down, [candle(97), candle(99)], 'fail').ok, true);
  assert.throws(() => Rules.create({ type: 'breakout', history }), /visible breakout/);
});

test('generation is deterministic and public questions do not include future or answer payloads', () => {
  const h = history.concat([candle(106, 101, 107)]);
  for (const type of Rules.TYPES) {
    const opts = { type, history: h, horizon: 3, seed: 81 };
    const a = Rules.create({ ...opts, future: [candle(77777)] });
    const b = Rules.create({ ...opts, future: [candle(88888)] });
    assert.deepEqual(a, b);
    assert.doesNotMatch(JSON.stringify(a), /77777|88888|"correct"|"answer"|"future"|"explanation"/);
  }
});

test('each fifth level contains every type, original thirty-level progression stays valid', () => {
  for (let w = 0; w < 6; w++) {
    assert.deepEqual([0, 1, 2, 3].map(l => Rules.typeForLevel(w, l, 0)), Rules.TYPES);
    assert.deepEqual([...new Set([0, 1, 2, 3, 4].map(r => Rules.typeForLevel(w, 4, r)))], Rules.TYPES);
  }
});

test('shipped chart pool supplies valid questions and grades all four types', () => {
  const sandbox = { window: {} }; sandbox.window = sandbox;
  vm.runInNewContext(fs.readFileSync(require.resolve('../charts.js'), 'utf8'), sandbox);
  const seen = new Set();
  for (const chart of sandbox.CHARTS.slice(0, 100)) {
    for (let e = 30; e < Math.min(80, chart.cs.length - 7); e++) {
      const h = chart.cs.slice(Math.max(0, e - 44), e + 1);
      for (const type of Rules.TYPES) {
        if (seen.has(type) || type === 'breakout' && !Rules.breakout(h)) continue;
        const q = Rules.create({ type, history: h, horizon: 7, seed: e });
        const result = Rules.grade(q, h, chart.cs.slice(e + 1, e + 8), q.options[0].id);
        assert.ok(result.correct.length > 0);
        assert.ok(result.correct.every(id => q.options.some(o => o.id === id)));
        assert.ok(result.explanation.length > 20);
        seen.add(type);
      }
      if (seen.size === 4) break;
    }
    if (seen.size === 4) break;
  }
  assert.equal(seen.size, 4);
});
