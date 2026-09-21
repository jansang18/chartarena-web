const test = require('node:test');
const assert = require('node:assert/strict');
const Rules = require('../battle-rules.js');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require.resolve('../quiz-battle.html'), 'utf8');
function functionsBetween(first, after) {
  const from = html.indexOf('function ' + first + '(');
  const to = html.indexOf('function ' + after + '(', from);
  assert.ok(from >= 0 && to > from, 'live UI functions must exist');
  return html.slice(from, to);
}
const history = [
  { round: 1, seg: 11, picks: { guest: { dir: 'L', risk: 'normal', power: 'push' }, host: { dir: 'S' } } },
  { round: 2, seg: 22, picks: { guest: { dir: 'W' }, host: { dir: 'L' } } },
  { round: 3, seg: 33, picks: { guest: { dir: 'S', risk: 'bold' }, host: { dir: 'L' } } },
];
history.push({round:4,seg:44,picks:{guest:{dir:'L'},host:{dir:'S'}}},{round:5,seg:55,picks:{guest:{dir:'S'},host:{dir:'L'}}});
const moves = { 11: 5, 22: -3, 33: -8, 44: -2, 55: 7 };
const move = seg => moves[seg];
function expected(through) {
  return history.slice(0, through).reduce((state, row) => Rules.settle(state, row.picks.guest, move(row.seg), row.round), Rules.create('guest'));
}

test('online guest recovers previous round when fast host advances during guest reveal', () => {
  const guest = Rules.create('guest');
  const caughtUp = Rules.recover(guest, history.slice(0, 1), move);
  assert.deepEqual(caughtUp, expected(1));
  assert.equal(guest.appliedRound, 0, 'recovery does not mutate current render state');
  const next = Rules.settle(caughtUp, history[1].picks.guest, move(22), 2);
  assert.deepEqual(next, expected(2));
});

test('repeated snapshots and duplicate history entries do not settle or consume the pass twice', () => {
  const once = Rules.recover(Rules.create('guest'), history.slice(0, 3), move);
  const repeated = Rules.recover(once, history.slice(0, 3).concat(history[0]), move);
  assert.deepEqual(repeated, once);
  assert.equal(repeated.powerUsed, undefined);
  assert.equal(repeated.passUsed, true);
});

test('unordered history catches up in round order and never changes history input', () => {
  const unordered = [history[2], history[0], history[1], history[0]];
  const before = JSON.stringify(unordered);
  assert.deepEqual(Rules.recover(Rules.create('guest'), unordered, move), expected(3));
  assert.equal(JSON.stringify(unordered), before);
});

test('completion snapshot catches up all five rounds for a throttled guest and is idempotent', () => {
  const final = Rules.recover(expected(1), history, move);
  assert.deepEqual(final, expected(5));
  assert.equal(final.appliedRound, 5);
  assert.deepEqual(Rules.recover(final, history, move), final);
  assert.equal(final.pick.power, undefined);
});

test('history missing a round cannot silently manufacture a completed match', () => {
  assert.throws(() => Rules.recover(Rules.create('guest'), [history[0], history[2]], move), /Round/);
});

test('recovery selects choice by player id, not host-first list position', () => {
  const guest = Rules.recover(Rules.create('guest'), history.slice(0, 1), move);
  const host = Rules.recover(Rules.create('host'), history.slice(0, 1), move);
  assert.ok(guest.score > 0);
  assert.ok(host.score < 0);
  const late = Rules.recover(Rules.create('late'), history.slice(0, 1), move);
  assert.equal(late.score, -1000, 'missing confirmed choice costs one table rate');
});

function liveSnapshotContext() {
  const ctx = {
    handleRematch(){},ArenaRules: Rules, Date, ROUNDS: Rules.ROUNDS, round: 1, phase: 'reveal', myUid: 'guest',
    LIVE: { playing: true, host: false, lastRound: 1 },
    players: [{ uid: 'guest', bot: false, state: Rules.create('guest') }],
    matchHistory: [], calls: [], finalMove: (seg) => move(seg.idx),
    pickSegByIdx(idx) { const cs = Array.from({ length: 100 }, () => [100, 110, 90, 100]); cs[99][3] = 100 + move(idx); return { idx, cs, vis: 10 }; },
    stopBattle() { ctx.calls.push('stop'); },
    prepareRound(seg, deadline) { ctx.calls.push(['prepare', ctx.players[0].state.appliedRound, seg.idx, deadline]); ctx.phase = 'pick'; },
    beginReveal(picks) { ctx.calls.push(['reveal', ctx.players[0].state.appliedRound]); ctx.phase = 'reveal'; },
    finalResult() { ctx.calls.push(['final', ctx.players[0].state.appliedRound]); ctx.phase = 'final'; },
    abortOnline(msg) { ctx.calls.push(['abort', msg]); },
    recoverWallet(){return true;}, renderPods() {}, renderCtrl() {}, publishReveal() { ctx.calls.push('publish'); },
  };
  vm.createContext(ctx);
  vm.runInContext(functionsBetween('recoverPlayers', 'publishReveal'), ctx);
  return ctx;
}

