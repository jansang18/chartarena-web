const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),R=require('../battle-rules.js');
const html=fs.readFileSync('quiz-battle.html','utf8');
function between(first,next){return html.slice(html.indexOf('function '+first+'('),html.indexOf('function '+next+'('));}
function timing(mode='4p'){
 let now=1000;const nodes=new Map(),ticks=new Map(),calls=[],writes=[];let seq=0;
 const c={ArenaRules:R,Date:{now:()=>now},MODE:mode,LIVE:mode==='live'?{host:true,ref:{update:async p=>writes.push(p)}}:null,
  phase:'idle',matchId:'test',matchHistory:[],round:1,ROUNDS:5,revealStage:1,checkpointChoice:null,checkpointTimer:null,revTimer:null,tmr:null,players:[{state:R.create('me')}],
  stopBattle(){},resetView(){},resetGoHandler(){},renderPods(){},renderCtrl(){},drawChart(){},currentTable:()=>R.table(),fmtP:String,
  nextSegmentIndex:()=>1,ArenaData:{load:async()=>{}},pickSegByIdx:()=>({vis:210}),checkpointActive:()=>true,
  lockIn(){calls.push('miss');c.phase='reveal';},publishReveal(){calls.push('publish');},publishContinuation(){calls.push('continue');},
  decideCheckpoint(d){calls.push(d);c.phase='reveal';},abortOnline:assert.fail,
  clearInterval(id){ticks.delete(id);},clearTimeout(){},setInterval(fn){ticks.set(++seq,fn);return seq;},
  $(id){if(!nodes.has(id))nodes.set(id,{style:{},classList:{add(){},remove(){}},textContent:''});return nodes.get(id);}
 };
 vm.createContext(c);vm.runInContext(between('prepareRound','botInput')+between('openCheckpoint','decideCheckpoint'),c);
 return {c,nodes,calls,writes,advance(ms){now+=ms;for(const fn of [...ticks.values()])fn();}};
}
test('entry selection has a full 15 seconds before recording a missed choice',async()=>{
 const h=timing();h.c.startRound();await new Promise(setImmediate);
 assert.equal(h.nodes.get('tnum').textContent,15);h.advance(14999);assert.deepEqual(h.calls,[]);
 h.advance(1);assert.deepEqual(h.calls,['miss']);
});
test('GO STOP SWITCH gets 15 seconds and defaults to STOP only at the deadline',()=>{
 const h=timing();h.c.GD={vis:210};h.c.openCheckpoint();
 assert.equal(h.nodes.get('tnum').textContent,15);assert.equal(h.nodes.get('tbar').style.width,'100%');
 h.advance(7500);assert.equal(h.nodes.get('tnum').textContent,8);assert.ok(parseFloat(h.nodes.get('tbar').style.width)<=100);assert.deepEqual(h.calls,[]);
 h.advance(7499);assert.deepEqual(h.calls,[]);h.advance(1);assert.deepEqual(h.calls,['STOP']);
});
test('online entry and checkpoint deadlines each publish the same 15-second window',async()=>{
 const h=timing('live');h.c.startRound();await new Promise(setImmediate);assert.equal(h.writes[0].deadline,16000);
 h.c.openCheckpoint();await new Promise(setImmediate);assert.equal(h.writes[1].checkpointDeadline,16000);
});
