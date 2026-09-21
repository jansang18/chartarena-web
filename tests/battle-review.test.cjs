const test=require('node:test'),assert=require('node:assert/strict'),Review=require('../battle-review.js'),R=require('../battle-rules.js');
const seg={vis:2,cs:Array.from({length:92},(_,i)=>{let v=i<2?100:i<32?98:i<62?95.06:96.9612;return [v,v,v,v];})};
function build(pick){return Review.build({initial:R.create('me','standard',100000,'tr_sera'),history:[{round:1,seg:0,picks:{me:pick}}],segment:()=>seg});}
test('review preserves exact changed leverage and total settlement without mutating history',()=>{
 const p={dir:'L',lev:2,switches:[30,60],leverageChanges:[{at:30,lev:5},{at:60,lev:3}]},before=JSON.stringify(p),report=build(p),row=report.rounds[0];
 assert.deepEqual(row.steps.map(s=>s.lev),[2,5,3]);assert.deepEqual(row.steps.map(s=>s.dir),['L','S','L']);
 assert.equal(row.steps.reduce((n,s)=>n+s.delta,0),row.delta);assert.equal(report.delta,row.delta);assert.equal(JSON.stringify(p),before);
 assert.deepEqual(row.markers.map(m=>m.action),['진입','SWITCH','SWITCH','종료']);
});
test('STOP review excludes later profit and displays its closing marker',()=>{
 const row=build({dir:'S',lev:5,exit:30}).rounds[0];assert.equal(row.steps.length,1);assert.equal(row.delta,10000);assert.equal(row.markers.at(-1).at,30);assert.equal(row.markers.at(-1).action,'STOP');
});
test('missed entry and pass have distinct review receipts',()=>{
 assert.equal(build(null).rounds[0].delta,-1000);assert.equal(build(null).rounds[0].status,'미제출');assert.equal(build({dir:'W'}).rounds[0].status,'패스');assert.equal(build({dir:'W'}).delta,0);
});
