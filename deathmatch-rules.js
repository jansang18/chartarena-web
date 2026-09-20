(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.DeathmatchRules=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const RATE=20000,ROUNDS=5,MULTIPLES=[1,1.5,2,3];
function requireThat(ok,message){if(!ok)throw Error(message||'지금은 선택할 수 없습니다.');}
function create(id,capital,segment){
 requireThat(typeof id==='string'&&id&&Number.isSafeInteger(capital)&&capital>0&&capital<=Number.MAX_SAFE_INTEGER/2,'입장 골드가 필요합니다.');
 requireThat(Number.isInteger(segment)&&segment>=0,'차트를 확인해 주세요.');
 return {id,version:1,balances:[capital,capital],initial:capital,round:1,segment,phase:'pick',stage:0,agreed:1,picks:null,offer:null,turn:0,ready:[],mark:0,result:null,history:[],seen:[],revision:0};
}
function finished(s){return s.phase==='closed'||s.phase==='result'&&(s.round>=ROUNDS||s.balances.some(n=>n===0));}
function stake(s){return Math.min(RATE*s.agreed,...s.balances);}
function award(s,winner,raw,reason,move){
 const amount=winner===null?0:Math.min(Math.round(raw+1e-8),...s.balances);
 const balances=s.balances.slice();if(winner!==null){balances[winner]+=amount;balances[1-winner]-=amount;}
 const result={round:s.round,winner,amount,reason,move:move??s.mark,multiple:s.agreed,capped:amount<raw};
 return {...s,balances,phase:'result',offer:null,result,history:[...s.history,result]};
}
function reveal(s){return {...s,phase:'reveal',stage:s.stage+1,offer:null,ready:[]};}
function step(s,a){
 requireThat(a&&typeof a.id==='string'&&a.id,'선택 번호가 없습니다.');if(s.seen.includes(a.id))return s;
 requireThat(s.phase!=='closed','종료된 경기입니다.');let n=s;
 switch(a.type){
 case 'LOCK':
  requireThat(s.phase==='pick'&&Array.isArray(a.picks)&&a.picks.length===2&&a.picks.every(p=>['L','S'].includes(p)));
  n=reveal({...s,picks:a.picks.slice()});break;
 case 'REVEALED': {
  requireThat(s.phase==='reveal'&&typeof a.move==='number'&&Number.isFinite(a.move)&&Math.abs(a.move)<1e8);
  const move=Number(a.move.toFixed(4));n={...s,mark:move};
  if(s.stage===3){const winner=move===0||s.picks[0]===s.picks[1]?null:(s.picks[0]===(move>0?'L':'S')?0:1);n=award(n,winner,Math.abs(move)*RATE*s.agreed,'chart',move);}
  else n={...n,phase:'decision',turn:(s.round-1)%2,ready:[]};break;
 }
 case 'GO':
  requireThat(s.phase==='decision'&&a.actor===s.turn&&!s.ready.includes(a.actor));
  n={...s,ready:[...s.ready,a.actor],turn:1-a.actor};if(n.ready.length===2)n=reveal(n);break;
 case 'RAISE':
  requireThat(s.phase==='decision'&&a.actor===s.turn&&MULTIPLES.includes(a.multiple)&&a.multiple>s.agreed);
  n={...s,phase:'respond',offer:{actor:a.actor,multiple:a.multiple},turn:1-a.actor};break;
 case 'CALL':
  requireThat(s.phase==='respond'&&a.actor===s.turn);n=reveal({...s,agreed:s.offer.multiple});break;
 case 'FOLD':
  requireThat(['decision','respond'].includes(s.phase)&&a.actor===s.turn);n=award(s,1-a.actor,stake(s),'fold');break;
 case 'NEXT':
  requireThat(s.phase==='result'&&!finished(s)&&Number.isInteger(a.segment)&&a.segment>=0&&a.segment!==s.segment);
  n={...s,round:s.round+1,segment:a.segment,phase:'pick',stage:0,agreed:1,picks:null,offer:null,ready:[],result:null,mark:0};break;
 case 'EXIT':
  if(s.picks&&!['result','pick'].includes(s.phase))n=award(s,1,stake(s),'exit');n={...n,phase:'closed'};break;
 default:throw Error('알 수 없는 선택입니다.');
 }
 return {...n,revision:s.revision+1,seen:[...s.seen,a.id].slice(-128)};
}
function balance(g){return Number.isSafeInteger(g.balance)&&g.balance>=0?g.balance:25000;}
function open(g,id,segment){
 requireThat(!g.battleActive&&!g.deathmatchActive,'진행 중인 경기를 먼저 마쳐 주세요.');
 requireThat(!(g.deathmatchClosed||[]).includes(id),'이미 정산한 경기입니다.');
 return {...g,balance:0,deathmatchActive:create(id,balance(g),segment)};
}
function close(g,id){
 const s=g.deathmatchActive;if(!s||s.id!==id)return g;requireThat(finished(s),'경기를 먼저 종료해 주세요.');
 requireThat(Number.isSafeInteger(balance(g)+s.balances[0]),'골드 범위를 초과했습니다.');
 return {...g,balance:balance(g)+s.balances[0],deathmatchActive:null,deathmatchClosed:[...(g.deathmatchClosed||[]),id].slice(-100),deathmatchLast:{id,delta:s.balances[0]-s.initial,rounds:s.history.length,history:s.history,bot:true}};
}
function save(g,next){const updated={...g,deathmatchActive:next};return finished(next)?close(updated,next.id):updated;}
return {RATE,ROUNDS,MULTIPLES,create,step,finished,stake,balance,open,close,save};
});
