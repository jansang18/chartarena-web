/* Deterministic percentage-gold rules and atomic local-wallet transitions. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ArenaRules=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION=10,ROUNDS=5,DECISION_SECONDS=15;
const SKILLS=Object.freeze({
 tr_seon:{kind:'boost',name:'승부수',description:'다음 30봉 배율 한 단계 상승 · 손익 모두 적용'},
 tr_yuna:{kind:'redesign',name:'재설계',description:'30·60봉 결정에서 남은 구간의 배율 재선택'},
 tr_kai:{kind:'defense',name:'방어',description:'다음 30봉 이익과 손실 모두 절반'},
 tr_rin:{kind:'steady',name:'안전운전',description:'다음 30봉만 1배로 운용 후 원래 배율 복귀'},
 tr_doyun:{kind:'neutral',name:'중립',description:'다음 30봉 손익 0 · 이후 기존 포지션 재개'}
});
const CHARACTER_SKILLS=Object.freeze({tr_sera:'tr_seon',tr_narin:'tr_rin',tr_chaerin:'tr_yuna',tr_sia:'tr_doyun',tr_arin:'tr_kai',tr_taeo:'tr_kai',tr_ijun:'tr_yuna',tr_jihan:'tr_doyun',tr_ryujin:'tr_seon',tr_mujin:'tr_rin'});
function skillFor(character){return SKILLS[CHARACTER_SKILLS[character]]||SKILLS[character]||SKILLS.tr_seon;}
function leverageAt(pick,at){
 const s=pick.skill,lev=pick.lev||1;if(!s||at<s.at)return lev;
 if(s.kind==='redesign')return s.lev;if(at>=s.at+30)return lev;
 return s.kind==='boost'?[1,2,3,5,10][Math.min(4,[1,2,3,5,10].indexOf(lev)+1)]:s.kind==='defense'?lev/2:s.kind==='steady'?1:s.kind==='neutral'?0:lev;
}
function activateSkill(player,input,at,round,lev){
 const pick=choice(player,input),s=skillFor(player.character);
 if(player.skillUsedRound||pick.skill||!['L','S'].includes(pick.dir)||![0,30,60].includes(at)||exitAt(pick)<=at||!Number.isInteger(round)||round!==player.appliedRound+1||round>ROUNDS)throw Error('Skill unavailable');
 if((s.kind==='boost'&&pick.lev===10)||(s.kind==='steady'&&pick.lev===1)||(s.kind==='redesign'&&(at===0||![1,2,3,5,10].includes(lev)||lev===pick.lev)))throw Error('Skill has no valid effect');
 return Object.assign({},pick,{skill:Object.assign({kind:s.kind,at,round},s.kind==='redesign'?{lev}:{})});
}
function entryChoice(player,raw,round){
 raw=raw||{};let pick=choice(player,{dir:raw.dir,lev:raw.lev});
 if(raw.skill&&raw.skill.at===0&&raw.skill.round===round){try{pick=activateSkill(player,pick,0,round,raw.skill.lev);}catch(_){}}
 return pick;
}
function checkpointChoice(player,pick,decision,stage,round,skill){
 const next=checkpoint({me:pick},{me:decision},stage).me;
 if(skill&&decision!=='STOP'&&skill.at===stage*30&&skill.round===round){try{return activateSkill(player,next,stage*30,round,skill.lev);}catch(_){}}
 return next;
}
const TABLES=Object.freeze({
 practice:Object.freeze({id:'practice',name:'연습방',rate:100,reserve:0,capital:2000,practice:true}),
 beginner:Object.freeze({id:'beginner',name:'입문방',rate:100,reserve:1,capital:2000}),
 standard:Object.freeze({id:'standard',name:'일반방',rate:1000,reserve:1,capital:20000}),
 expert:Object.freeze({id:'expert',name:'고수방',rate:10000,reserve:1,capital:200000})
});
function table(id){id=id||'standard';if(!Object.hasOwn(TABLES,id))throw Error('Unknown table');return TABLES[id];}
function create(id,tableId,capital,character){const t=table(tableId);if(capital!==undefined&&(!Number.isSafeInteger(capital)||capital<0))throw Error('Invalid starting gold');return {id:String(id),tableId:t.id,balance:t.practice||capital===undefined?t.capital:capital,score:0,delta:0,passUsed:false,appliedRound:0,character:Object.hasOwn(SKILLS,character)||Object.hasOwn(CHARACTER_SKILLS,character)?character:'tr_sera',skillUsedRound:0};}
function choice(player,input){input=input||{};let dir=['L','S','W'].includes(input.dir)?input.dir:'N';if((dir==='W'&&player.passUsed)||player.balance<=0)dir='N';const pick={dir,lev:[1,2,3,5,10].includes(input.lev)?input.lev:1};if([30,60,90].includes(input.exit))pick.exit=input.exit;
 if(input.switches!==undefined){if(!Array.isArray(input.switches)||input.switches.length>2||input.switches.some((at,i)=>![30,60].includes(at)||at>exitAt(pick)||(i&&at<=input.switches[i-1])))throw Error('Invalid switch path');if(['L','S'].includes(dir)&&input.switches.length)pick.switches=input.switches.slice();}
 if(input.skill){const s=input.skill;if(s.kind!==skillFor(player.character).kind||![0,30,60].includes(s.at)||!Number.isInteger(s.round)||s.round<1||s.round>ROUNDS||s.at>=exitAt(pick)||(player.skillUsedRound&&player.skillUsedRound!==s.round)||!['L','S'].includes(dir)||(s.kind==='redesign'&&(s.at===0||![1,2,3,5,10].includes(s.lev))))throw Error('Invalid character skill');pick.skill={kind:s.kind,at:s.at,round:s.round};if(s.kind==='redesign')pick.skill.lev=s.lev;}
 return pick;}
function exitAt(input){return input&&[30,60,90].includes(input.exit)?input.exit:90;}
function directionAt(input,through=90){let dir=(input||{}).dir;for(const at of (input||{}).switches||[])if(at<=Math.min(through,exitAt(input)))dir=dir==='L'?'S':dir==='S'?'L':dir;return dir;}
function checkpoint(picks,decisions,stage){
 if(![1,2].includes(stage))throw Error('Invalid checkpoint');
 const next={};for(const [id,pick] of Object.entries(picks)){next[id]=Object.assign({},pick);if(pick.switches)next[id].switches=pick.switches.slice();if(!['L','S'].includes(pick.dir)||exitAt(pick)<=stage*30)continue;
  if(decisions[id]==='SWITCH'){if(!(pick.switches||[]).some(at=>at>=stage*30))next[id].switches=(pick.switches||[]).concat(stage*30);}
  else if(decisions[id]!=='GO')next[id].exit=stage*30;
 }return next;
}
function goldRound(v){return Math.sign(v)*Math.round(Math.abs(v)+1e-8)||0;}
function profit(player,input,move,through){
 const pick=choice(player,input),t=table(player.tableId),end=Math.min(through===undefined?90:through,exitAt(pick));
 if(!Number.isInteger(end)||end<0||end>90)throw Error('Invalid reveal endpoint');
 if(((pick.switches||[]).length||pick.skill)&&typeof move!=='function')throw Error('Position path prices are required');
 const quote=at=>{const v=at===0?0:typeof move==='function'?move(at):move;if(typeof v!=='number'||!Number.isFinite(v)||v<=-100)throw Error('Invalid chart move');return v;};
 // Validate numeric inputs even for no-position or zero-length previews.
 if(typeof move!=='function'&&(typeof move!=='number'||!Number.isFinite(move)))throw Error('Invalid chart move');
 const boundaries=(pick.switches||[]).filter(at=>at<=end);
 if(pick.skill){for(const at of [pick.skill.at,pick.skill.at+30])if(at>0&&at<end)boundaries.push(at);}
 const points=[...new Set(boundaries.concat(end))].sort((a,b)=>a-b),legs=[];let from=0,anchor=0,dir=pick.dir,delta=0,signedPct=0,lockedDelta=0,openDelta=0,capped=false;
 for(let i=0;i<points.length;i++){
  const to=points[i],pct=Number(((quote(to)-quote(from))/(1+quote(anchor)/100)).toFixed(4));
  const lev=leverageAt(pick,from),signed=dir==='L'?pct:dir==='S'?-pct:0,raw=signed*t.rate*lev;if(!Number.isSafeInteger(Math.trunc(raw)))throw Error('Gold result exceeds range');
  const uncapped=goldRound(raw),part=Math.max(-(player.balance+delta),uncapped),closed=i<points.length-1;
  delta+=part;signedPct+=signed;capped=capped||part!==uncapped;legs.push({from,to,dir,lev,signedPct:signed,delta:part,closed});if(closed)lockedDelta+=part;else openDelta=part;
  if(!Number.isSafeInteger(player.balance+delta))throw Error('Gold result exceeds range');
  if(player.balance+delta===0)break;from=to;if((pick.switches||[]).includes(to)){anchor=to;dir=dir==='L'?'S':dir==='S'?'L':dir;}
 }
 // Missing the entry deadline is a fixed fee, independent of leverage or candles.
 // Preview each stage from the unsettled balance; settle() applies it once per round.
 const missedPenalty=pick.dir==='N'?Math.min(player.balance,t.rate):0;
 if(missedPenalty){delta=-missedPenalty;capped=missedPenalty<t.rate;lockedDelta=delta;openDelta=0;legs.length=0;}
 return {delta,pick,signedPct:Number(signedPct.toFixed(4)),rate:t.rate,capped,legs,lockedDelta,openDelta,missedPenalty,currentDir:directionAt(pick,end)};
}
function settle(player,input,move,round,through){
 if(!Number.isInteger(round)||round<1||round>ROUNDS)throw Error('Invalid round');
 if(round<=player.appliedRound)return player;if(round!==player.appliedRound+1)throw Error('Round must advance exactly once');
 if(input&&input.skill&&(input.skill.round!==round||player.skillUsedRound))throw Error('Skill already spent or wrong round');
 const p=profit(player,input,move,through);return Object.assign({},player,p,{balance:player.balance+p.delta,score:player.score+p.delta,passUsed:player.passUsed||p.pick.dir==='W',skillUsedRound:p.pick.skill?round:player.skillUsedRound||0,appliedRound:round});
}
function recover(state,history,moveForSegment){let next=state;for(const entry of history.slice().sort((a,b)=>a.round-b.round)){if(entry.round<=next.appliedRound)continue;const input=(entry.picks||{})[next.id];next=settle(next,input,at=>moveForSegment(entry.seg,at),entry.round);}return next;}
function rank(players,id){const me=players.find(p=>p.id===id);return me?1+players.filter(p=>p.score>me.score).length:players.length;}
function walletBalance(game){return Number.isSafeInteger(game.balance)&&game.balance>=0?game.balance:25000;}
function walletOpen(game,id,tableId,playerId,character){
 const t=table(tableId),balance=walletBalance(game);
 if(game.deathmatchActive)throw Error('진행 중인 데스매치를 먼저 마쳐 주세요.');
 if(game.battleActive)throw Error('이미 진행 중인 경기가 있습니다.');
 if(!id||(game.battleClosed||[]).includes(id))throw Error('이미 정산한 경기입니다.');
 if(balance<t.reserve)throw Error('입장에 필요한 골드가 부족합니다.');
 const reserved=t.practice?0:balance;
 return Object.assign({},game,{balance:balance-reserved,battleActive:{id,tableId:t.id,reserve:reserved,state:create(playerId,t.id,balance,character),pending:null}});
}
function walletRound(game,id,input,move,round,pending,through){
 const a=game.battleActive;if(!a||a.id!==id)throw Error('경기가 다른 창에서 정산되었습니다.');
 if(round<=a.state.appliedRound)return game;
 const next=settle(a.state,input,move,round,through);
 return Object.assign({},game,{battleActive:Object.assign({},a,pending?{pending:next}:{state:next,pending:null})});
}
function walletClose(game,id){
 const a=game.battleActive;if(!a||a.id!==id)return game;
 const t=table(a.tableId),state=a.pending||a.state,returned=t.practice?0:state.balance;
 const closed=(game.battleClosed||[]).concat(id).slice(-100);
 return Object.assign({},game,{balance:walletBalance(game)+returned,battleActive:null,battleClosed:closed,battleLast:{id,tableId:t.id,delta:t.practice?0:state.score,simulated:state.score,rounds:state.appliedRound}});
}
return {VERSION,ROUNDS,DECISION_SECONDS,SKILLS,skillFor,activateSkill,leverageAt,entryChoice,checkpointChoice,TABLES,table,create,choice,exitAt,directionAt,checkpoint,profit,settle,recover,rank,walletBalance,walletOpen,walletRound,walletClose};
});
