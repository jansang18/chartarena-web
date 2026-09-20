const fs=require('node:fs'),vm=require('node:vm'),test=require('node:test'),assert=require('node:assert/strict'),R=require('../battle-rules.js');
const html=fs.readFileSync('quiz-battle.html','utf8');
async function publish(extra={}){
 const writes=[],d={round:1,phase:'checkpoint',stage:1,checkpointDeadline:2000,revealPicks:{host:{dir:'L'},guest:{dir:'S'},bot:{dir:'L'}},checkpointChoices:{host:{round:1,stage:1,decision:'GO'},guest:{round:1,stage:1,decision:'STOP'}},...extra};
 const ctx={ArenaRules:R,LIVE:{host:true,ref:{}},phase:'checkpoint',round:1,revealStage:1,Date:{now:()=>1000},players:[{uid:'host',state:{id:'host'}},{uid:'guest',state:{id:'guest'}},{uid:'bot',state:{id:'bot'},bot:true}],botCheckpoint:()=> 'GO',abortOnline:assert.fail,
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
