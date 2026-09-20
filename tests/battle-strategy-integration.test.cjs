const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const R=require('../battle-rules.js'),B=require('../battle-rivals.js'),html=fs.readFileSync('quiz-battle.html','utf8');
const source=(a,b)=>html.slice(html.indexOf('function '+a+'('),html.indexOf('function '+b+'('));
test('actual bot entry and checkpoint cannot read unrevealed candle indices',()=>{
 let limit=210;const rows=Array.from({length:300},(_,i)=>[100,110,90,100+i/100]);
 const cs=new Proxy(rows,{get(target,key){if(/^\d+$/.test(String(key))&&Number(key)>=limit)throw Error('future read');return Reflect.get(target,key);}});
 const p={persona:'switcher',state:R.create('b'),revealInput:{dir:'S',lev:2}};
 const c={ArenaRivals:B,ArenaRules:R,GD:{cs,vis:210},revealStage:1,botSkill:(p,pick)=>pick,checkpointActive:()=>true,playerProfit:()=>({delta:100}),currentTable:()=>R.table()};
 vm.createContext(c);vm.runInContext(source('botInput','submitChoice')+source('botCheckpoint','openCheckpoint'),c);
 assert.equal(c.botInput(p).dir,'L');limit=240;assert.equal(c.botCheckpoint(p),'SWITCH');
});
test('local revenge preserves opponents, guards double clicks and starts with a new energy pass',async()=>{
 const old=[{name:'me',ch:'tr_seon',state:{skillUsedRound:1}},{name:'rival',ch:'tr_kai',chImg:'kai.png',persona:'holder',bot:true}];let resets=0,starts=0,resolve;
 const c={phase:'final',rematchStarting:false,MODE:'4p',players:old,myCh:'tr_seon',battlePass:{reset(){resets++;}},nrgGate:()=>true,getBal:()=>30000,currentTable:()=>R.table(),toast:assert.fail,
  startMode4p(){starts++;return new Promise(r=>resolve=r);}};
 vm.createContext(c);vm.runInContext(source('requestRematch','handleRematch'),c);c.requestRematch();c.requestRematch();
 assert.equal(starts,1);assert.equal(resets,1);assert.equal(c.rematchRoster[1].name,'rival');assert.equal(c.rematchRoster[1].persona,'holder');assert.equal(c.rematchRoster[0].state,undefined);
 resolve();await new Promise(setImmediate);assert.equal(c.rematchStarting,false);assert.equal(old[0].state.skillUsedRound,1);
});
test('actual live revenge waits for all humans then changes match sequence once and refreshes wallet amounts',async()=>{
 const room={status:'play',round:5,phase:'complete',rematchSeq:0,players:{me:{startingGold:1000},other:{startingGold:1000},bot:{bot:true}},rematchVotes:{me:{seq:0,at:100,gold:2000}}};
 let writes=0,joins=0;const nodes={};const c={ArenaRivals:B,phase:'final',LIVE:{host:true,seq:0,ref:{},rematchRequested:true},Date:{now:()=>200},rematchStarting:false,rematchTimer:null,
  $(id){return nodes[id]||={};},toast:assert.fail,clearInterval(){},beginLive(d){joins++;c.phase='pick';assert.equal(d.players.me.startingGold,2000);return Promise.resolve();},
  FB:{runTransaction(fn){return fn({get:async()=>({data:()=>room}),update(ref,p){writes++;Object.assign(room,p);}});}}};
 vm.createContext(c);vm.runInContext(source('handleRematch','finalResult'),c);c.handleRematch(room);await new Promise(setImmediate);assert.equal(writes,0);
 room.rematchVotes.other={seq:0,at:100,gold:1500};room.phase='checkpoint';c.handleRematch(room);await new Promise(setImmediate);assert.equal(writes,0);
 room.phase='complete';c.handleRematch(room);await new Promise(setImmediate);assert.equal(writes,1);assert.equal(room.rematchSeq,1);assert.equal(room.round,0);assert.equal(room.players.other.startingGold,1500);
 c.handleRematch(room);await new Promise(setImmediate);c.handleRematch(room);assert.equal(joins,1);assert.equal(writes,1);
});
test('actual decisive summary measures STOP against the next 30 candles without changing settlement',()=>{
 const pick={dir:'L',lev:1,exit:30},history=[{round:1,seg:1,picks:{me:pick}}],state=R.create('me','standard',10000,'tr_seon');
 const c={ArenaRules:R,ArenaRivals:B,players:[{state}],selectedTable:'standard',matchStartGold:10000,myCh:'tr_seon',matchHistory:history,pickSegByIdx:()=>({}),finalMove:(s,at)=>({30:1,60:-2,90:10})[at],fmtLead:n=>(n>0?'+':'')+n};
 vm.createContext(c);vm.runInContext(source('decisiveSummary','setupRematch'),c);const result=c.decisiveSummary();assert.match(result,/30봉 STOP/);assert.match(result,/\+3000G/);assert.equal(state.balance,10000);
});
test('network skill requests cannot inject future switches, reuse a spent skill or change characters',()=>{
 const p=R.create('me','standard',10000,'tr_seon');
 const raw={dir:'L',lev:2,exit:30,switches:[30],skill:{kind:'defense',at:0,round:1}};
 const pick=R.entryChoice(p,raw,1);assert.equal(pick.exit,undefined);assert.equal(pick.switches,undefined);assert.equal(pick.skill.kind,'boost');
 const spent={...p,skillUsedRound:1,appliedRound:1};assert.equal(R.entryChoice(spent,{...raw,skill:{at:0,round:2}},2).skill,undefined);
 assert.equal(R.checkpointChoice(p,{dir:'L'},'STOP',1,1,{at:30,round:1}).skill,undefined);
});
