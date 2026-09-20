/* Deterministic percentage-gold rules and atomic local-wallet transitions. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ArenaRules=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION=6,ROUNDS=5;
const TABLES=Object.freeze({
 practice:Object.freeze({id:'practice',name:'연습방',rate:100,reserve:0,capital:2000,practice:true}),
 beginner:Object.freeze({id:'beginner',name:'입문방',rate:100,reserve:1,capital:2000}),
 standard:Object.freeze({id:'standard',name:'일반방',rate:1000,reserve:1,capital:20000}),
 expert:Object.freeze({id:'expert',name:'고수방',rate:10000,reserve:1,capital:200000})
});
function table(id){id=id||'standard';if(!Object.hasOwn(TABLES,id))throw Error('Unknown table');return TABLES[id];}
function create(id,tableId,capital){const t=table(tableId);if(capital!==undefined&&(!Number.isSafeInteger(capital)||capital<0))throw Error('Invalid starting gold');return {id:String(id),tableId:t.id,balance:t.practice||capital===undefined?t.capital:capital,score:0,delta:0,passUsed:false,appliedRound:0};}
function choice(player,input){input=input||{};let dir=['L','S','W'].includes(input.dir)?input.dir:'N';if((dir==='W'&&player.passUsed)||player.balance<=0)dir='N';const pick={dir,lev:[1,2,3,5,10].includes(input.lev)?input.lev:1};if([30,60,90].includes(input.exit))pick.exit=input.exit;return pick;}
function exitAt(input){return input&&[30,60,90].includes(input.exit)?input.exit:90;}
function checkpoint(picks,decisions,stage){
 if(![1,2].includes(stage))throw Error('Invalid checkpoint');
 const next={};for(const [id,pick] of Object.entries(picks)){next[id]=Object.assign({},pick);if(['L','S'].includes(pick.dir)&&exitAt(pick)>stage*30&&decisions[id]!=='GO')next[id].exit=stage*30;}return next;
}
function goldRound(v){return Math.sign(v)*Math.round(Math.abs(v)+1e-8)||0;}
function profit(player,input,move){
 if(typeof move!=='number'||!Number.isFinite(move))throw Error('Invalid chart move');
 // Quote the same four-decimal percentage used by the on-screen equation.
 move=Number(move.toFixed(4));
 const pick=choice(player,input),t=table(player.tableId),signedPct=pick.dir==='L'?move:pick.dir==='S'?-move:0;
 const raw=signedPct*t.rate*pick.lev;if(!Number.isSafeInteger(Math.trunc(raw)))throw Error('Gold result exceeds range');
 const uncapped=goldRound(raw),delta=Math.max(-player.balance,uncapped);
 return {delta,pick,signedPct,rate:t.rate,capped:delta!==uncapped};
}
function settle(player,input,move,round){
 if(!Number.isInteger(round)||round<1||round>ROUNDS)throw Error('Invalid round');
 if(round<=player.appliedRound)return player;if(round!==player.appliedRound+1)throw Error('Round must advance exactly once');
 const p=profit(player,input,move);return Object.assign({},player,p,{balance:player.balance+p.delta,score:player.score+p.delta,passUsed:player.passUsed||p.pick.dir==='W',appliedRound:round});
}
function recover(state,history,moveForSegment){let next=state;for(const entry of history.slice().sort((a,b)=>a.round-b.round)){if(entry.round<=next.appliedRound)continue;const input=(entry.picks||{})[next.id];next=settle(next,input,moveForSegment(entry.seg,exitAt(input)),entry.round);}return next;}
function rank(players,id){const me=players.find(p=>p.id===id);return me?1+players.filter(p=>p.score>me.score).length:players.length;}
function walletBalance(game){return Number.isSafeInteger(game.balance)&&game.balance>=0?game.balance:25000;}
function walletOpen(game,id,tableId,playerId){
 const t=table(tableId),balance=walletBalance(game);
 if(game.deathmatchActive)throw Error('진행 중인 데스매치를 먼저 마쳐 주세요.');
 if(game.battleActive)throw Error('이미 진행 중인 경기가 있습니다.');
 if(!id||(game.battleClosed||[]).includes(id))throw Error('이미 정산한 경기입니다.');
 if(balance<t.reserve)throw Error('입장에 필요한 골드가 부족합니다.');
 const reserved=t.practice?0:balance;
 return Object.assign({},game,{balance:balance-reserved,battleActive:{id,tableId:t.id,reserve:reserved,state:create(playerId,t.id,balance),pending:null}});
}
function walletRound(game,id,input,move,round,pending){
 const a=game.battleActive;if(!a||a.id!==id)throw Error('경기가 다른 창에서 정산되었습니다.');
 if(round<=a.state.appliedRound)return game;
 const next=settle(a.state,input,move,round);
 return Object.assign({},game,{battleActive:Object.assign({},a,pending?{pending:next}:{state:next,pending:null})});
}
function walletClose(game,id){
 const a=game.battleActive;if(!a||a.id!==id)return game;
 const t=table(a.tableId),state=a.pending||a.state,returned=t.practice?0:state.balance;
 const closed=(game.battleClosed||[]).concat(id).slice(-100);
 return Object.assign({},game,{balance:walletBalance(game)+returned,battleActive:null,battleClosed:closed,battleLast:{id,tableId:t.id,delta:t.practice?0:state.score,simulated:state.score,rounds:state.appliedRound}});
}
return {VERSION,ROUNDS,TABLES,table,create,choice,exitAt,checkpoint,profit,settle,recover,rank,walletBalance,walletOpen,walletRound,walletClose};
});
