const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const html = fs.readFileSync('quiz-battle.html', 'utf8');
const code = html.slice(html.indexOf('function lockIn(){'), html.indexOf('function resetGoHandler(){'));

function round(pick, move, reduced = false) {
  let balance = 10000, next = 0, draws = 0;
  const tasks = [], nodes = new Map();
  const cs = Array.from({length:80}, (_, i) => [100, 110, 90, i < 48 ? 100 : 100 + move]);
  const context = {
    phase:'pick', tmr:null, MODE:'4p', LIVE:null, reduce:reduced, revTimer:null,
    GD:{cs, vis:48, sym:'TEST', tf:'1h'}, gRev:48, roundBet:0,
    mySel:{betPct:.25}, players:[
      {pick, lev:2, score:0}, {pick:null, lev:1, score:0},
      {pick:null, lev:1, score:0}, {pick:null, lev:1, score:0}
    ],
    getBal:()=>balance, setBal:n=>{balance=n;},
    botPick:()=> 'L', renderPods(){}, renderCtrl(){}, resetView(){},
    drawChart(){draws++;}, battleXp(){}, botReact(){}, _battleCard(){},
    startAutoNext(){next++;}, clearAutoNext(){}, finalResult(){},
    comeback(){return 0;}, toast(){}, fmtP:String,
    clearInterval(){}, clearTimeout(){}, setTimeout(fn){tasks.push(fn);return tasks.length;},
    $(id){if(!nodes.has(id)) nodes.set(id,{style:{},classList:{add(){},remove(){}},innerHTML:'',textContent:''});return nodes.get(id);}
  };
  vm.createContext(context); vm.runInContext(code, context);
  context.lockIn(); const before = {balance, phase:context.phase};
  while(tasks.length) tasks.shift()();
  return {context, balance, next, draws, before};
}

test('four-player confirmation reveals sequentially, then settles and advances', () => {
  const r = round('L',10);
  assert.equal(r.before.phase,'reveal');
  assert.equal(r.before.balance,10000);
  assert.equal(r.context.gRev,78);
  assert.equal(r.context.phase,'result');
  assert.equal(r.balance,10500);
  assert.equal(r.context.players[0].score,500);
  assert.equal(r.next,1);
  assert.ok(r.draws>=30);
});

test('short loss remains bounded by the chosen stake', () => {
  const r=round('S',100,true);
  assert.equal(r.balance,7500);
  assert.equal(r.context.players[0].dp,-2500);
  assert.equal(r.context.phase,'result');
});

test('timeout defaults to observation and retains the existing penalty rule', () => {
  const r=round(null,10,true);
  assert.equal(r.context.players[0].pick,'W');
  assert.equal(r.balance,9500);
  assert.equal(r.next,1);
});
