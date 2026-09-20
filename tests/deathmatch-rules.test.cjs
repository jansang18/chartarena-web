const {test}=require('node:test');
const assert=require('node:assert/strict');
const R=require('../deathmatch-rules.js');
let serial=0;
const act=(s,type,extra={})=>R.step(s,{id:String(++serial),type,...extra});
const start=(capital=200000)=>act(R.create('match',capital,3),'LOCK',{picks:['L','S']});
const point=s=>act(s,'REVEALED',{move:1});
test('base 1% is 20000G and transfers conserve the pair total',()=>{
 let s=point(start());s=act(s,'GO',{actor:s.turn});s=act(s,'GO',{actor:s.turn});s=point(s);s=act(s,'GO',{actor:s.turn});s=act(s,'GO',{actor:s.turn});s=point(s);
 assert.deepEqual(s.balances,[220000,180000]);assert.equal(s.result.amount,20000);assert.equal(s.phase,'result');
});
test('unaccepted raise does not change stake; fold pays the agreed amount only',()=>{
 let s=point(start());s=act(s,'RAISE',{actor:s.turn,multiple:3});assert.equal(s.agreed,1);assert.equal(s.phase,'respond');
 s=act(s,'FOLD',{actor:s.turn});assert.equal(s.result.amount,20000);assert.equal(s.result.multiple,1);
});
test('CALL activates 1.5 then 3 and final 1% pays 60000G',()=>{
 let s=point(start());s=act(s,'RAISE',{actor:s.turn,multiple:1.5});s=act(s,'CALL',{actor:s.turn});assert.equal(s.agreed,1.5);
 s=point(s);s=act(s,'RAISE',{actor:s.turn,multiple:3});s=act(s,'CALL',{actor:s.turn});s=point(s);assert.deepEqual(s.balances,[260000,140000]);
});
test('invalid turns, lower raises, and duplicate messages cannot settle twice',()=>{
 let s=point(start());assert.throws(()=>act(s,'RAISE',{actor:1-s.turn,multiple:2}));assert.throws(()=>act(s,'RAISE',{actor:s.turn,multiple:1}));
 const msg={id:'fold',type:'FOLD',actor:s.turn};s=R.step(s,msg);assert.equal(R.step(s,msg),s);assert.throws(()=>act(s,'FOLD',{actor:0}));
});
test('same direction or a flat chart draws; losses cap at available gold',()=>{
 let s=R.create('tie',1000,0);s=act(s,'LOCK',{picks:['S','S']});s={...s,stage:3};s=act(s,'REVEALED',{move:10});assert.equal(s.result.amount,0);
 s={...start(1000),stage:3};s=act(s,'REVEALED',{move:-10});assert.deepEqual(s.balances,[0,2000]);assert.equal(s.result.capped,true);assert.equal(R.finished(s),true);
 s={...start(),stage:3};s=act(s,'REVEALED',{move:0});assert.equal(s.result.amount,0);
});
test('five rounds only; next resets stake without duplicating settlement',()=>{
 let s=R.create('five',200000,0);for(let i=1;i<=5;i++){s=act(s,'LOCK',{picks:['L','L']});s={...s,stage:3};s=act(s,'REVEALED',{move:1});assert.equal(s.round,i);if(i<5)s=act(s,'NEXT',{segment:i});}
 assert.equal(R.finished(s),true);assert.throws(()=>act(s,'NEXT',{segment:6}));assert.equal(s.history.length,5);
});
test('wallet escrow resumes, preserves purchases, and returns once',()=>{
 const g={balance:50000,gems:10};let w=R.open(g,'w',2);assert.equal(w.balance,0);assert.equal(w.deathmatchActive.balances[0],50000);
 assert.throws(()=>R.open(w,'other',4));assert.throws(()=>R.open({...g,battleActive:{}},'w',2));
 w={...w,balance:100000};let s=act(w.deathmatchActive,'LOCK',{picks:['L','S']});s=act(s,'EXIT');w={...w,deathmatchActive:s};w=R.close(w,'w');assert.equal(w.balance,130000);assert.equal(w.gems,10);assert.equal(R.close(w,'w'),w);
});
test('exit before locking refunds; exit after reveal result cannot charge twice',()=>{
 let s=act(R.create('a',20000,0),'EXIT');assert.equal(s.balances[0],20000);
 s={...start(20000),stage:3};s=act(s,'REVEALED',{move:1});s=act(s,'EXIT');assert.equal(s.balances[0],40000);
});
test('terminal state and wallet return are one persisted snapshot, including interrupted legacy recovery',()=>{
 let g=R.open({balance:50000},'atomic',0);let s=act(g.deathmatchActive,'EXIT');g=R.save(g,s);assert.equal(g.balance,50000);assert.equal(g.deathmatchActive,null);assert.equal(g.deathmatchLast.id,'atomic');
 let recovery=R.save({balance:1000,deathmatchActive:s},s);assert.equal(recovery.balance,51000);assert.equal(recovery.deathmatchActive,null);
});
test('normal battle cannot spend the wallet reserved by deathmatch',()=>{
 const normal=require('../battle-rules.js');const g=R.open({balance:50000},'reserved',0);assert.throws(()=>normal.walletOpen({...g,balance:50000},'other','standard','me'),/데스매치/);
});
