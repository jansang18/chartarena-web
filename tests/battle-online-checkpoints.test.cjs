const fs=require('node:fs'),vm=require('node:vm'),test=require('node:test'),assert=require('node:assert/strict'),R=require('../battle-rules.js');
const html=fs.readFileSync('quiz-battle.html','utf8');
async function publish(extra={},stage=1){
 const writes=[],d={round:1,phase:'checkpoint',stage:1,checkpointDeadline:2000,revealPicks:{host:{dir:'L'},guest:{dir:'S'},bot:{dir:'L'}},checkpointChoices:{host:{round:1,stage:1,decision:'GO'},guest:{round:1,stage:1,decision:'STOP'}},...extra};
 const ctx={ArenaRules:R,LIVE:{host:true,ref:{}},phase:'checkpoint',round:1,revealStage:stage,Date:{now:()=>1000},players:[{uid:'host',state:{id:'host'}},{uid:'guest',state:{id:'guest'}},{uid:'bot',state:{id:'bot'},bot:true}],botCheckpoint:()=> 'GO',botSkill:(p,pick)=>pick,abortOnline:assert.fail,
 FB:{runTransaction(work){return work({get:async()=>({data:()=>d}),update(ref,value){writes.push(value);Object.assign(d,value);}});}}};
 vm.createContext(ctx);vm.runInContext(html.slice(html.indexOf('function publishContinuation('),html.indexOf('function abortOnline(')),ctx);
 ctx.publishContinuation();await new Promise(setImmediate);ctx.publishContinuation();await new Promise(setImmediate);return{writes,ctx};
}
test('host advances once with per-player STOP after both human decisions',async()=>{const {writes}=await publish();assert.equal(writes.length,1);assert.equal(writes[0].stage,2);assert.equal(writes[0].revealPicks.guest.exit,30);assert.equal(R.exitAt(writes[0].revealPicks.host),90);});
test('host waits for an active human before deadline',async()=>{const {writes}=await publish({checkpointChoices:{host:{round:1,stage:1,decision:'GO'}}});assert.equal(writes.length,0);});
test('host defaults missing or stale decisions to STOP at deadline',async()=>{const {writes}=await publish({checkpointDeadline:500,checkpointChoices:{host:{round:1,stage:1,decision:'GO'},guest:{round:0,stage:1,decision:'GO'}}});assert.equal(writes.length,1);assert.equal(writes[0].revealPicks.guest.exit,30);});
test('already stopped players do not block the next checkpoint',async()=>{const {writes}=await publish({revealPicks:{host:{dir:'L'},guest:{dir:'S',exit:30},bot:{dir:'L'}},checkpointChoices:{host:{round:1,stage:1,decision:'GO'}}});assert.equal(writes.length,1);assert.equal(writes[0].revealPicks.guest.exit,30);});
test('old round or stage cannot advance the current room',async()=>{for(const extra of [{round:2},{stage:2},{phase:'reveal'}])assert.equal((await publish(extra)).writes.length,0);});
test('duplicate checkpoint snapshots do not replace a committed GO wallet with the earlier endpoint',()=>{
 let recorded=0;const players=[{uid:'me',state:R.create('me'),revealInput:{dir:'L'}}];
 const c={ArenaRules:R,LIVE:{playing:true,lastRound:1,host:false},phase:'checkpoint',round:1,revealStage:1,ROUNDS:5,players,myUid:'me',checkpointChoice:'GO',Date,
  recordWallet(){recorded++;return true;},enterCheckpoint(){},renderCtrl(){},renderPods(){}};
 vm.createContext(c);vm.runInContext(html.slice(html.indexOf('function onLiveSnap('),html.indexOf('function publishReveal(')),c);
 c.onLiveSnap({status:'play',phase:'checkpoint',round:1,stage:1,revealPicks:{me:{dir:'L'}},checkpointChoices:{me:{round:1,stage:1,decision:'GO'}}});assert.equal(recorded,0);assert.equal(c.checkpointChoice,'GO');
});

