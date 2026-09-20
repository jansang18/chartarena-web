/* Presentation only: never changes choices, candles, scores, or the wallet. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ArenaPresentation=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const INTRO_MS=1800;
 const delays=[...Array(24).fill(180),...Array(3).fill(360),700,1000,1600];
 const revealAt=delays.map((_,i)=>INTRO_MS+delays.slice(0,i+1).reduce((sum,n)=>sum+n,0));
 function revealFrame(elapsed){
  const count=revealAt.filter(at=>elapsed>=at).length;
  return {intro:elapsed<INTRO_MS,count,done:count===30};
 }
 function disclose(rows,stage,revealed){
  const through=(stage-1)*30;
  return rows.map(row=>{
   if(!revealed)return {id:row.id,action:'LOCKED'};
   const pick=row.pick||{},exit=pick.exit||90;
   let direction=pick.dir;
   for(const at of pick.switches||[])if(at<=through)direction=direction==='L'?'S':direction==='S'?'L':direction;
   const action=direction==='W'?'PASS':!['L','S'].includes(direction)?'MISSED':exit<through?'HELD':exit===through?'STOP':stage===1?'ENTRY':(pick.switches||[]).includes(through)?'SWITCH':'GO';
   return {id:row.id,action,direction,leverage:pick.lev||1};
  });
 }
 function standings(rows,myId){
  const players=rows.map(row=>{
   const ahead=rows.filter(p=>p.score>row.score).sort((a,b)=>a.score-b.score);
   const others=rows.filter(p=>p.id!==row.id),tied=others.some(p=>p.score===row.score);
   return {id:row.id,score:row.score,rank:1+ahead.length,tied,gap:ahead.length?ahead[0].score-row.score:0,rivalId:ahead.length?ahead[0].id:null,lead:ahead.length||!others.length?0:row.score-Math.max(...others.map(p=>p.score))};
  });
  return {players,me:players.find(p=>p.id===myId)||null};
 }
 function rankChange(previous,current){
  const before=previous&&previous.me,after=current&&current.me;
  if(!before||!after||before.id!==after.id)return null;
  if(after.rank===1&&!after.tied&&(before.rank!==1||before.tied))return {kind:'lead',from:before.rank,to:1};
  if(after.rank<before.rank)return {kind:after.rank===1&&after.tied?'tie':'up',from:before.rank,to:after.rank};
  if(after.rank>before.rank)return {kind:'down',from:before.rank,to:after.rank};
  return null;
 }
 return {INTRO_MS,disclose,standings,rankChange,revealFrame};
});
