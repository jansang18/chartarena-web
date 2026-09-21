const test=require('node:test'),assert=require('node:assert/strict'),T=require('../club-tour-rules.js');
const chart=Array.from({length:300},(_,i)=>{const v=100+Math.max(0,i-209)*.01;return[v,v,v,v];});
function room(s,win=true){s=T.commit(s,{dir:win?'L':'S',lev:3},{dir:win?'S':'L',lev:1},100);for(let i=0;i<3;i++){s=T.reveal(s,chart,200);if(i<2)s=T.commit(s,{action:'GO'},{action:'GO'},300);}return s;}
test('tour goes through exactly three opponents and only unlocked victories offer tactics',()=>{
 let s=T.create('run','tr_sera',[0,1,2],0);assert.equal(s.deadline,15000);assert.throws(()=>T.choose(s,'flow',0));
 s=room(s);assert.equal(s.phase,'reward');s=T.choose(s,'flow',1000);assert.equal(s.stage,1);s=room(s);s=T.choose(s,'guard',2000);s=room(s);
 assert.equal(s.phase,'won');assert.equal(s.history.length,3);assert.deepEqual(s.tactics,['flow','guard']);assert.throws(()=>T.commit(s,{dir:'L'}, {},0));
});
test('a defeat ends the run without a wallet field or replayed reward',()=>{
 const s=room(T.create('loss','tr_taeo',[0,1,2],0),false);assert.equal(s.phase,'lost');assert.equal(s.balance,undefined);assert.throws(()=>T.choose(s,'guard',0));assert.throws(()=>T.reveal(s,chart,0));
});
test('signature eligibility is distinct and once per encounter',()=>{
 let s=T.create('risk','tr_sera',[0,1,2],0);assert.throws(()=>T.commit(s,{dir:'L',lev:2,signature:true},{dir:'S',lev:1},0));
 s=T.reveal(T.commit(s,{dir:'L',lev:2},{dir:'S',lev:1},0),chart,0);const copy=JSON.stringify(s);
 let boosted=T.commit(s,{action:'GO',signature:true},{action:'GO'},0);assert.equal(JSON.stringify(s),copy);boosted=T.reveal(boosted,chart,0);
 const normal=T.reveal(T.commit(s,{action:'GO'},{action:'GO'},0),chart,0);assert.ok(boosted.scores.me>normal.scores.me);
 assert.throws(()=>T.commit(boosted,{action:'GO',signature:true},{action:'GO'},0));
 let c=T.reveal(T.commit(T.create('flip','tr_chaerin',[0,1,2],0),{dir:'L',lev:2},{dir:'S',lev:1},0),chart,0);
 assert.throws(()=>T.commit(c,{action:'GO',signature:true},{action:'GO'},0));assert.equal(T.commit(c,{action:'SWITCH',lev:5,signature:true},{action:'GO'},0).picks.me.lev,2);
});
test('save restoration preserves deadlines, picks and deterministic reveal',()=>{
 const s=T.commit(T.create('reload','tr_taeo',[0,1,2],123),{dir:'S',lev:10,signature:true},{dir:'L',lev:2},456),copy=JSON.parse(JSON.stringify(s));
 assert.ok(T.validate(copy));assert.deepEqual(T.reveal(copy,chart,789),T.reveal(s,chart,789));assert.equal(copy.revealStarted,456);
 assert.equal(T.validate({...copy,stage:10}),false);assert.equal(T.validate({...copy,version:0}),false);
});
test('tactics and Sera amplification increase downside as advertised',()=>{
 let s=T.create('risk2','tr_sera',[0,1,2],0);s=T.reveal(T.commit(s,{dir:'S',lev:2},{dir:'L',lev:1},0),chart,0);
 const normal=T.reveal(T.commit(s,{action:'GO'},{action:'GO'},0),chart,0),risk=T.reveal(T.commit(s,{action:'GO',signature:true},{action:'GO'},0),chart,0);
 assert.ok(risk.scores.me<normal.scores.me);
});
test('missed entry stays exactly minus 1000 with defensive tactics',()=>{
 let s=T.create('miss','tr_taeo',[0,1,2],0);s.tactics=['guard','guard'];s=T.commit(s,{}, {dir:'L',lev:1},0);const points=T.score(s,chart,30);assert.equal(points.me,-1000);assert.deepEqual(points.steps,[]);
});
test('a closed or missed position never offers a signature at checkpoint',()=>{
 let s=T.reveal(T.commit(T.create('closed','tr_sera',[0,1,2],0),{}, {dir:'L',lev:1},0),chart,0);assert.equal(T.eligible(s,'GO'),false);
 s=T.reveal(T.commit(T.create('stop','tr_chaerin',[0,1,2],0),{dir:'L',lev:2}, {dir:'S',lev:1},0),chart,0);s=T.reveal(T.commit(s,{action:'STOP'},{action:'GO'},0),chart,0);assert.equal(T.eligible(s,'SWITCH'),false);
});
test('Taeo caps downside at 1000 and pays with half upside on only the armed segment',()=>{
 const raw=T.create('defense','tr_taeo',[0,1,2],0),down=T.commit(raw,{dir:'S',lev:10,signature:true},{dir:'L',lev:1},0),up=T.commit(raw,{dir:'L',lev:10,signature:true},{dir:'S',lev:1},0);
 assert.equal(T.score(down,chart,30).me,-1000);assert.equal(T.score(up,chart,30).me,1500);assert.equal(T.score(down,chart,60).me,-4000);
});
test('changing unrevealed candles never changes current tour points',()=>{
 const s=T.commit(T.create('blind','tr_taeo',[0,1,2],0),{dir:'L',lev:2},{dir:'S',lev:1},0),changed=chart.map((c,i)=>i<240?c:c.map(v=>v*10));assert.deepEqual(T.score(s,chart,30),T.score(s,changed,30));
});
test('invalid phase transitions and incomplete completed receipts cannot resume',()=>{
 const s=T.create('broken','tr_sera',[0,1,2],0),picked=T.commit(s,{dir:'L',lev:2},{dir:'S',lev:1},0);assert.equal(T.validate({...picked,phase:'checkpoint',deadline:1000}),false);
 const completed=room(s);assert.equal(T.validate({...completed,history:[null]}),false);assert.equal(T.validate({...completed,history:[{...completed.history[0],steps:null}]}),false);
 assert.equal(T.validate({...s,phase:'reveal',revealStarted:1,picks:{me:{dir:'L',lev:2},bot:{dir:'S',lev:1}}}),false);
});
