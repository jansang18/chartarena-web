const fs=require('node:fs'),vm=require('node:vm'),test=require('node:test'),assert=require('node:assert/strict');
const context={window:{}};vm.runInNewContext(fs.readFileSync('battle-charts.js','utf8'),context);const charts=context.window.BATTLE_CHARTS;
test('5000 unique real histories each have 210 past and 90 future valid candles',()=>{
 assert.equal(charts.length,5000);assert.equal(new Set(charts.map(c=>c.id)).size,5000);
 for(const c of charts){assert.equal(c.cs,undefined,'index must not eagerly load all candles');assert.equal(c.vis,210);assert.equal(c.fut,90);const cs=JSON.parse(fs.readFileSync(c.file));assert.equal(cs.length,300);for(const [o,h,l,cl] of cs){assert.ok([o,h,l,cl].every(v=>Number.isFinite(v)&&v>0));assert.ok(h>=Math.max(o,cl)&&l<=Math.min(o,cl));}}
});
test('300-candle windows do not overlap within a market and timeframe',()=>{
 const groups=Map.groupBy(charts,c=>c.sym+c.intervalMs);assert.equal(groups.size,100);
 for(const group of groups.values()){group.sort((a,b)=>a.startTime-b.startTime);for(let i=1;i<group.length;i++)assert.ok(group[i].startTime>=group[i-1].startTime+300*group[i].intervalMs);}
});
test('data loader reuses concurrent downloads and retries failed requests',async()=>{
 let calls=0,fail=true;const c={window:{BATTLE_CHARTS:[{...charts[0]}]},fetch:async()=>{calls++;if(fail)throw Error('offline');return{ok:true,json:async()=>JSON.parse(fs.readFileSync(charts[0].file))};}};
 vm.runInNewContext(fs.readFileSync('battle-data.js','utf8'),c);
 await assert.rejects(c.window.ArenaData.load(0));fail=false;await Promise.all([c.window.ArenaData.load(0),c.window.ArenaData.load(0)]);assert.equal(calls,2);assert.equal(c.window.BATTLE_CHARTS[0].cs.length,300);
});
