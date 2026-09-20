const test=require('node:test'),assert=require('node:assert/strict'),R=require('../battle-rules.js');
test('five rounds provide entry and two checkpoint decisions each',()=>{
 assert.equal(R.ROUNDS,5);assert.equal(R.ROUNDS*3,15);
});
test('STOP freezes individual exit and timeout defaults to STOP',()=>{
 const picks={a:{dir:'L',lev:10},b:{dir:'S',lev:2},c:{dir:'W',lev:1}};
 const one=R.checkpoint(picks,{a:'STOP',b:'GO'},1);
 assert.equal(one.a.exit,30);assert.equal(R.exitAt(one.b),90);
 const two=R.checkpoint(one,{a:'GO'},2);
 assert.equal(two.a.exit,30);assert.equal(two.b.exit,60);
 assert.deepEqual(R.checkpoint(two,{a:'GO',b:'GO'},2),two);
 assert.equal(picks.a.exit,undefined);
 assert.throws(()=>R.checkpoint(picks,{},3),/checkpoint/i);
});
test('recovery settles at each player exit instead of the final chart price',()=>{
 const history=[{round:1,seg:7,picks:{a:{dir:'L',lev:10,exit:30},b:{dir:'L',lev:10,exit:90}}}];
 const move=(seg,exit)=>({30:1,60:-2,90:-3})[exit];
 assert.equal(R.recover(R.create('a','standard',50000),history,move).score,10000);
 assert.equal(R.recover(R.create('b','standard',50000),history,move).score,-30000);
});
test('GO replaces pending cumulative result, STOP and final close pay only once',()=>{
 let g=R.walletOpen({balance:50000},'stages','standard','me');
 g=R.walletRound(g,'stages',{dir:'L',lev:10},1,1,true);
 assert.equal(g.battleActive.pending.score,10000);
 g=R.walletRound(g,'stages',{dir:'L',lev:10,exit:60},-2,1,true);
 assert.equal(g.battleActive.pending.score,-20000);
 const interrupted=R.walletClose(g,'stages');assert.equal(interrupted.balance,30000);
 g=R.walletRound(g,'stages',{dir:'L',lev:10,exit:60},-2,1,false);
 g=R.walletClose(g,'stages');assert.equal(g.balance,30000);
 assert.deepEqual(R.walletClose(g,'stages'),g);
});