test('host publishes a SWITCH path once without stopping or changing leverage',async()=>{const {writes}=await publish({revealPicks:{host:{dir:'L',lev:5},guest:{dir:'S'},bot:{dir:'L'}},checkpointChoices:{host:{round:1,stage:1,decision:'SWITCH'},guest:{round:1,stage:1,decision:'GO'}}});assert.equal(writes.length,1);const pick=writes[0].revealPicks.host;assert.equal(pick.switches.join(','),'30');assert.equal(pick.lev,5);assert.equal(R.directionAt(pick),'S');assert.equal(R.exitAt(pick),90);});
test('host publishes selected SWITCH leverage without changing the entry multiplier',async()=>{
 const {writes}=await publish({revealPicks:{host:{dir:'L',lev:2},guest:{dir:'S'},bot:{dir:'L'}},checkpointChoices:{host:{round:1,stage:1,decision:'SWITCH',lev:5},guest:{round:1,stage:1,decision:'GO',lev:10}}});
 const pick=writes[0].revealPicks.host;
 assert.equal(pick.lev,2);assert.equal(R.leverageAt(pick,30),5);
 assert.equal(R.leverageAt(writes[0].revealPicks.guest,30),1);
});
test('host carries both new multipliers through the second SWITCH and rejects stale leverage votes',async()=>{
 const picks={host:{dir:'L',lev:2,switches:[30],leverageChanges:[{at:30,lev:5}]},guest:{dir:'L',lev:2},bot:{dir:'L'}};
 const {writes}=await publish({stage:2,revealPicks:picks,checkpointChoices:{host:{round:1,stage:2,decision:'SWITCH',lev:3},guest:{round:1,stage:2,decision:'GO'}}},2);
 const pick=writes[0].revealPicks.host;
 assert.equal(pick.switches.join(','),'30,60');assert.equal([0,30,60].map(at=>R.leverageAt(pick,at)).join(','),'2,5,3');
 const stale=await publish({stage:2,revealPicks:picks,checkpointDeadline:500,checkpointChoices:{host:{round:1,stage:1,decision:'SWITCH',lev:10}}},2);
 assert.equal(stale.writes[0].revealPicks.host.exit,60);assert.equal(R.leverageAt(stale.writes[0].revealPicks.host,30),5);
});
test('a late SWITCH confirmation cannot record or send a new online position after the deadline',()=>{
 const c={phase:'checkpoint',checkpointChoice:null,MODE:'live',checkpointDeadline:1000,Date:{now:()=>1000},switchEditing:true,renderCtrl(){},liveCheckpoint:assert.fail};
 vm.createContext(c);vm.runInContext(html.slice(html.indexOf('function decideCheckpoint('),html.indexOf("$('continueGo').onclick=")),c);
 c.decideCheckpoint('SWITCH',10);assert.equal(c.switchEditing,false);assert.equal(c.checkpointChoice,null);
});
test('live SWITCH stores the same new multiplier in the pending wallet and network vote',async()=>{
 let saved,patch;const c={armedSkill:p=>p,ArenaRules:R,LIVE:{ref:{}},round:1,revealStage:2,checkpointChoice:null,myUid:'me',players:[{state:R.create('me'),revealInput:{dir:'L',lev:3,switches:[30]}}],recordWallet(input,pending,a,b,through){saved={input,pending,through};return true;},renderCtrl(){},abortOnline:assert.fail,Date:{now:()=>100},FB:{runTransaction(fn){return fn({get:async()=>({data:()=>({round:1,phase:'checkpoint',stage:2,checkpointDeadline:200})}),update(ref,p){patch=p;}});}}};
 vm.createContext(c);vm.runInContext(html.slice(html.indexOf('function liveCheckpoint('),html.indexOf('function publishContinuation(')),c);
 c.liveCheckpoint('SWITCH',5);await new Promise(setImmediate);
 assert.equal(saved.through,90);assert.equal(R.leverageAt(saved.input,0),3);assert.equal(R.leverageAt(saved.input,60),5);
 assert.equal(patch['checkpointChoices.me'].decision,'SWITCH');assert.equal(patch['checkpointChoices.me'].lev,5);
});
test('live SWITCH persists the next segment with its full position path before sending',async()=>{let saved,patch;const c={armedSkill:p=>p,ArenaRules:R,LIVE:{ref:{}},round:1,revealStage:2,checkpointChoice:null,myUid:'me',players:[{state:R.create('me'),revealInput:{dir:'L',lev:3,switches:[30]}}],recordWallet(input,pending,a,b,through){saved={input,pending,through};return true;},renderCtrl(){},abortOnline:assert.fail,Date:{now:()=>100},FB:{runTransaction(fn){return fn({get:async()=>({data:()=>({round:1,phase:'checkpoint',stage:2,checkpointDeadline:200})}),update(ref,p){patch=p;}});}}};vm.createContext(c);vm.runInContext(html.slice(html.indexOf('function liveCheckpoint('),html.indexOf('function publishContinuation(')),c);c.liveCheckpoint('SWITCH');await new Promise(setImmediate);assert.equal(saved.through,90);assert.equal(saved.pending,true);assert.equal(saved.input.switches.join(','),'30,60');assert.equal(patch['checkpointChoices.me'].decision,'SWITCH');});

test('initial reveal cannot pre-submit future switches or a STOP endpoint',async()=>{let patch;const c={ArenaRules:R,LIVE:{host:true,ref:{}},phase:'pick',round:1,players:[{uid:'me',state:R.create('me')}],Date:{now:()=>100},abortOnline:assert.fail,FB:{runTransaction(fn){return fn({get:async()=>({data:()=>({round:1,phase:'pick',deadline:200,picks:{me:{round:1,dir:'L',lev:3,switches:[30,60],exit:60}}})}),update(ref,p){patch=p;}});}}};vm.createContext(c);vm.runInContext(html.slice(html.indexOf('function publishReveal('),html.indexOf('function liveConfirm(')),c);c.publishReveal();await new Promise(setImmediate);assert.equal(patch.revealPicks.me.dir,'L');assert.equal(patch.revealPicks.me.lev,3);assert.equal(patch.revealPicks.me.switches,undefined);assert.equal(patch.revealPicks.me.exit,undefined);});
