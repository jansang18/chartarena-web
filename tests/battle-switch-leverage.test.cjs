const test=require('node:test'),assert=require('node:assert/strict'),R=require('../battle-rules.js');
const prices=at=>({0:0,30:-2,60:-4.94,90:-3.0388})[at];
const player=character=>R.create('me','standard',100000,character);
const flip=(pick,stage,lev)=>R.checkpoint({me:pick},{me:{decision:'SWITCH',lev}},stage).me;

test('SWITCH changes only the new position leverage and preserves the locked loss',()=>{
 const pick=flip({dir:'L',lev:2},1,5);
 assert.equal(R.directionAt(pick,30),'S');assert.equal(pick.lev,2);
 assert.equal(R.leverageAt(pick,0),2);assert.equal(R.leverageAt(pick,30),5);
 assert.deepEqual(pick.leverageChanges,[{at:30,lev:5}]);
 const result=R.profit(player(),pick,prices,60);
 assert.equal(result.lockedDelta,-4000);assert.equal(result.openDelta,15000);assert.equal(result.delta,11000);
 assert.equal(R.profit(player(),pick,prices,30).delta,-4000);
});

test('two switches can choose different multipliers and the same checkpoint cannot rewrite its choice',()=>{
 const once=flip({dir:'L',lev:2},1,5),twice=flip(once,2,3);
 assert.deepEqual(flip(once,1,10),once);
 assert.deepEqual(once.leverageChanges,[{at:30,lev:5}]);
 const result=R.settle(player(),twice,prices,1);
 assert.deepEqual(result.legs.map(leg=>leg.lev),[2,5,3]);
 assert.equal(result.delta,17000);assert.equal(result.balance,117000);
});

test('GO and STOP ignore leverage input; stopped and pass positions cannot reopen',()=>{
 const pick=flip({dir:'L',lev:2},1,5);
 const kept=R.checkpoint({me:pick},{me:{decision:'GO',lev:10}},2).me;
 assert.equal(R.exitAt(kept),90);assert.equal(R.leverageAt(kept,60),5);
 const stopped=R.checkpoint({me:pick},{me:{decision:'STOP',lev:10}},2).me;
 assert.equal(R.exitAt(stopped),60);assert.equal(R.profit(player(),stopped,prices).delta,11000);
 for(const original of [stopped,{dir:'W',lev:1},{dir:'N',lev:1}])assert.deepEqual(flip(original,2,10),original);
});

test('serialized leverage changes must be valid, ordered and attached to a real switch',()=>{
 for(const changes of [[{at:0,lev:5}],[{at:30,lev:100}],[{at:30,lev:'5'}],[{at:60,lev:3},{at:30,lev:5}],[{at:30,lev:5},{at:30,lev:2}]]){
  assert.throws(()=>R.choice(player(),{dir:'L',lev:2,switches:[30,60],leverageChanges:changes}),/leverage/i);
 }
 assert.throws(()=>R.choice(player(),{dir:'L',lev:2,leverageChanges:[{at:30,lev:5}]}),/leverage/i);
 assert.throws(()=>R.choice(player(),{dir:'L',lev:2,exit:30,switches:[30],leverageChanges:[{at:30,lev:5}]}),/leverage/i);
 const valid=flip({dir:'L',lev:2},1,1);assert.equal(R.leverageAt(valid,30),1);
 const raw={dir:'L',lev:2,switches:[30],leverageChanges:[{at:30,lev:5}]},copy=R.choice(player(),raw);
 raw.leverageChanges[0].lev=10;assert.equal(copy.leverageChanges[0].lev,5);
});

test('pending wallet settlement and recovered history retain each segment leverage exactly once',()=>{
 const pick=flip(flip({dir:'L',lev:2},1,5),2,3);let game=R.walletOpen({balance:100000},'switch-lev','standard','me');
 game=R.walletRound(game,'switch-lev',pick,prices,1,true,90);
 game=R.walletClose(game,'switch-lev');assert.equal(game.balance,117000);
 assert.equal(R.walletClose(game,'switch-lev'),game);
 const recovered=R.recover(player(),[{round:1,seg:4,picks:{me:pick}}],(_,at)=>prices(at));
 assert.equal(recovered.balance,117000);
 assert.equal(R.profit(R.create('me','standard',3000),pick,prices).delta,-3000);
});

test('character skills use the switched base leverage and an earlier redesign yields to a new switch',()=>{
 const boostPlayer=player('tr_sera'),switched=flip({dir:'L',lev:2},1,5);
 const boosted=R.activateSkill(boostPlayer,switched,30,1);
 assert.equal(R.leverageAt(boosted,30),10);assert.equal(R.leverageAt(boosted,60),5);
 assert.throws(()=>R.activateSkill(boostPlayer,flip({dir:'L',lev:2},1,10),30,1));
 const redesignPlayer=player('tr_chaerin'),redesigned=R.activateSkill(redesignPlayer,{dir:'L',lev:2},30,1,5);
 const changed=flip(redesigned,2,3);
 assert.equal(R.leverageAt(changed,30),5);assert.equal(R.leverageAt(changed,60),3);
});

test('entry payload cannot schedule future leverage and invalid checkpoint leverage cannot multiply the payout',()=>{
 const pick=R.entryChoice(player(),{dir:'L',lev:2,switches:[30],leverageChanges:[{at:30,lev:10}]},1);
 assert.equal(pick.leverageChanges,undefined);
 const changed=flip(pick,1,999);assert.equal(R.leverageAt(changed,30),2);
 assert.equal(R.directionAt(changed,30),'S');
});
