/* 차트아레나 게임횟수(에너지) — 브롤스타즈식. 12시간마다 10판으로 리필.
   저장: localStorage 'chartarena_energy_v1' = { plays, last }  (last = 마지막 리필 기준시각 ms) */
(function () {
  var KEY = 'chartarena_energy_v1';
  var MAX = 10, REFILL_MS = 12 * 3600 * 1000;
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  // 리필 반영된 현재 상태
  function sync() {
    var s = load(), now = Date.now();
    if (s.last == null || typeof s.plays !== 'number') { s = { plays: MAX, last: now }; save(s); return s; }
    var periods = Math.floor((now - s.last) / REFILL_MS);
    if (periods >= 1) { s.plays = MAX; s.last = s.last + periods * REFILL_MS; save(s); }
    return s;
  }
  function plays() { return sync().plays; }
  function has() { return sync().plays > 0; }
  function nextRefillMs() { var s = sync(); return Math.max(0, (s.last + REFILL_MS) - Date.now()); }
  function nextRefillText() {
    var ms = nextRefillMs(), h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
    return h + '시간 ' + m + '분';
  }
  function use(n) {
    n = n || 1; var s = sync(); if (s.plays < n) return false;
    s.plays -= n; save(s); return true;
  }
  function add(n) { var s = sync(); s.plays += (n | 0); save(s); return s.plays; }   // 구매 등(최대 초과 허용)
  function setMax() { var s = sync(); s.plays = MAX; s.last = Date.now(); save(s); }

  window.NRG = { MAX: MAX, plays: plays, has: has, use: use, add: add, setMax: setMax,
    nextRefillMs: nextRefillMs, nextRefillText: nextRefillText };
})();