test('actual snapshot handler settles interrupted guest reveal before preparing next round', () => {
  const ctx = liveSnapshotContext();
  ctx.onLiveSnap({ status: 'play', phase: 'pick', round: 2, seg: 22, deadline: 15000, history: history.slice(0, 1) });
  assert.deepEqual(ctx.calls[0], ['prepare', 1, 22, 15000]);
  assert.deepEqual(ctx.players[0].state, expected(1));
  assert.equal(ctx.round, 2);
});

test('actual completion snapshot recovers old rounds before revealing final round', () => {
  const ctx = liveSnapshotContext();
  ctx.onLiveSnap({ status: 'play', phase: 'complete', round: 3, seg: 33, deadline: 15000, history, revealPicks: history[2].picks });
  assert.deepEqual(ctx.calls[0], ['prepare', 2, 33, 15000]);
  assert.deepEqual(ctx.calls[1], ['reveal', 2]);
  assert.deepEqual(ctx.players[0].state, expected(2));
});

test('actual done snapshot finalizes all three rounds even if guest missed reveal', () => {
  const ctx = liveSnapshotContext();
  ctx.onLiveSnap({ status: 'done', round: 5, history });
  assert.deepEqual(ctx.players[0].state, expected(5));
  assert.deepEqual(ctx.calls, ['stop', ['final', 5]]);
  assert.equal(ctx.phase, 'final');
  assert.equal(ctx.GD.idx, 55);
});

test('actual done snapshot without complete history aborts without paying a final reward', () => {
  const ctx = liveSnapshotContext();
  ctx.onLiveSnap({ status: 'done', round: 2, history: history.slice(0, 1) });
  assert.equal(ctx.calls[0][0], 'abort');
  assert.equal(ctx.players[0].state.appliedRound, 0);
});

async function runHostStart(fresh) {
  const writes = [], ref = {}, pending = [];
  const ctx = {
    ArenaRivals:require('../battle-rivals.js'),selectedTable:'standard', LIVE: { host: true, ref, attempt: 1 }, mmCurrent: () => true, BOTNAMES: ['bot1', 'bot2'], Date,
    liveFallback(msg) { throw Error(msg); },
    FB: { runTransaction(work) {
      const p = Promise.resolve().then(() => work({ get: async () => ({ data: () => fresh }), update: (r, value) => writes.push(value) }));
      pending.push(p); return p;
    } },
  };
  vm.createContext(ctx);
  vm.runInContext(functionsBetween('hostStart', 'beginLive'), ctx);
  ctx.hostStart(ref, { players: { host: {} }, cap: 4 }); // stale initial read must be ignored
  await Promise.all(pending);
  return writes;
}

test('actual hostStart transaction uses fresh capacity after the last human joins', async () => {
  const fresh = { status: 'wait_v10', rulesVersion:10,tableId:'standard', host: 'host', cap: 4, players: { host: {}, p2: {}, p3: {}, p4: {} } };
  const writes = await runHostStart(fresh);
  assert.equal(writes.length, 1);
  assert.equal(Object.keys(writes[0].players).length, 4);
  assert.equal(Object.values(writes[0].players).filter(p => p.bot).length, 0);
});

test('actual hostStart transaction cannot resurrect a cancelled room', async () => {
  assert.equal((await runHostStart({ status: 'done', host: 'host', cap: 4, players: { p2: {} } })).length, 0);
  assert.equal((await runHostStart({ status: 'wait_v10', rulesVersion:10,tableId:'standard', host: 'host', cap: 4, players: { p2: {} } })).length, 0);
});

test('host cannot start a different table or old rules version',async()=>{
  for(const extra of [{rulesVersion:9},{rulesVersion:8},{rulesVersion:4},{rulesVersion:7},{status:'wait_v7',rulesVersion:7},{tableId:'expert'}]){
    const d={status:'wait_v10',rulesVersion:10,tableId:'standard',host:'host',cap:4,players:{host:{}},...extra};
    assert.equal((await runHostStart(d)).length,0);
  }
});

