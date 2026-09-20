const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),R=require('../battle-rules.js');
const html=fs.readFileSync(require.resolve('../quiz-battle.html'),'utf8');
test('purchased gold stays playable after loss exceeding the former room budget',()=>{
 let g=R.walletOpen({balance:25000+50000},'purchase','standard','me');
 assert.equal(g.battleActive.state.balance,75000);
 g=R.walletRound(g,'purchase',{dir:'L',lev:10},-2,1,false);
 assert.equal(g.battleActive.state.balance,55000);
 assert.equal(R.choice(g.battleActive.state,{dir:'L',lev:1}).dir,'L');
 g=R.walletRound(g,'purchase',{dir:'L',lev:1},1,2,false);
 assert.equal(R.walletClose(g,'purchase').balance,56000);
});
test('rooms only change rate, even a balance below former entry reserve is playable',()=>{
 for(const table of ['beginner','standard','expert']){const g=R.walletOpen({balance:500},table,table,'me');assert.equal(g.battleActive.state.balance,500);assert.equal(g.balance,0);}
});
test('only full wallet depletion blocks choices and close is idempotent',()=>{
 let g=R.walletOpen({balance:75000},'all','standard','me');
 g=R.walletRound(g,'all',{dir:'S',lev:10},50,1,true);
 assert.equal(g.battleActive.pending.delta,-75000);
 const closed=R.walletClose(g,'all');assert.equal(closed.balance,0);assert.deepEqual(R.walletClose(closed,'all'),closed);
 assert.equal(R.choice(g.battleActive.pending,{dir:'L'}).dir,'N');
});
test('legacy reserved match closes without losing unreserved wallet gold',()=>{
 const g={balance:55000,battleActive:{id:'old',tableId:'standard',reserve:20000,state:R.create('me','standard',18000),pending:null}};
 assert.equal(R.walletClose(g,'old').balance,73000);
});
test('online history produces consistent per-player outcomes for unequal wallets',()=>{
 const hist=[{round:1,seg:0,picks:{a:{dir:'S',lev:10},b:{dir:'S',lev:10}}}];
 for(const ids of [['a','b'],['b','a']]){const states=ids.map(id=>R.recover(R.create(id,'standard',id==='a'?75000:5000),hist,()=>2));assert.equal(states.find(p=>p.id==='a').balance,55000);assert.equal(states.find(p=>p.id==='b').balance,0);}
});
test('actual initMatch uses purchased wallet and render control allows next choice',()=>{
 let g={balance:75000};const nodes={};const ctx={myCh:'tr_seon',skillArmed:false,renderSkill(){},ArenaRules:R,players:[{uid:'me'}],selectedTable:'standard',getBal:()=>g.balance,GS:'wallet',ljg:()=>g,saveWallet:v=>g=v,showLobby(){throw Error('unexpected lobby');},toast:assert.fail,Date,Math};
 vm.createContext(ctx);vm.runInContext(html.slice(html.indexOf('function initMatch('),html.indexOf('function prepareRound(')),ctx);
 assert.equal(ctx.initMatch('actual'),true);assert.equal(ctx.players[0].state.balance,75000);
 ctx.players[0].state=R.settle(ctx.players[0].state,{dir:'S',lev:10},2,1);
 Object.assign(ctx,{phase:'pick',LIVE:null,mySel:{dir:'L',lev:1},currentTable:()=>R.table('standard'),fmtP:String,$:id=>nodes[id]||=( {classList:{toggle(){}},querySelector:()=>({textContent:''})} )});
 vm.runInContext(html.slice(html.indexOf('function goldEquation('),html.indexOf("$('dL').onclick=")),ctx);
 ctx.renderCtrl();assert.equal(ctx.canChoose(),true);assert.equal(nodes.go.disabled,false);assert.match(nodes.bbal.textContent,/55000/);
});
