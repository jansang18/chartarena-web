const test=require('node:test'),assert=require('node:assert/strict'),R=require('../battle-rules.js');
test('one percent at standard table pays 1000 gold, or 10000 at 10x, symmetrically',()=>{
 const p=R.create('a','standard');
 for(const [dir,lev,move,delta] of [['L',1,1,1000],['L',10,1,10000],['S',10,-1,10000],['L',10,-1,-10000],['S',10,1,-10000]])assert.equal(R.profit(p,{dir,lev},move).delta,delta);
});
test('fractional movement uses table rate independently of remaining capital',()=>{
 for(const id of ['beginner','standard','expert']){
  const p=R.create('a',id),rate=R.table(id).rate;
  assert.equal(R.profit(p,{dir:'L',lev:2},.5).delta,rate);
  assert.equal(R.profit({...p,balance:p.balance/2},{dir:'L',lev:2},.5).delta,rate);
  assert.equal(R.profit(p,{dir:'S',lev:3},.125).delta,-Math.round(rate*.375));
 }
});
test('legacy allocation and tactical multipliers cannot alter formula',()=>{
 const p=R.create('a','standard');
 assert.deepEqual(R.choice(p,{dir:'L',lev:10,risk:'bold',power:'push',betPct:1}),{dir:'L',lev:10});
 assert.equal(R.profit(p,{dir:'L',lev:10,power:'guard',betPct:.1},1).delta,10000);
});
test('loss is capped to match funds and bankrupt players cannot reopen exposure',()=>{
 let p=R.settle(R.create('a','standard'),{dir:'S',lev:10},500,1);
 assert.equal(p.delta,-20000);assert.equal(p.balance,0);assert.equal(p.capped,true);
 p=R.settle(p,{dir:'L',lev:10},500,2);assert.equal(p.balance,0);assert.equal(p.delta,0);
});
test('reserve is not a fee; pending loss settles once and unrelated fields survive',()=>{
 const original={balance:25000,wins:3};
 let g=R.walletOpen(original,'m1','standard','me');assert.equal(g.balance,0);assert.equal(g.battleActive.state.balance,25000);assert.equal(original.balance,25000);
 g=R.walletRound(g,'m1',{dir:'L',lev:10},-1,1,true);
 assert.equal(g.battleActive.state.score,0);assert.equal(g.battleActive.pending.score,-10000);
 g=R.walletClose(g,'m1');assert.equal(g.balance,15000);assert.equal(g.wins,3);assert.equal(g.battleLast.delta,-10000);
 assert.deepEqual(R.walletClose(g,'m1'),g);
});
test('reload resolves confirmed choice and repeated recovery cannot pay again',()=>{
 let g=R.walletOpen({balance:25000},'m2','standard','me');
 g=R.walletRound(g,'m2',{dir:'S',lev:10},-1,1,true);
 const closed=R.walletClose(JSON.parse(JSON.stringify(g)),'m2');assert.equal(closed.balance,35000);
 assert.deepEqual(R.walletClose(closed,'m2'),closed);assert.throws(()=>R.walletOpen(closed,'m2','standard','me'));
});
test('completed and duplicate rounds cannot debit more than the full wallet',()=>{
 let g=R.walletOpen({balance:25000},'m3','standard','me');
 g=R.walletRound(g,'m3',{dir:'S',lev:10},100,1,false);
 g=R.walletRound(g,'m3',{dir:'S',lev:10},100,1,false);
 g=R.walletClose(g,'m3');assert.equal(g.balance,0);assert.equal(g.battleLast.delta,-25000);
});
test('unselected round is refundable and insufficient funds reject',()=>{
 assert.throws(()=>R.walletOpen({balance:0},'m','standard','me'),/골드/);
 const g=R.walletOpen({balance:25000},'m','standard','me');
 assert.equal(R.walletClose(g,'m').balance,25000);assert.throws(()=>R.walletOpen(g,'other','standard','me'));
});
test('practice never changes wallet',()=>{
 let g=R.walletOpen({balance:123},'practice','practice','me');
 g=R.walletRound(g,'practice',{dir:'L',lev:10},10,1,false);
 assert.equal(R.walletClose(g,'practice').balance,123);
});
test('stale match cannot write into another active match',()=>{
 let g=R.walletOpen({balance:50000},'a','standard','me');g=R.walletClose(g,'a');
 g=R.walletOpen(g,'b','standard','me');
 assert.throws(()=>R.walletRound(g,'a',{dir:'L'},10,1,false));assert.deepEqual(R.walletClose(g,'a'),g);
});
test('half-gold rounding is symmetric and malformed values cannot settle',()=>{
 const p=R.create('p','beginner');
 assert.equal(R.profit(p,{dir:'L'},.005).delta,1);assert.equal(R.profit(p,{dir:'S'},.005).delta,-1);
 assert.throws(()=>R.profit(p,{dir:'L'},NaN));assert.throws(()=>R.create('a','bad-table'));
 assert.equal(R.choice(p,{dir:'L',lev:Infinity}).lev,1);
});
