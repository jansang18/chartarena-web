const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const P=fs.existsSync('battle-presentation.js')?require('../battle-presentation.js'):{};

test('decision cards reveal all choices only after the decision window closes',()=>{
 const rows=[{id:'me',pick:{dir:'L',lev:10}},{id:'opponent',pick:{dir:'S',lev:3}}];
 assert.equal(typeof P.disclose,'function');
 const hidden=P.disclose(rows,1,false);
 assert.ok(hidden.every(p=>p.action==='LOCKED'&&!('direction' in p)&&!('leverage' in p)));
 const shown=P.disclose(rows,1,true);
 assert.deepEqual(shown.map(p=>[p.direction,p.leverage]),[['L',10],['S',3]]);
});

test('checkpoint disclosure distinguishes GO, new STOP, SWITCH, and already stopped positions',()=>{
 const rows=[{id:'go',pick:{dir:'L',lev:2}},{id:'switch',pick:{dir:'L',lev:5,switches:[30]}},{id:'stop',pick:{dir:'S',lev:3,exit:30}},{id:'pass',pick:{dir:'W'}}];
 const first=P.disclose(rows,2,true);
 assert.deepEqual(first.map(p=>p.action),['GO','SWITCH','STOP','PASS']);
 assert.equal(first[1].direction,'S');assert.equal(first[1].leverage,5);
 assert.equal(P.disclose(rows,3,true)[2].action,'HELD');
 // A future switch cannot affect the direction of an earlier reveal card.
 assert.equal(P.disclose([{id:'x',pick:{dir:'L',lev:2,switches:[30,60]}}],2,true)[0].direction,'S');
});

test('live standings keep seats fixed, respect shared ranks and measure the nearest higher score',()=>{
 const input=[{id:'me',score:100},{id:'top',score:900},{id:'rival',score:400},{id:'tie',score:100}];
 const s=P.standings(input,'me');
 assert.deepEqual(s.players.map(p=>p.id),input.map(p=>p.id));
 assert.deepEqual(s.players.map(p=>p.rank),[3,1,2,3]);
 assert.equal(s.me.gap,300);assert.equal(s.me.rivalId,'rival');assert.equal(s.me.tied,true);
 const leaders=P.standings([{id:'me',score:400},{id:'x',score:400},{id:'y',score:300}],'me');
 assert.equal(leaders.me.rank,1);assert.equal(leaders.me.tied,true);assert.equal(leaders.me.lead,0);
 assert.deepEqual(input.map(p=>p.score),[100,900,400,100]);
});

test('rank changes distinguish taking a sole lead from catching a tied leader',()=>{
 const old=P.standings([{id:'me',score:100},{id:'x',score:200}],'me');
 const tied=P.standings([{id:'me',score:200},{id:'x',score:200}],'me');
 const lead=P.standings([{id:'me',score:201},{id:'x',score:200}],'me');
 assert.equal(P.rankChange(old,tied).kind,'tie');assert.equal(P.rankChange(tied,lead).kind,'lead');
 assert.equal(P.rankChange(lead,lead),null);assert.equal(P.rankChange(lead,old).kind,'down');
});

test('reveal clock holds the disclosure then reveals each candle with a slower final three',()=>{
 assert.equal(P.revealFrame(-1).count,0);
 assert.equal(P.revealFrame(P.INTRO_MS-1).intro,true);
 const times=[];let previous=0;
 for(let elapsed=0;elapsed<=12000;elapsed++){
  const frame=P.revealFrame(elapsed);
  if(frame.count!==previous){assert.equal(frame.count,previous+1);times.push(elapsed);previous=frame.count;}
 }
 assert.equal(times.length,30);assert.equal(times[0],P.INTRO_MS+180);
 assert.deepEqual(times.slice(-3).map((t,i)=>t-times[26+i]),[700,1000,1600]);
 assert.equal(P.revealFrame(times[29]-1).done,false);
 assert.equal(P.revealFrame(times[29]).done,true);
 assert.equal(P.revealFrame(999999).count,30);
 // A delayed tab catches up from the shared timestamp, independent of tick count.
 assert.equal(P.revealFrame(times[26]).count,27);
});
