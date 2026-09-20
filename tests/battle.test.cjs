const fs=require('fs'),vm=require('vm'),test=require('node:test'),assert=require('node:assert/strict');
const R=require('../battle-rules.js'),html=fs.readFileSync('quiz-battle.html','utf8');
const code=html.slice(html.indexOf('function lockIn(){'),html.indexOf('function resetGoHandler(){'));
function play(input,moves,reduced=false,decisions=['GO','GO']){
 let now=1000,draws=0,next=0,seq=0;const tasks=new Map(),nodes=new Map(),checkpoints=[];
 const players=[0,1,2,3].map(i=>({state:R.create(String(i)),name:'P'+i,ready:i===0&&!!input,pending:input,dp:0,startRank:1}));
 const c={ArenaPresentation:require('../battle-presentation.js'),ArenaRules:R,players,matchHistory:[],MODE:'4p',LIVE:null,phase:'pick',tmr:null,revTimer:null,checkpointTimer:null,checkpointChoice:null,checkpointDeadline:0,revealStage:0,reduce:reduced,round:1,highlight:null,
  GD:{vis:210,n:300,cs:Array.from({length:300},(_,i)=>[100,210,1,i<210?100:100+moves[Math.floor((i-210)/30)]]),sym:'TEST',tf:'1h'},gRev:210,view:{count:170,start:80},Date:{now:()=>now},
  botInput:()=>({dir:'L'}),recordWallet(){return true;},currentTable:()=>R.table(),goldEquation:()=>"formula",fmtPct:String,fmtLead:String,renderPods(){},drawChart(){draws++;},
  renderCtrl(){if(c.phase==='checkpoint'){checkpoints.push(c.revealStage);const d=decisions[c.revealStage-1];if(d)c.setTimeout(()=>c.decideCheckpoint(d),1);}},
  currentMove(){return(c.GD.cs[c.gRev-1][3]/100-1)*100;},
  finalMove(seg,exit=90){return(seg.cs[seg.vis+exit-1][3]/seg.cs[seg.vis-1][3]-1)*100;},
  playerMove(p){return c.finalMove(c.GD,Math.min(c.gRev-c.GD.vis,R.exitAt(p.revealInput)));},
  botReact(){},_battleCard(){},startAutoNext(){next++;},esc:String,fmtP:String,
  clearInterval(id){tasks.delete(id);},clearTimeout(id){tasks.delete(id);},
  setTimeout(fn,ms){tasks.set(++seq,{fn,at:now+ms});return seq;},setInterval(fn,ms){tasks.set(++seq,{fn,at:now+ms,ms});return seq;},
  $(id){if(!nodes.has(id))nodes.set(id,{style:{},classList:{add(){},remove(){}},innerHTML:'',textContent:''});return nodes.get(id);}
 };
 vm.createContext(c);vm.runInContext(code,c);c.lockIn();const before=c.players[0].state.balance;
 let steps=0;while(tasks.size&&c.phase!=='result'){assert.ok(++steps<2000,'flow must terminate');const [id,t]=[...tasks].sort((a,b)=>a[1].at-b[1].at)[0];now=t.at;if(t.ms)t.at+=t.ms;else tasks.delete(id);t.fn();}
 return{c,next,draws,before,checkpoints,now};
}
test('sequential reveal visits 30 and 60 checkpoints then settles once at 90',()=>{const r=play({dir:'L'},[1,2,10]);assert.equal(r.before,20000);assert.equal(r.c.gRev,300);assert.equal(r.c.phase,'result');assert.equal(r.c.players[0].state.balance,30000);assert.deepEqual(r.checkpoints,[1,2]);assert.equal(r.next,1);assert.ok(r.draws>90);});
test('STOP at 30 freezes profit even when the final candles reverse',()=>{const r=play({dir:'L',lev:10},[1,-5,-9],false,['STOP']);assert.equal(r.c.players[0].state.balance,30000);assert.equal(r.c.players[0].state.pick.exit,30);assert.equal(r.c.gRev,300);});
test('GO then STOP locks at 60 and never uses the 90-candle loss',()=>{const r=play({dir:'L'},[1,2,-10],false,['GO','STOP']);assert.equal(r.c.players[0].state.score,2000);assert.equal(r.c.players[0].state.pick.exit,60);});
test('checkpoint timeout defaults to STOP',()=>{const r=play({dir:'L'},[1,-10,-20],false,[]);assert.equal(r.c.players[0].state.pick.exit,30);assert.equal(r.c.players[0].state.score,1000);});
test('reduced motion preserves decision opportunities and reveal pacing',()=>{const r=play({dir:'S'},[1,2,100],true);assert.equal(r.c.players[0].state.balance,0);assert.deepEqual(r.checkpoints,[1,2]);assert.ok(r.now>=28800);});
test('missed entry loses one rate across three reveals; intentional pass remains free',()=>{const r=play(null,[1,2,10]),p=play({dir:'W'},[1,2,10]);assert.equal(r.c.players[0].state.balance,19000);assert.equal(r.c.players[0].state.passUsed,false);assert.equal(p.c.players[0].state.balance,20000);assert.equal(p.c.players[0].state.passUsed,true);assert.equal(r.c.players[0].state.pick.exit,undefined);assert.equal(r.next,1);});
test('duplicate finish callbacks cannot apply a second result',()=>{const r=play({dir:'L'},[1,2,10]);r.c.finishRound();assert.equal(r.c.players[0].state.balance,30000);assert.equal(r.next,1);});

test('actual engine SWITCH then STOP preserves old loss and new profit',()=>{const r=play({dir:'L'},[-2,-4.94,20],false,['SWITCH','STOP']);const p=r.c.players[0];assert.equal(p.state.score,1000);assert.equal(p.pick,'S');assert.equal(p.state.lockedDelta,-2000);assert.equal(p.state.openDelta,3000);assert.equal(p.state.pick.exit,60);});
test('actual engine supports two switches with fixed leverage and settles once',()=>{const r=play({dir:'L',lev:2},[-2,-4.94,-3.0388],false,['SWITCH','SWITCH']);const p=r.c.players[0];assert.equal(p.state.score,6000);assert.equal(p.pick,'L');assert.equal(p.state.pick.lev,2);assert.equal(p.state.pick.switches.join(','),'30,60');assert.equal(r.next,1);});
test('actual engine cannot SWITCH or recover after losing all capital at checkpoint',()=>{const r=play({dir:'L',lev:10},[-3,5,10],false,['SWITCH','GO']);const p=r.c.players[0];assert.equal(p.state.balance,0);assert.equal(p.state.pick.exit,30);assert.equal(p.state.pick.switches,undefined);});
