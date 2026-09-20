const test=require('node:test'),assert=require('node:assert/strict'),R=require('../battle-rules.js');
const state=ch=>R.create('me','standard',100000,ch),move=at=>at/30;
test('five character skills are available and Seon boosts just the next 30 candles',()=>{
 assert.equal(Object.keys(R.SKILLS||{}).length,5);
 const p=state('tr_seon'),pick=R.activateSkill(p,{dir:'L',lev:2},30,1);
 assert.equal(R.leverageAt(pick,0),2);assert.equal(R.leverageAt(pick,30),3);assert.equal(R.leverageAt(pick,60),2);
 assert.equal(R.profit(p,pick,move,90).delta,7000);
 assert.equal(R.profit(p,pick,at=>-at/30,90).delta,-7000);
});
test('Kai defense halves both gain and loss; Rin fixes one segment at 1x; Doyun pauses one segment',()=>{
 for(const [ch,expected] of [['tr_kai',5000],['tr_rin',5000],['tr_doyun',4000]]){
  const p=state(ch),pick=R.activateSkill(p,{dir:'L',lev:2},30,1);
  assert.equal(R.profit(p,pick,move).delta,expected);assert.equal(R.profit(p,pick,at=>-at/30).delta,-expected);
 }
});
test('Yuna changes leverage only after checkpoint, retaining the already earned result',()=>{
 const p=state('tr_yuna'),pick=R.activateSkill(p,{dir:'L',lev:2,switches:[30]},30,1,5);
 assert.equal(R.profit(p,pick,move,30).delta,2000);
 assert.equal(R.leverageAt(pick,60),5);assert.equal(R.profit(p,pick,move,60).delta,-2951);
 assert.throws(()=>R.activateSkill(p,{dir:'L',lev:2},0,1,5));
});
test('skill use survives pending wallet settlement and cannot be used twice in a match',()=>{
 let g=R.walletOpen({balance:100000},'skills','standard','me','tr_seon');
 const pick=R.activateSkill(g.battleActive.state,{dir:'L',lev:2},0,1);
 g=R.walletRound(g,'skills',pick,move,1,true,30);assert.equal(g.battleActive.pending.skillUsedRound,1);
 g=R.walletRound(g,'skills',pick,move,1,false);const p=g.battleActive.state;
 assert.equal(p.skillUsedRound,1);assert.throws(()=>R.activateSkill(p,{dir:'L'},30,2));
 assert.throws(()=>R.settle(p,pick,move,2));
 assert.equal(R.walletClose(g,'skills').balance,107000);
 const recovered=R.recover(state('tr_seon'),[{round:1,seg:0,picks:{me:pick}}],(_,at)=>move(at));assert.equal(recovered.skillUsedRound,1);
});
test('invalid skill, stopped/pass picks and foreign character powers are rejected',()=>{
 const p=state('tr_seon');for(const pick of [{dir:'W'},{dir:'N'},{dir:'L',exit:30},{dir:'L',lev:10}])assert.throws(()=>R.activateSkill(p,pick,30,1));
 assert.throws(()=>R.choice(p,{dir:'L',skill:{kind:'defense',at:30,round:1}}));
 assert.throws(()=>R.activateSkill(p,{dir:'L'},15,1));
 const pick=R.activateSkill(p,{dir:'L'},30,1);assert.throws(()=>R.activateSkill(p,pick,60,1));
});
