/* Bots receive only visible candles. No data pool, future price or opponent pick access. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ArenaRivals=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const TYPES={holder:{name:'다이아손',label:'버티기',description:'큰 손실 전에는 포지션 유지'},scalper:{name:'익절장인',label:'빠른 확정',description:'작은 이익도 빠르게 확정'},switcher:{name:'추세추격',label:'전환형',description:'최근 흐름이 바뀌면 스위치'},contrarian:{name:'반등사냥',label:'역추세',description:'최근 급등락의 반전을 노림'}};
 function type(id){return TYPES[id]||TYPES.holder;}
 function trend(candles){const closes=candles.slice(-20).map(c=>c[3]),last=closes.at(-1)||1,mean=closes.reduce((a,b)=>a+b,0)/(closes.length||1);return last>=mean?'L':'S';}
 function entry(id,candles){const direction=trend(candles);return {dir:id==='contrarian'?(direction==='L'?'S':'L'):direction,lev:id==='holder'?3:id==='scalper'?1:2};}
 function checkpoint(id,candles,context){
  if(!['L','S'].includes(context.dir)||context.gainPct<=-5)return 'STOP';
  if(id==='scalper'&&(context.gainPct>=.4||context.gainPct<=-.8))return 'STOP';
  if(id==='switcher'&&trend(candles)!==context.dir)return 'SWITCH';
  if(id==='contrarian'&&context.gainPct>=1)return 'STOP';return 'GO';
 }
 function highlight(rows){return rows.reduce((best,row)=>!best||Math.abs(row.swing)>Math.abs(best.swing)?row:best,null);}
 function rematchReady(room,now){
  const ids=Object.keys(room.players||{}).filter(id=>!room.players[id].bot),votes=room.rematchVotes||{};
  return ids.length>0&&ids.every(id=>{const v=votes[id];return v&&v.seq===(room.rematchSeq||0)&&Number.isSafeInteger(v.gold)&&v.gold>0&&Number.isFinite(v.at)&&v.at<=now+2000&&now-v.at<30000;});
 }
 return {TYPES,type,entry,checkpoint,highlight,rematchReady};
});
