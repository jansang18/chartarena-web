const {test}=require('node:test'),assert=require('node:assert/strict'),R=require('../battle-rules.js');
const moves=at=>({0:0,30:-2,60:-4.94,90:-3.0388})[at]; // prices 100 -> 98 -> 95.06 -> 96.9612
function switched(){return R.checkpoint({me:{dir:'L',lev:1}},{me:'SWITCH'},1).me;}
test('SWITCH records the checkpoint and reverses direction without rewriting the initial position',()=>{
 const pick=switched();assert.equal(pick.dir,'L');assert.deepEqual(pick.switches,[30]);assert.equal(R.directionAt(pick,0),'L');assert.equal(R.directionAt(pick,30),'S');assert.equal(R.exitAt(pick),90);
 const twice=R.checkpoint({me:pick},{me:'SWITCH'},2).me;assert.deepEqual(twice.switches,[30,60]);assert.equal(R.directionAt(twice),'L');
 assert.deepEqual(R.checkpoint({me:pick},{me:'SWITCH'},1).me,pick,'duplicate switch cannot reverse twice');
});
test('loss is locked at SWITCH; new return starts at the current price and keeps leverage',()=>{
 const p=R.create('me','standard',50000),pick=switched();const r=R.profit(p,pick,moves,60);
 assert.equal(r.lockedDelta,-2000);assert.equal(r.openDelta,3000);assert.equal(r.delta,1000);assert.equal(r.currentDir,'S');
 assert.equal(R.profit(p,{...pick,lev:3},moves,60).delta,3000);
});
test('two switches accumulate three independently priced legs',()=>{
 let pick=R.checkpoint({me:switched()},{me:'SWITCH'},2).me;
 const r=R.settle(R.create('me','standard',50000),pick,moves,1);assert.equal(r.delta,3000);assert.equal(r.balance,53000);assert.equal(r.legs.length,3);
});
test('STOP after SWITCH freezes at 60 and a stopped or missed position cannot switch',()=>{
 const pick=R.checkpoint({me:switched()},{me:'STOP'},2).me;assert.equal(R.exitAt(pick),60);assert.equal(R.profit(R.create('me'),pick,moves).delta,1000);
 for(const original of [{dir:'L',exit:30},{dir:'W'},{dir:'N'}])assert.deepEqual(R.checkpoint({me:original},{me:'SWITCH'},2).me,original);
});
test('bankruptcy at a closed leg cannot recover by reversing afterwards',()=>{
 const r=R.profit(R.create('me','standard',1000),switched(),moves);assert.equal(r.delta,-1000);assert.equal(r.capped,true);
});
test('pending switched path, history recovery and close settle exactly once',()=>{
 const pick=switched();let g=R.walletOpen({balance:50000},'m','standard','me');
 g=R.walletRound(g,'m',{dir:'L',lev:1},moves,1,true,30);assert.equal(g.battleActive.pending.balance,48000);
 g=R.walletRound(g,'m',pick,moves,1,true,60);assert.equal(g.battleActive.pending.balance,51000);
 g=R.walletRound(g,'m',pick,moves,1,true,60);g=R.walletClose(g,'m');assert.equal(g.balance,51000);assert.equal(R.walletClose(g,'m'),g);
 const recovered=R.recover(R.create('me','standard',50000),[{round:1,seg:7,picks:{me:{...pick,exit:60}}}],(seg,at)=>{assert.equal(seg,7);return moves(at);});assert.equal(recovered.balance,51000);
});
test('malformed, unordered and post-STOP switch paths are rejected',()=>{
 const p=R.create('me');for(const switches of [[1],[60,30],[30,30],[30,90]])assert.throws(()=>R.choice(p,{dir:'L',switches}));
 assert.throws(()=>R.choice(p,{dir:'L',exit:30,switches:[60]}));assert.throws(()=>R.profit(p,switched(),-2));
});
