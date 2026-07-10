/* 차트아레나 공유 경험치(XP) 시스템 — 모든 페이지 공용.
   저장: localStorage 'chartarena_xp_v1' = { xp:number, lessons:{} }
   규칙은 네이티브 앱 ProgressionEngine/LevelCurve/IndicatorUnlock 과 동일. */
(function () {
  var KEY = 'chartarena_xp_v1';
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  function xpToClear(level) { return 100; }   // 100 XP = 1레벨 (평탄)
  function levelForXp(t) { var l = 1, r = Math.max(0, t | 0); while (r >= xpToClear(l)) { r -= xpToClear(l); l++; } return l; }
  function xpIntoLevel(t) { var l = 1, r = Math.max(0, t | 0); while (r >= xpToClear(l)) { r -= xpToClear(l); l++; } return r; }
  function total() { return load().xp | 0; }
  function level() { return levelForXp(total()); }
  function need() { return xpToClear(level()); }
  function into() { return xpIntoLevel(total()); }
  function progress() { var n = need(); return n <= 0 ? 0 : into() / n; }

  // 레벨에 따라 해금되는 지표
  var INDICATORS = [
    { key: 'vol', label: '거래량', lv: 1 }, { key: 'ma', label: '이동평균선', lv: 1 },
    { key: 'rsi', label: 'RSI', lv: 2 }, { key: 'boll', label: '볼린저밴드', lv: 4 },
    { key: 'macd', label: 'MACD', lv: 6 }, { key: 'ichi', label: '일목균형표', lv: 10 }
  ];
  function indLv(key) { var i = INDICATORS.filter(function (x) { return x.key === key; })[0]; return i ? i.lv : 1; }
  function unlocked(key, lv) { return (lv == null ? level() : lv) >= indLv(key); }

  // XP 부여 → {gained, oldLevel, newLevel, leveledUp, unlocks:[{label,lv}], reason}
  function award(amount, reason) {
    amount = amount | 0; if (amount === 0) return null;
    var s = load(), old = levelForXp(s.xp | 0);
    s.xp = Math.max(0, (s.xp | 0) + amount); save(s);   // 패배 시 감소 허용(최저 0)
    var nl = levelForXp(s.xp);
    var unlocks = nl > old ? INDICATORS.filter(function (i) { return i.lv > old && i.lv <= nl; }) : [];
    return { gained: amount, oldLevel: old, newLevel: nl, leveledUp: nl > old, leveledDown: nl < old, unlocks: unlocks, reason: reason || '' };
  }

  // 게임 1판 결과 → XP (실력 보상형: 승리/손절활용/올바른관망/저배율)
  function forRound(o) {
    o = o || {}; var xp = 10;
    if (!o.watch && o.win) xp += 15;
    if (o.usedStop) xp += 8;
    if (o.watchGood) xp += 20;
    if (o.lowRiskWin) xp += 5;
    return xp;
  }

  // 학습 강의: 강의당 1회만 XP
  function awardLesson(id, amount) {
    var s = load(); s.lessons = s.lessons || {};
    if (s.lessons[id]) return null;
    s.lessons[id] = 1; save(s);
    return award(amount || 8, 'lesson:' + id);
  }

  // ---- 공용 UI (스타일 자체 주입) ----
  var injected = false;
  function inject() {
    if (injected) return; injected = true;
    var css = '' +
      '.xp-toast{position:fixed;left:50%;top:14%;transform:translateX(-50%) translateY(-8px);z-index:99998;' +
      'background:rgba(20,26,40,.95);border:1px solid rgba(245,196,81,.5);color:#f5e2b0;font-weight:800;' +
      'font-size:14px;padding:9px 16px;border-radius:999px;box-shadow:0 10px 26px -8px #000;opacity:0;' +
      'transition:.3s;font-family:inherit;pointer-events:none}' +
      '.xp-toast.on{opacity:1;transform:translateX(-50%) translateY(0)}' +
      '.xp-lvpop{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;' +
      'background:rgba(5,8,16,.72);backdrop-filter:blur(4px);font-family:inherit}' +
      '.xp-lvpop.on{display:flex;animation:xpfade .25s}' +
      '@keyframes xpfade{from{opacity:0}to{opacity:1}}' +
      '.xp-lvcard{width:min(88vw,360px);background:radial-gradient(120% 90% at 50% 0%,#1c2a4a,#0e1424 60%,#0a0e1a);' +
      'border:1px solid rgba(245,196,81,.45);border-radius:22px;padding:26px 24px 22px;text-align:center;' +
      'box-shadow:0 30px 80px -20px #000,0 0 44px -12px rgba(245,196,81,.4);animation:xppop .35s cubic-bezier(.2,1.3,.4,1)}' +
      '@keyframes xppop{from{transform:scale(.8);opacity:0}to{transform:scale(1);opacity:1}}' +
      '.xp-lvcard .rays{font-size:44px;line-height:1;filter:drop-shadow(0 4px 14px rgba(245,196,81,.6))}' +
      '.xp-lvcard h3{margin:8px 0 2px;color:#F5C451;font-size:15px;font-weight:800;letter-spacing:2px}' +
      '.xp-lvcard .lv{margin:6px 0 2px;font-size:34px;font-weight:900;color:#fff}' +
      '.xp-lvcard .lv b{color:#F5C451}' +
      '.xp-lvcard .sub{color:#9fb0d0;font-size:13px;margin-top:4px}' +
      '.xp-lvcard .unlock{margin-top:14px;background:rgba(76,141,246,.12);border:1px solid rgba(76,141,246,.4);' +
      'border-radius:12px;padding:10px 12px;color:#bcd6ff;font-size:13px;font-weight:700}' +
      '.xp-lvcard .unlock b{color:#fff}' +
      '.xp-lvcard button{margin-top:18px;width:100%;border:none;cursor:pointer;font-family:inherit;font-weight:900;' +
      'font-size:15px;color:#2a2107;background:linear-gradient(180deg,#f6d272,#d8a63a);border-radius:12px;padding:12px}';
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  }

  function toast(text) {
    inject();
    var t = document.createElement('div'); t.className = 'xp-toast'; t.textContent = text;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('on'); });
    setTimeout(function () { t.classList.remove('on'); setTimeout(function () { t.remove(); }, 350); }, 1600);
  }

  function popup(res) {
    if (!res || !res.leveledUp) return;
    inject();
    var wrap = document.createElement('div'); wrap.className = 'xp-lvpop';
    var unlockHtml = '';
    if (res.unlocks && res.unlocks.length) {
      unlockHtml = '<div class="unlock">🔓 새 지표 해금: <b>' +
        res.unlocks.map(function (u) { return u.label; }).join(', ') + '</b></div>';
    }
    wrap.innerHTML = '<div class="xp-lvcard"><div class="rays">🎉</div>' +
      '<h3>LEVEL UP</h3><div class="lv">Lv.' + res.oldLevel + ' → <b>Lv.' + res.newLevel + '</b></div>' +
      '<div class="sub">잘 배우고 있어요! 계속 실력을 쌓아봐요.</div>' + unlockHtml +
      '<button type="button">확인</button></div>';
    document.body.appendChild(wrap);
    requestAnimationFrame(function () { wrap.classList.add('on'); });
    function close() { wrap.classList.remove('on'); setTimeout(function () { wrap.remove(); }, 250); }
    wrap.querySelector('button').onclick = close;
    wrap.onclick = function (e) { if (e.target === wrap) close(); };
  }

  // 편의: XP 부여 + 토스트 + 레벨업 팝업 자동 처리
  function gain(amount, reason) {
    var res = award(amount, reason);
    if (!res) return null;
    try { toast('+' + res.gained + ' XP'); } catch (e) {}
    if (res.leveledUp) { try { popup(res); } catch (e) {} }
    return res;
  }

  window.XP = {
    total: total, level: level, need: need, into: into, progress: progress,
    xpToClear: xpToClear, levelForXp: levelForXp,
    award: award, gain: gain, forRound: forRound, awardLesson: awardLesson,
    unlocked: unlocked, indLv: indLv, INDICATORS: INDICATORS,
    toast: toast, popup: popup
  };
})();
