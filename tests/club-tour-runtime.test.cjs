const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),T=require('../club-tour-rules.js');
const source=fs.readFileSync(require.resolve('../club-tour.js'),'utf8'),code=source.slice(source.indexOf('async function start('),source.indexOf('async function transition('));
test('actual start handler cannot replace a save that changed during chart loading',async()=>{
 let stored=null,release;const ctx={busy:false,$:()=>({disabled:false}),read:()=>stored,KEY:'tour',character:'tr_sera',BATTLE_CHARTS:Array(3),ArenaData:{load:()=>new Promise(r=>release=r)},T,crypto:{randomUUID:()=> 'new-stale-run'},locked:fn=>fn(),localStorage:{setItem:(_,raw)=>{stored=JSON.parse(raw);}},enter:async()=>{},lobby:()=>{}};
 vm.createContext(ctx);vm.runInContext(code,ctx);const starting=ctx.start();stored=T.commit(T.create('other-tab','tr_taeo',[0,1,2],0),{dir:'L',lev:2},{dir:'S',lev:1},1);release();await starting;assert.equal(stored.id,'other-tab');assert.equal(stored.revision,1);
});
