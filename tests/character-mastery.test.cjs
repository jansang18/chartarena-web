const test=require('node:test'),assert=require('node:assert/strict'),M=require('../character-mastery.js');
const win=id=>({id,character:'tr_sera',won:true,comeback:false,escape:false});
test('one match awards cosmetic progress once, even after another character plays',()=>{
 let a=M.award({},win('a')),b=M.award(a,{...win('b'),character:'tr_taeo'}),c=M.award(b,win('a'));
 assert.deepEqual(c,b);assert.equal(M.summary('tr_sera',c).wins,1);assert.equal(M.summary('tr_taeo',c).wins,1);
});
test('three wins unlock frame; two turnarounds unlock victory lighting; no gold is awarded',()=>{
 let s={};for(let i=0;i<3;i++)s=M.award(s,{...win('m'+i),comeback:i<2});const p=M.summary('tr_sera',s);
 assert.deepEqual(p.unlocked,['quote','frame','spotlight']);assert.equal(p.wins,3);assert.equal(p.comebacks,2);assert.equal(s.balance,undefined);
});
test('bad saved values and invalid outcomes cannot create progress',()=>{
 const s=M.award({characters:{tr_sera:{wins:-10,played:'oops',xp:NaN}}},win('a'));assert.equal(M.summary('tr_sera',s).wins,1);
 assert.throws(()=>M.award({},win('')));assert.throws(()=>M.award({}, {...win('a'),character:'__proto__'}));
});
test('escaping last place counts separately and next reward describes an attainable goal',()=>{
 const s=M.award({}, {...win('escape'),won:false,escape:true}),p=M.summary('tr_sera',s);assert.equal(p.escapes,1);assert.equal(p.wins,0);assert.match(p.next,/1승/);assert.ok(p.xp>0);
});