test('actual guest wait times out and responds to a host cancellation', () => {
  let snapshot, timer;
  const ctx = {
    LIVE: null, mmTimer: null, mmUnsub: null, Date, myUid: 'guest', messages: [], mmCurrent: () => true,
    renderWait() {}, beginLive() {}, clearInterval() {},
    setTimeout(fn, ms) { timer = { fn, ms }; return 1; },
    liveFallback(msg) { ctx.messages.push(msg); },
  };
  const ref = { onSnapshot(fn) { snapshot = fn; return () => {}; } };
  vm.createContext(ctx);
  vm.runInContext(functionsBetween('enterRoom', 'hostStart'), ctx);
  ctx.enterRoom(ref, false, 1);
  assert.ok(timer.ms > 0 && timer.ms <= 60000);
  timer.fn();
  assert.match(ctx.messages[0], /초과/);
  snapshot({ exists: true, data: () => ({ status: 'done', host: 'host', players: { guest: {} } }) });
  assert.match(ctx.messages[1], /취소/);
});

test('actual repeated done snapshots do not reopen finalization', () => {
  const ctx = liveSnapshotContext();
  ctx.onLiveSnap({ status: 'done', round: 3, history });
  ctx.onLiveSnap({ status: 'done', round: 3, history });
  assert.equal(ctx.calls.filter(c => Array.isArray(c) && c[0] === 'final').length, 1);
});

function deferred() { let resolve, reject; const promise = new Promise((r, j) => { resolve = r; reject = j; }); return { promise, resolve, reject }; }
const flush = () => new Promise(resolve => setImmediate(resolve));
function matchmakingHarness() {
  const pendingQuery = deferred(), pendingAdd = deferred();
  const calls = { adds: 0, bot: 0, begin: 0, render: 0, writes: [], polls: [] };
  const timers = [], elements = {};
  const deleted = '__delete__';
  const ctx = {
    getBal:()=>75000, selectedTable:'standard', currentTable:()=>Rules.table('standard'),fmtP:String, Date, Math, Promise, LIVE: null, mmUnsub: null, mmTimer: null, myUid: 'guest', myNick: 'Guest', myCh: 'hu0',
    $: id => elements[id] ||= { style: {}, textContent: '', classList: { contains: () => true } },
    fbReady: () => true, showWait() {}, hideWait() {}, backToModes() {},
    renderWait() { calls.render++; }, beginLive() { calls.begin++; }, startMode4p() { calls.bot++; },
    hostStart(ref) { calls.polls.push(ref); },
    clearInterval() {}, clearTimeout() {},
    setTimeout(fn, ms) { timers.push({ fn, ms }); return timers.length; },
    setInterval(fn, ms) { timers.push({ fn, ms }); return timers.length; },
    firebase: { firestore: { FieldValue: { delete: () => deleted } } },
  };
  const query = { where() { return this; }, orderBy() { return this; }, limit() { return this; }, get() { return pendingQuery.promise; }, add() { calls.adds++; return pendingAdd.promise; } };
  ctx.FB = {
    collection: () => query,
    runTransaction(work) {
      return Promise.resolve().then(() => work({
        get: ref => Promise.resolve({ data: () => ref.data }),
        update(ref, patch) {
          calls.writes.push(patch);
          for (const [path, value] of Object.entries(patch)) {
            const [key, child] = path.split('.');
            if (child) { ref.data[key] ||= {}; if (value === deleted) delete ref.data[key][child]; else ref.data[key][child] = value; }
            else ref.data[key] = value;
          }
        },
      }));
    },
  };
  vm.createContext(ctx);
  const start = html.indexOf('var mmAttempt=');
  vm.runInContext(html.slice(start, html.indexOf('function hostStart(', start)), ctx);
  return { ctx, calls, timers, pendingQuery, pendingAdd };
}

test('cancelling pending query prevents late room creation and energy-consuming entry', async () => {
  const h = matchmakingHarness(); h.ctx.startModeLive(); h.ctx.liveCancel();
  h.pendingQuery.resolve({ forEach() {} }); await flush();
  assert.equal(h.calls.adds, 0); assert.equal(h.calls.begin, 0); assert.equal(h.ctx.LIVE, null);
});

test('candidate matching never joins a different rate or old rules',async()=>{
  const h=matchmakingHarness();h.ctx.startModeLive();
  const other={status:'wait_v10',rulesVersion:10,tableId:'expert',host:'host',createdAt:Date.now(),players:{host:{}}};
  h.pendingQuery.resolve({forEach(fn){fn({data:()=>other,ref:{data:other}});fn({data:()=>({...other,tableId:'standard',rulesVersion:2}),ref:{}});}});
  await flush();assert.equal(h.calls.writes.length,0);assert.equal(h.calls.adds,1);
});

