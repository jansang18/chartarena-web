const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function harness(){
 let held=false,queue=[];const locks={request(name,options,fn){if(typeof options==='function'){fn=options;options={};}return new Promise((resolve,reject)=>{const enter=()=>{if(held&&options.ifAvailable){Promise.resolve().then(()=>fn(null)).then(resolve,reject);return;}if(held){queue.push(enter);return;}held=true;Promise.resolve().then(()=>fn({name})).then(resolve,reject).finally(()=>{held=false;queue.shift()?.();});};enter();});}};
 const make=()=>{const c={navigator:{locks},Promise};vm.createContext(c);vm.runInContext(fs.readFileSync('arena-wallet.js','utf8'),c);return c.ArenaWallet;};return {a:make(),b:make()};
}
test('every wallet-writing page loads the mutex before its first use',()=>{
 for(const file of ['index.html','landscape.html','quiz-battle.html','survival.html','deathmatch.html']){const html=fs.readFileSync(file,'utf8');const script=html.indexOf('src="arena-wallet.js');assert.ok(script>=0,file+' missing wallet runtime');const firstUse=html.indexOf('ArenaWallet.');if(firstUse>=0)assert.ok(script<firstUse,file+' script order');}
});
test('shared wallet lock serializes a purchase and deathmatch settlement without losing either',async()=>{
 const {a,b}=harness();let wallet={balance:0,deathmatchActive:{gold:50000}};
 await Promise.all([a.run(async()=>{const fresh={...wallet};await Promise.resolve();fresh.balance+=100000;wallet=fresh;}),b.run(()=>{const fresh={...wallet};fresh.balance+=fresh.deathmatchActive.gold;fresh.deathmatchActive=null;wallet=fresh;})]);assert.equal(wallet.balance,150000);assert.equal(wallet.deathmatchActive,null);
});
test('normal match holds wallet until close; other pages fail without changing gold',async()=>{
 const {a,b}=harness();let started=false,changed=false;const match=a.hold(()=>{started=true;return true;});await Promise.resolve();assert.equal(started,true);
 await assert.rejects(b.run(()=>{changed=true;},{ifAvailable:true}),/다른 창/);assert.equal(changed,false);a.release();await match;await b.run(()=>{changed=true;});assert.equal(changed,true);
});
test('failed entry and release during entry do not leave a held lock',async()=>{
 const {a,b}=harness();await a.hold(()=>false);await a.hold(()=>{a.release();return false;});let ran=false;await b.run(()=>ran=true);assert.equal(ran,true);
});
