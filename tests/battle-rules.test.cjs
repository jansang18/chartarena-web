const test=require('node:test'),assert=require('node:assert/strict'),R=require('../battle-rules.js');
test('default bot capital is deterministic without a supplied player wallet',()=>{assert.equal(R.create('a').balance,20000);assert.equal(R.create('b').balance,20000);});
test('one intentional pass is free; another pass is a missed submission with a penalty',()=>{let p=R.settle(R.create('a'),{dir:'W'},40,1);assert.equal(p.delta,0);assert.equal(p.passUsed,true);p=R.settle(p,{dir:'W'},40,2);assert.equal(p.pick.dir,'N');assert.equal(p.delta,-1000);});
test('every missed entry costs the table rate without consuming the intentional pass',()=>{
 for(const table of ['beginner','standard','expert']){
  const rate=R.table(table).rate;let p=R.create('a',table);
  p=R.settle(p,null,40,1);assert.equal(p.delta,-rate);assert.equal(p.passUsed,false);
  p=R.settle(p,{dir:'N',lev:10},-30,2);assert.equal(p.delta,-rate);assert.equal(p.score,-2*rate);
  p=R.settle(p,{dir:'W'},40,3);assert.equal(p.delta,0);assert.equal(p.passUsed,true);
  p=R.settle(p,null,-30,4);assert.equal(p.delta,-rate);assert.equal(p.score,-3*rate);
 }
});
test('missed penalty is fixed at all reveal points and capped to remaining gold',()=>{
 const p=R.create('a','standard',700);
 for(const at of [0,30,60,90]){const r=R.profit(p,{dir:'N',lev:10},()=>50,at);assert.equal(r.delta,-700);assert.equal(r.missedPenalty,700);assert.equal(r.capped,true);}
 const empty=R.settle(p,null,0,1);assert.equal(empty.balance,0);
 const spectator=R.settle(empty,null,5,2);assert.equal(spectator.delta,0);assert.equal(spectator.missedPenalty,0);
});
test('pending reveal updates, reload, duplicate history and close debit a missed round once',()=>{
 let g=R.walletOpen({balance:25000},'missed','standard','me');
 for(const at of [30,60,90]){g=R.walletRound(g,'missed',null,at,1,true,at);assert.equal(g.battleActive.pending.balance,24000);}
 const reload=R.walletClose(JSON.parse(JSON.stringify(g)),'missed');assert.equal(reload.balance,24000);
 g=R.walletRound(g,'missed',null,90,1,false);
 const history=[{round:1,seg:1,picks:{}},{round:2,seg:2,picks:{}}];
 const recovered=R.recover(g.battleActive.state,history,()=>10);assert.equal(recovered.balance,23000);assert.deepEqual(R.recover(recovered,history,()=>10),recovered);
 g=R.walletRound(g,'missed',null,90,1,false);g=R.walletClose(g,'missed');assert.equal(g.balance,24000);assert.deepEqual(R.walletClose(g,'missed'),g);
});
test('closing an old saved no-entry result preserves its recorded balance',()=>{
 const state={...R.create('me','standard',25000),appliedRound:1,pick:{dir:'N',lev:1}};
 const g={balance:0,battleActive:{id:'v7',tableId:'standard',state,pending:state}};
 const closed=R.walletClose(g,'v7');assert.equal(closed.balance,25000);assert.equal(closed.battleLast.delta,0);
});
test('duplicate and stale rounds are idempotent; gaps reject',()=>{let p=R.settle(R.create('a'),{dir:'L',lev:2},1,1);assert.deepEqual(R.settle(p,{dir:'S'},-10,1),p);assert.throws(()=>R.settle(p,{dir:'L'},10,3));});
test('host/guest order yields identical scores by id and ties remain equal',()=>{let a=R.create('a'),b=R.create('b'),picks={a:{dir:'S',lev:1},b:{dir:'L',lev:3}};const settle=ps=>Object.fromEntries(ps.map(p=>[p.id,R.settle(p,picks[p.id],3,1).balance]));assert.deepEqual(settle([a,b]),settle([b,a]));assert.equal(R.rank([{id:'a',score:4},{id:'b',score:4},{id:'c',score:0}],'b'),1);});
