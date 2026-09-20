const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const B=fs.existsSync('battle-rivals.js')?require('../battle-rivals.js'):{};
const candles=Array.from({length:30},(_,i)=>[100+i,102+i,99+i,101+i]);
test('bot personalities make different decisions from the same public trend',()=>{
 assert.equal(typeof B.entry,'function');
 assert.equal(B.entry('holder',candles).dir,'L');assert.equal(B.entry('contrarian',candles).dir,'S');
 const context={dir:'L',gainPct:.6};
 assert.equal(B.checkpoint('holder',candles,context),'GO');assert.equal(B.checkpoint('scalper',candles,context),'STOP');
 assert.equal(B.checkpoint('switcher',candles,{dir:'S',gainPct:-.2}),'SWITCH');
});
test('bot inputs are deterministic, legal, and never mutate the revealed candles',()=>{
 const before=JSON.stringify(candles);
 for(const type of Object.keys(B.TYPES)){
  assert.deepEqual(B.entry(type,candles),B.entry(type,candles));assert.ok([1,2,3,5,10].includes(B.entry(type,candles).lev));
  assert.equal(B.checkpoint(type,candles,{dir:'L',gainPct:-20}),'STOP');
 }
 assert.equal(JSON.stringify(candles),before);
});
test('decisive choice selects the biggest measured contribution with a clear GO STOP SWITCH label',()=>{
 const rows=[{round:1,at:30,action:'GO',swing:10},{round:2,at:60,action:'STOP',swing:130},{round:3,at:30,action:'SWITCH',swing:-70}];
 assert.deepEqual(B.highlight(rows),rows[1]);assert.equal(B.highlight([]),null);
});
test('rematch requires every human consent, recent votes and matching sequence',()=>{
 const room={rematchSeq:0,players:{me:{},other:{},bot:{bot:true}},rematchVotes:{me:{seq:0,at:100,gold:1000},other:{seq:0,at:100,gold:1500}}};
 assert.equal(B.rematchReady(room,200),true);assert.equal(B.rematchReady({...room,rematchVotes:{me:room.rematchVotes.me}},200),false);
 assert.equal(B.rematchReady(room,30101),false);assert.equal(B.rematchReady({...room,rematchSeq:1},200),false);
});