test('join transaction rechecks table after candidate changes',async()=>{
  const h=matchmakingHarness();h.ctx.startModeLive();
  const d={status:'wait_v10',rulesVersion:10,tableId:'standard',host:'host',createdAt:Date.now(),players:{host:{}}};
  const ref={data:{...d,tableId:'expert'}};
  h.pendingQuery.resolve({forEach(fn){fn({data:()=>d,ref});}});
  await flush();assert.equal(h.calls.writes.length,0);assert.equal(h.calls.adds,1);
});

test('late created room is closed and removes only cancelled attempt membership', async () => {
  const h = matchmakingHarness(); h.ctx.startModeLive();
  const attempt = h.ctx.mmAttempt, tag = h.ctx.mmTag(attempt);
  h.ctx.mmCreate({ nick: 'Guest', matchAttempt: tag }, attempt);
  h.ctx.liveCancel();
  const ref = { data: { host: 'guest', status: 'wait_v10', rulesVersion:10,tableId:'standard', players: { guest: { matchAttempt: tag } }, scores: { guest: 0 } } };
  h.pendingAdd.resolve(ref); await flush();
  assert.equal(ref.data.status, 'done'); assert.equal(ref.data.players.guest, undefined); assert.equal(h.ctx.LIVE, null); assert.equal(h.calls.begin, 0);
});

test('cancellation after join commit but before its response removes late membership', async () => {
  const h = matchmakingHarness(), commitResponse = deferred();
  const originalTransaction = h.ctx.FB.runTransaction;
  let first = true;
  h.ctx.FB.runTransaction = work => {
    const result = originalTransaction(work);
    if (!first) return result;
    first = false; return result.then(value => commitResponse.promise.then(() => value));
  };
  h.ctx.startModeLive();
  const ref = { data: { host: 'host', status: 'wait_v10', rulesVersion:10,tableId:'standard', createdAt: Date.now(), cap: 4, players: { host: {} }, scores: {} } };
  h.pendingQuery.resolve({ forEach(fn) { fn({ ref, data: () => ref.data }); } });
  await flush();
  assert.ok(ref.data.players.guest, 'join already committed');
  h.ctx.liveCancel(); commitResponse.resolve(); await flush();
  assert.equal(ref.data.players.guest, undefined);
  assert.equal(ref.data.status, 'wait_v10', 'guest cleanup must not close the host room');
  assert.equal(h.calls.begin, 0); assert.equal(h.ctx.LIVE, null);
});

test('old cleanup cannot remove a newer attempt that joined the same room', async () => {
  const h = matchmakingHarness(); h.ctx.startModeLive(); const old = h.ctx.mmAttempt;
  h.ctx.liveCancel(); h.ctx.startModeLive();
  const ref = { data: { host: 'host', status: 'wait_v10', rulesVersion:10,tableId:'standard', players: { guest: { matchAttempt: h.ctx.mmTag(h.ctx.mmAttempt) }, host: {} } } };
  await h.ctx.cleanupMatchMembership(ref, false, old);
  assert.ok(ref.data.players.guest); assert.equal(h.calls.writes.length, 0);
});

test('cancelled fallback timeout cannot start bots during a new matchmaking attempt', () => {
  const h = matchmakingHarness(); h.ctx.startModeLive(); h.ctx.liveFallback('offline', h.ctx.mmAttempt);
  const oldFallback = h.timers.find(t => t.ms === 1500);
  h.ctx.liveCancel(); h.ctx.startModeLive(); oldFallback.fn();
  assert.equal(h.calls.bot, 0); assert.equal(h.ctx.mmActive, true);
});

test('late snapshot and host polling responses cannot start a cancelled room', async () => {
  const h = matchmakingHarness(); h.ctx.startModeLive();
  let snapshot, error; const pendingGet = deferred();
  const ref = { data: { host: 'guest', status: 'wait_v10', rulesVersion:10,tableId:'standard', players: { guest: { matchAttempt: h.ctx.mmTag(h.ctx.mmAttempt) } } },
    onSnapshot(fn, fail) { snapshot = fn; error = fail; return () => {}; }, get: () => pendingGet.promise };
  h.ctx.enterRoom(ref, true, h.ctx.mmAttempt);
  h.timers.find(t => t.ms === 1200).fn(); h.ctx.liveCancel(); h.ctx.startModeLive();
  const newAttempt = h.ctx.mmAttempt;
  snapshot({ exists: true, data: () => ({ ...ref.data, status: 'play' }) }); error();
  pendingGet.resolve({ exists: true, data: () => ({ status: 'wait_v10', rulesVersion:10,tableId:'standard', cap: 1, players: { guest: {} } }) }); await flush();
  assert.equal(h.calls.begin, 0); assert.equal(h.calls.polls.length, 0); assert.equal(h.ctx.mmAttempt, newAttempt); assert.equal(h.ctx.mmActive, true);
});
