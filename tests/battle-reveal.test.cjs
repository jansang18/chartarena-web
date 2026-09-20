const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const P=require('../battle-presentation.js'),R=require('../battle-rules.js');
const html=fs.readFileSync('quiz-battle.html','utf8');
const source=html.slice(html.indexOf('function beginReveal('),html.indexOf('function playerProfit('));
function harness(){
 let now=1000,next=null,writes=0,checkpoint=0,finished=0;const nodes=new Map();
 const c={ArenaPresentation:P,ArenaRules:R,Date:{now:()=>now},phase:'pick',revealStage:0,tmr:null,checkpointTimer:null,revTimer:null,
  players:[{state:R.create('me')}],GD:{vis:210,n:300},view:{start:180,count:120},reduce:true,
  $(id){if(!nodes.has(id))nodes.set(id,{hidden:true,style:{}});return nodes.get(id);},
  recordWallet(){writes++;return true;},renderCtrl(){},renderPods(){},drawChart(){},showDecisionReveal(){c.$('decisionReveal').hidden=false;},currentTable:()=>({name:'test'}),
  clearInterval(){},clearTimeout(){next=null;},setTimeout(fn){next=fn;return 1;},
  openCheckpoint(){checkpoint++;c.phase='checkpoint';},finishRound(){finished++;c.phase='result';}
 };vm.createContext(c);vm.runInContext(source,c);
 return {c,nodes,get counts(){return {writes,checkpoint,finished};},at(time){now=time;const fn=next;next=null;if(fn)fn();}};
}
test('real reveal flow retains three 30-candle stages and does not double settle duplicate snapshots',()=>{
 const h=harness(),picks={me:{dir:'L',lev:2}};
 for(let stage=1;stage<=3;stage++){
  const start=1000+(stage-1)*11000;
  h.at(start);h.c.beginReveal(picks,start,stage);
  assert.equal(h.c.gRev,210+(stage-1)*30);assert.equal(h.nodes.get('decisionReveal').hidden,false);
  h.c.beginReveal(picks,start,stage);assert.equal(h.counts.writes,stage);
  h.at(start+P.INTRO_MS-1);assert.equal(h.c.gRev,210+(stage-1)*30);
  h.at(start+10500);assert.equal(h.c.gRev,210+stage*30);
 }
 assert.deepEqual(h.counts,{writes:3,checkpoint:2,finished:1});
 h.c.beginReveal(picks,1,3);assert.equal(h.counts.finished,1);
});
test('late shared reveal timestamp catches up without replaying the disclosure or overshooting',()=>{
 const h=harness();h.at(8500);h.c.beginReveal({me:{dir:'S',lev:5}},1000,1);
 assert.equal(h.nodes.get('decisionReveal').hidden,true);assert.equal(h.c.gRev,237);
 h.at(50000);assert.equal(h.c.gRev,240);assert.equal(h.counts.checkpoint,1);
});

test('actual race HUD announces a lead once and clears itself for result and next round',()=>{
 let now=1000;const nodes=new Map(),c={ArenaPresentation:P,players:[{state:{id:'me'}},{state:{id:'bot'}}],round:1,phase:'pick',gRev:210,
  raceRound:0,racePrevious:null,raceCandle:-1,raceLastEventAt:-Infinity,raceEventUntil:0,racePulses:{},Date:{now:()=>now},fmtP:String,
  $(id){if(!nodes.has(id))nodes.set(id,{hidden:true,dataset:{},querySelectorAll:()=>[]});return nodes.get(id);}
 };
 vm.createContext(c);vm.runInContext(html.slice(html.indexOf('function renderRace('),html.indexOf('function playerMove(')),c);
 const scores=score=>[{id:'me',score},{id:'bot',score:100}];
 c.renderRace(scores(0),false);assert.equal(c.$('racePlace').textContent,'선택 대기');
 c.phase='reveal';c.renderRace(scores(0),true);c.gRev++;c.renderRace(scores(101),true);
 assert.equal(c.$('raceEvent').hidden,false);assert.match(c.$('raceEvent').textContent,/단독 1위/);
 now+=2100;c.renderRace(scores(101),true);assert.equal(c.$('raceEvent').hidden,true);
 c.phase='result';c.renderRace(scores(101),false);assert.equal(c.$('raceHud').hidden,true);
 c.round=2;c.phase='pick';c.renderRace(scores(101),false);assert.equal(c.$('raceHud').hidden,false);assert.equal(c.racePrevious,null);
});
