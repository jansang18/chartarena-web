const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),R=require('../battle-rules.js');
const html=fs.readFileSync(require.resolve('../quiz-battle.html'),'utf8');
const start=html.indexOf('function finalResult(){'),end=html.indexOf('\n(function(){ var cv=',start);
function finish(tableId){
 let game=R.walletOpen({balance:25000},'m',tableId,'me'),writes=0,xp=0;
 for(let i=1;i<=R.ROUNDS;i++)game=R.walletRound(game,'m',{dir:'L',lev:2},.5,i,false);
 const nodes={},me={name:'me',score:game.battleActive.state.score,state:game.battleActive.state};
 const ctx={ArenaRules:R,phase:'result',players:[me],matchPaid:false,highlight:null,MODE:'4p',LIVE:null,
  stopBattle(){},renderPods(){},currentTable:()=>R.table(tableId),getBal:()=>game.balance,
  closeWallet(){game=R.walletClose(game,'m');writes++;},battleXp(){xp++;},
  fmtP:String,fmtLead:String,esc:String,
  $(id){return nodes[id]||=( {classList:{add(){}},textContent:'',innerHTML:''} );}
 };
 vm.createContext(ctx);vm.runInContext(html.slice(start,end),ctx);ctx.finalResult();ctx.finalResult();
 return{game,writes,xp,nodes,ctx};
}
test('actual final handler returns reserve plus exact cumulative gain, once, with no rank bonus',()=>{
 const r=finish('standard');assert.equal(r.game.balance,30000);assert.equal(r.game.battleLast.delta,5000);
 assert.equal(r.writes,1);assert.equal(r.xp,1);assert.match(r.nodes.verdict.innerHTML,/골드 정산 5000 골드/);
 assert.equal(r.nodes.go.disabled,false);assert.equal(r.ctx.phase,'final');
});
test('actual practice final shows simulated results without wallet or XP rewards',()=>{
 const r=finish('practice');assert.equal(r.game.balance,25000);assert.equal(r.xp,0);
 assert.equal(r.game.battleLast.delta,0);assert.match(r.nodes.verdict.innerHTML,/모의 손익 500 골드/);
});
