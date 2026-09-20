const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),R=require('../deathmatch-rules.js');
function environment(initial={balance:100000}){
 const data=new Map([['chartarena_web_v1',JSON.stringify(initial)]]);let seq=0,charges=0,chain=Promise.resolve();
 const locks={request(name,options,fn){if(typeof options==='function')fn=options;const p=chain.then(()=>fn({name}));chain=p.catch(()=>{});return p;}};
 function page(){
  const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,textContent:'',innerHTML:'',getBoundingClientRect:()=>({width:0,height:0}),showModal(){},close(){}});return nodes.get(id);};
  const c={DeathmatchRules:R,crypto:{randomUUID:()=>String(++seq)},navigator:{locks},localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},ArenaCharacters:{get:()=>({id:'me',image:'me.png',name:'나'}),list:[{id:'bot',name:'봇',image:'bot.png'}]},NRG:{has:()=>true,use:()=>{charges++;}},document:{getElementById:node,documentElement:{dataset:{},removeAttribute(){}}},ResizeObserver:class{observe(){}},addEventListener(){},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},ArenaReactions:{mount(){},clear(){},close(){}},BATTLE_CHARTS:[{id:'a'},{id:'b'}],ArenaData:{load:async i=>({id:i,tf:'5분봉',cs:Array.from({length:300},()=>[100,101,99,100])})},Math:Object.assign(Object.create(Math),{random:()=>0}),Date,console};
  c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync('arena-wallet.js','utf8'),c);
  vm.runInContext(fs.readFileSync('deathmatch.js','utf8').replace(/\}\)\(\);\s*$/,'window.testAPI={start,action,state:()=>state};})();'),c);
  return {api:c.testAPI,node};
 }
 return {page,game:()=>JSON.parse(data.get('chartarena_web_v1')),charges:()=>charges,data};
}
test('actual resume repairs a terminal escrow and never charges another play',async()=>{
 let g=R.open({balance:50000},'interrupted',0);g.deathmatchActive=R.step(g.deathmatchActive,{id:'exit',type:'EXIT'});
 const env=environment(g),p=env.page();await p.api.start();assert.equal(env.game().balance,50000);assert.equal(env.game().deathmatchActive,null);assert.equal(env.charges(),0);assert.equal(p.node('game').hidden,true);
});
test('simultaneous actual starts create one match and spend exactly one play',async()=>{
 const env=environment(),a=env.page(),b=env.page();await Promise.all([a.api.start(),b.api.start()]);assert.equal(env.charges(),1);assert.ok(env.game().deathmatchActive);assert.equal(env.game().balance,0);
 await a.api.action('LOCK',{picks:['L','S']});assert.equal(env.game().deathmatchActive.phase,'pick','old owner must not write');
 await b.api.action('LOCK',{picks:['L','S']});assert.equal(env.game().deathmatchActive.phase,'reveal');
});
test('actual five-round GO/call/reveal flow credits exactly once and keeps purchases',async()=>{
 const env=environment(),p=env.page();await p.api.start();const id=env.game().deathmatchActive.id;
 for(let round=1;round<=5;round++){
  await p.api.action('LOCK',{picks:['L','S']});
  for(let stage=1;stage<=3;stage++){
   await p.api.action('REVEALED',{move:.1});
   if(stage<3){let s=p.api.state();await p.api.action('RAISE',{actor:s.turn,multiple:stage===1?1.5:3});s=p.api.state();await p.api.action('CALL',{actor:s.turn});}
  }
  if(round===2){const g=env.game();g.balance+=50000;env.data.set('chartarena_web_v1',JSON.stringify(g));}
  if(round<5)await p.api.action('NEXT');
 }
 assert.equal(env.game().balance,180000);assert.equal(env.game().deathmatchActive,null);assert.equal(env.game().deathmatchLast.rounds,5);assert.equal(env.charges(),1);
 await p.api.action('REVEALED',{move:.1});assert.equal(env.game().balance,180000);assert.deepEqual(env.game().deathmatchClosed,[id]);
});
