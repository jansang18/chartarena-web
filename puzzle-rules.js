(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PuzzleRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var TYPES = ['direction', 'region', 'risk', 'breakout'];
  var NAMES = { direction: '방향 예측', region: '지지·저항 구간', risk: '위험 거리 비교', breakout: '돌파 유지 판단' };
  function price(n) { return Number(n).toLocaleString('ko-KR', { maximumFractionDigits: 10, maximumSignificantDigits: 8 }); }
  function valid(cs) { return Array.isArray(cs) && cs.length >= 16 && cs.every(function(c) { return Array.isArray(c) && c.length >= 4 && c.slice(0, 4).every(Number.isFinite) && c[1] >= Math.max(c[0], c[3]) && c[2] <= Math.min(c[0], c[3]); }); }
  function bounds(cs) { return { low: Math.min.apply(null, cs.map(function(c) { return c[2]; })), high: Math.max.apply(null, cs.map(function(c) { return c[1]; })) }; }
  function breakout(history) {
    if (!valid(history)) return null;
    var prev = bounds(history.slice(-13, -1)), last = history[history.length - 1][3];
    if (last > prev.high) return { side: 'up', level: prev.high };
    if (last < prev.low) return { side: 'down', level: prev.low };
    return null;
  }
  function create(opts) {
    var h = opts.history, type = opts.type, horizon = opts.horizon || 5, seed = (opts.seed || 0) >>> 0;
    if (!valid(h) || TYPES.indexOf(type) < 0) throw new Error('Invalid puzzle history or type');
    var recent = h.slice(-24), b = bounds(recent), span = Math.max(b.high - b.low, Math.abs(b.high) * 0.001, 0.001);
    var q = { type: type, name: NAMES[type], horizon: horizon, prompt: '', hint: '', options: [], guides: [], revealsFuture: type === 'direction' || type === 'breakout' };
    if (type === 'direction') {
      q.prompt = '다음 ' + horizon + '개 캔들의 마지막 종가는 현재보다 어떨까요?';
      q.hint = '노란 점은 현재 종가입니다. 마지막 종가끼리 비교합니다.';
      q.options = [{ id: 'up', label: '오른다', detail: '현재 종가보다 높음' }, { id: 'down', label: '내린다', detail: '현재 종가보다 낮음' }, { id: 'flat', label: '같다', detail: '현재 종가와 같음' }];
    } else if (type === 'region') {
      q.side = seed % 2 ? 'resistance' : 'support';
      q.prompt = '최근 24개 캔들의 ' + (q.side === 'support' ? '저가' : '고가') + '가 가장 많이 모인 구간은?';
      q.hint = (q.side === 'support' ? '지지 후보를 찾는 연습: 아래 꼬리 끝' : '저항 후보를 찾는 연습: 위 꼬리 끝') + '을 A·B·C 구간별로 셉니다. 경계는 위 구간에 포함하며, 최다 횟수가 같으면 모두 정답입니다. 미래 반등을 보장하지 않습니다.';
      q.bands = [0, 1, 2].map(function(i) { return { id: String.fromCharCode(65 + i), low: b.low + (b.high - b.low) * i / 3, high: b.low + (b.high - b.low) * (i + 1) / 3 }; });
      q.options = q.bands.map(function(x) { return { id: x.id, label: x.id + ' 구간', detail: price(x.low) + ' ~ ' + price(x.high) }; });
      q.guides = q.bands.map(function(x) { return { label: x.id, low: x.low, high: x.high }; });
    } else if (type === 'risk') {
      q.stop = b.low - span * 0.08;
      q.prompt = '같은 손절선으로 1단위씩 롱 진입한다면 손절까지 가격 차이가 가장 작은 후보는?';
      q.hint = '손실 거리 = 진입가 − 손절선 ' + price(q.stop) + '. 수수료·체결 차이는 제외한 거리 비교이며, 성공 확률을 묻는 문제가 아닙니다.';
      var entries = [0.25, 0.5, 0.75].map(function(n) { return q.stop + span * n; });
      var shift = seed % 3;
      q.options = [0, 1, 2].map(function(i) { var entry = entries[(i + shift) % 3]; return { id: String.fromCharCode(65 + i), label: String.fromCharCode(65 + i) + ' 진입', detail: price(entry), entry: entry }; });
      q.guides = [{ label: '손절', price: q.stop }].concat(q.options.map(function(x) { return { label: x.id, price: x.entry }; }));
    } else {
      var br = breakout(h);
      if (!br) throw new Error('Breakout puzzle requires a visible breakout candle');
      q.side = br.side; q.level = br.level;
      q.prompt = '방금 ' + (br.side === 'up' ? '위로' : '아래로') + ' 돌파한 기준선, 다음 ' + horizon + '개 종가가 모두 ' + (br.side === 'up' ? '위' : '아래') + '에 머물까요?';
      q.hint = '기준선 ' + price(br.level) + '은 직전 12개 캔들의 ' + (br.side === 'up' ? '최고가' : '최저가') + '입니다. 종가가 한 번이라도 선에 닿거나 반대로 넘어가면 유지 실패입니다.';
      q.options = [{ id: 'hold', label: '돌파 유지', detail: '모든 종가가 돌파 쪽에 유지' }, { id: 'fail', label: '유지 실패', detail: '한 번이라도 기준선으로 복귀' }];
      q.guides = [{ label: '돌파선', price: br.level }];
    }
    return q;
  }
  function grade(q, history, future, selected) {
    var correct, explanation;
    if (q.revealsFuture && (!Array.isArray(future) || future.length < q.horizon)) throw new Error('Missing future candles');
    if (q.type === 'direction') {
      var start = history[history.length - 1][3], end = future[q.horizon - 1][3];
      correct = [end > start ? 'up' : end < start ? 'down' : 'flat'];
      explanation = '현재 종가 ' + price(start) + ' → ' + q.horizon + '칸 뒤 종가 ' + price(end) + '. 변화율 ' + ((end / start - 1) * 100).toFixed(2) + '%로 ' + (correct[0] === 'up' ? '상승' : correct[0] === 'down' ? '하락' : '동일') + '했습니다.';
    } else if (q.type === 'region') {
      var counts = [0, 0, 0], idx = q.side === 'support' ? 2 : 1;
      history.slice(-24).forEach(function(c) { var k = c[idx] < q.bands[0].high ? 0 : c[idx] < q.bands[1].high ? 1 : 2; counts[k]++; });
      var maximum = Math.max.apply(null, counts);
      correct = q.bands.filter(function(x, i) { return counts[i] === maximum; }).map(function(x) { return x.id; });
      explanation = '표시된 최근 ' + Math.min(history.length, 24) + '개 캔들: ' + counts.map(function(n, i) { return String.fromCharCode(65 + i) + ' ' + n + '회'; }).join(' · ') + '. ' + correct.join('·') + ' 구간에 가장 많이 모였습니다. 이후 움직임은 별도입니다.';
    } else if (q.type === 'risk') {
      var min = Math.min.apply(null, q.options.map(function(o) { return o.entry - q.stop; }));
      correct = q.options.filter(function(o) { return Math.abs(o.entry - q.stop - min) < 1e-10; }).map(function(o) { return o.id; });
      explanation = '같은 1단위 기준 손절 거리: ' + q.options.map(function(o) { return o.id + ' ' + price(o.entry - q.stop); }).join(' · ') + '. ' + correct.join('·') + '가 가장 짧습니다. 실제 수익 가능성과는 다른 비교입니다.';
    } else if (q.type === 'breakout') {
      var closes = future.slice(0, q.horizon).map(function(c) { return c[3]; });
      var first = closes.findIndex(function(c) { return q.side === 'up' ? c <= q.level : c >= q.level; });
      correct = [first < 0 ? 'hold' : 'fail'];
      explanation = first < 0 ? q.horizon + '개 종가가 모두 기준선 ' + price(q.level) + '의 돌파 쪽에 남아 유지했습니다.' : (first + 1) + '번째 종가 ' + price(closes[first]) + '가 기준선 ' + price(q.level) + '에 닿거나 반대로 넘어가 유지에 실패했습니다.';
    } else throw new Error('Unknown puzzle type');
    return { correct: correct, ok: correct.indexOf(selected) >= 0, explanation: explanation };
  }
  function typeForLevel(world, level, round) { return level === 4 ? TYPES[round % 4] : TYPES[Math.min(level, 3)]; }
  return { TYPES: TYPES, NAMES: NAMES, create: create, grade: grade, breakout: breakout, typeForLevel: typeForLevel };
});
