/* Three-encounter solo prototype. Run points never enter the shared gold wallet. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./battle-rules.js'):root.ArenaRules);if(typeof module==='object'&&module.exports)module.exports=api;else root.ClubTourRules=api;})(typeof globalThis!=='undefined'?globalThis:this,function(R){
'use strict';
const VERSION=1,CHARACTERS=['tr_sera','tr_chaerin','tr_taeo'];
const SIGNATURES={
 tr_sera:{name:'흐름 장악',tag:'추세 유지',description:'GO와 함께 사용 · 다음 30봉 이익과 손실 모두 1.5배',when:'30·60봉에서 GO를 고를 때'},
 tr_chaerin:{name:'반전 설계',tag:'전환 타이밍',description:'SWITCH와 함께 사용 · 전환한 30봉 이익과 손실 모두 1.5배',when:'30·60봉에서 SWITCH를 고를 때'},
 tr_taeo:{name:'철벽',tag:'손실 관리',description:'다음 30봉 손실 최대 1,000점 · 이익은 절반',when:'진입, GO 또는 SWITCH를 고를 때'}
};
const OPPONENTS=[
 {character:'tr_ijun',name:'이준',title:'THE OPENING',persona:'scalper',description:'작은 이익도 빠르게 확정하는 1배 승부사'},
 {character:'tr_arin',name:'아린',title:'THE COUNTER',persona:'contrarian',description:'흐름의 반전을 노리는 2배 역추세 승부사'},
 {character:'tr_jihan',name:'지한',title:'THE FINAL TABLE',persona:'switcher',description:'최근 흐름을 추격하며 3배로 전환하는 최종 상대'}
];
const TACTICS={flow:{name:'흐름에 집중',description:'GO로 이어간 구간의 이익과 손실 ×1.2',tag:'추세'},switch:{name:'반전의 감각',description:'SWITCH 구간의 이익과 손실 ×1.2',tag:'전환'},guard:{name:'안전벨트',description:'모든 구간의 손실 ×0.75 · 이익 ×0.9',tag:'방어'}};
const clone=x=>JSON.parse(JSON.stringify(x)),round=n=>Math.sign(n)*Math.round(Math.abs(n))||0;
const player=()=>R.create('me','standard',100000000,'tr_sera');
function create(id,character,segments,now){
 if(typeof id!=='string'||!id||!CHARACTERS.includes(character)||!Array.isArray(segments)||segments.length!==3||new Set(segments).size!==3||segments.some(x=>!Number.isSafeInteger(x)||x<0)||!Number.isFinite(now))throw Error('Invalid tour');
 return {version:VERSION,id,character,segments:segments.slice(),stage:0,phase:'pick',revision:0,deadline:now+15000,revealStarted:null,revealed:0,picks:{me:null,bot:null},actions:[],signatureAt:null,tactics:[],scores:{me:0,bot:0},total:{me:0,bot:0},history:[]};
}
function eligible(s,action){const open=s.phase==='pick'?action==='ENTRY':s.phase==='checkpoint'&&s.picks.me&&['L','S'].includes(s.picks.me.dir)&&R.exitAt(s.picks.me)>s.revealed;return !!open&&s.signatureAt===null&&(s.character==='tr_taeo'?['ENTRY','GO','SWITCH'].includes(action):s.character==='tr_sera'?action==='GO':action==='SWITCH');}
function commit(s,input,botInput,now){
 if(!['pick','checkpoint'].includes(s.phase))throw Error('Decision is closed');
 input=input||{};botInput=botInput||{};const n=clone(s),entry=s.phase==='pick',action=entry?'ENTRY':['GO','SWITCH'].includes(input.action)?input.action:'STOP';
 if(input.signature&&!eligible(s,action))throw Error('Signature unavailable for this choice');
 if(input.signature&&entry&&!['L','S'].includes(input.dir))throw Error('Choose a position first');
 if(input.lev!==undefined&&![1,2,3,5,10].includes(input.lev))throw Error('Invalid leverage');
 if(entry)n.picks={me:R.entryChoice(player(),input,1),bot:R.entryChoice(player(),botInput,1)};
 else n.picks=R.checkpoint(s.picks,{me:{decision:action,lev:input.lev},bot:{decision:botInput.action||'STOP',lev:botInput.lev}},s.revealed/30);
 if(input.signature){if(R.exitAt(n.picks.me)<=s.revealed||!['L','S'].includes(n.picks.me.dir))throw Error('Signature needs an open position');n.signatureAt=s.revealed;}
 n.actions.push(action);n.phase='reveal';n.revealStarted=now;n.deadline=null;n.revision++;return n;
}
function score(s,cs,through){
 if(!Number.isInteger(through)||through<0||through>90||!Array.isArray(cs)||cs.length<210+through)throw Error('Visible candles are required');
 const move=at=>at?(cs[209+at][3]/cs[209][3]-1)*100:0,result={me:0,bot:0,steps:[]};
 for(const id of ['me','bot']){const pick=s.picks[id];if(!pick)continue;if(pick.dir==='N'){result[id]=through>0?-1000:0;continue;}let previous=0;
  for(let from=0;from<through;from+=30){const to=Math.min(from+30,through),total=R.profit(player(),pick,move,to).delta;let delta=total-previous;previous=total;
   if(id==='me'){
    for(const tactic of s.tactics){if(tactic==='flow'&&s.actions[from/30]==='GO')delta*=1.2;if(tactic==='switch'&&s.actions[from/30]==='SWITCH')delta*=1.2;if(tactic==='guard')delta*=delta<0?.75:.9;}
    if(s.signatureAt===from)delta=s.character==='tr_taeo'?(delta<0?Math.max(-1000,delta):delta*.5):delta*1.5;
    delta=round(delta);if(from<R.exitAt(pick))result.steps.push({from,to,delta,dir:R.directionAt(pick,from),lev:R.leverageAt(pick,from),action:s.actions[from/30]||'GO'});
   }
   result[id]+=delta;
  }
 }
 return result;
}
function reveal(s,cs,now){
 if(s.phase!=='reveal')throw Error('Reveal is closed');const n=clone(s);n.revealed+=30;const points=score(n,cs,n.revealed);n.scores={me:points.me,bot:points.bot};n.revision++;n.revealStarted=null;
 if(n.revealed<90){n.phase='checkpoint';n.deadline=now+15000;return n;}
 const won=points.me>=points.bot;n.total.me+=points.me;n.total.bot+=points.bot;
 n.history.push({stage:n.stage,segment:n.segments[n.stage],picks:clone(n.picks),actions:n.actions.slice(),signatureAt:n.signatureAt,tactics:n.tactics.slice(),scores:{...n.scores},won,steps:points.steps});
 n.phase=won?(n.stage===2?'won':'reward'):'lost';n.deadline=null;return n;
}
function choose(s,tactic,now){
 if(s.phase!=='reward'||!Object.hasOwn(TACTICS,tactic)||s.stage>=2)throw Error('Tactic unavailable');const n=clone(s);
 n.tactics.push(tactic);n.stage++;n.phase='pick';n.revealed=0;n.revealStarted=null;n.picks={me:null,bot:null};n.actions=[];n.signatureAt=null;n.scores={me:0,bot:0};n.deadline=now+15000;n.revision++;return n;
}
function validate(s){
 try{
  if(!s||s.version!==VERSION||typeof s.id!=='string'||!s.id||!CHARACTERS.includes(s.character)||!Number.isInteger(s.stage)||s.stage<0||s.stage>2||!Number.isSafeInteger(s.revision)||s.revision<0)return false;
  if(!['pick','checkpoint','reveal','reward','won','lost'].includes(s.phase)||![0,30,60,90].includes(s.revealed)||!Array.isArray(s.segments)||s.segments.length!==3||new Set(s.segments).size!==3||s.segments.some(x=>!Number.isSafeInteger(x)||x<0))return false;
  if(!Array.isArray(s.tactics)||s.tactics.length!==s.stage||s.tactics.some(x=>!Object.hasOwn(TACTICS,x))||!Array.isArray(s.actions)||s.actions.length>3||s.actions.some(x=>!['ENTRY','GO','SWITCH','STOP'].includes(x))||!Array.isArray(s.history))return false;
  const finished=['reward','won','lost'].includes(s.phase);if(s.history.length!==s.stage+(finished?1:0)||finished&&s.revealed!==90||s.phase==='won'&&s.stage!==2||s.phase==='reward'&&s.stage===2)return false;
  if(s.phase==='pick'&&(s.revealed!==0||s.actions.length!==0||s.picks.me!==null||s.picks.bot!==null))return false;
  if(s.phase==='checkpoint'&&(![30,60].includes(s.revealed)||s.actions.length!==s.revealed/30))return false;
  if(s.phase==='reveal'&&(![0,30,60].includes(s.revealed)||s.actions.length!==s.revealed/30+1||s.deadline!==null))return false;
  if(finished&&(s.actions.length!==3||s.deadline!==null))return false;
  if(s.actions.length&&s.actions[0]!=='ENTRY'||s.actions.slice(1).includes('ENTRY'))return false;
  if(s.signatureAt!==null&&![0,30,60].includes(s.signatureAt))return false;
  if(['pick','checkpoint'].includes(s.phase)&&!Number.isFinite(s.deadline)||s.phase==='reveal'&&!Number.isFinite(s.revealStarted))return false;
  for(const id of ['me','bot']){if(!Number.isSafeInteger(s.scores[id])||!Number.isSafeInteger(s.total[id]))return false;if(s.picks[id]){if(!validPick(s.picks[id]))return false;}else if(s.phase!=='pick')return false;}
  for(let i=0;i<s.history.length;i++){const h=s.history[i];if(!h||h.stage!==i||h.segment!==s.segments[i]||typeof h.won!=='boolean'||!h.scores||!Number.isSafeInteger(h.scores.me)||!Number.isSafeInteger(h.scores.bot)||h.won!==(h.scores.me>=h.scores.bot)||!h.picks||!validPick(h.picks.me)||!validPick(h.picks.bot))return false;
   if(!Array.isArray(h.actions)||h.actions.length!==3||h.actions[0]!=='ENTRY'||h.actions.slice(1).some(a=>!['GO','SWITCH','STOP'].includes(a))||!Array.isArray(h.tactics)||h.tactics.length!==i||h.tactics.some(t=>!Object.hasOwn(TACTICS,t)))return false;
   if(h.signatureAt!==null&&![0,30,60].includes(h.signatureAt)||!Array.isArray(h.steps))return false;
   const expected=h.picks.me.dir==='N'?0:R.exitAt(h.picks.me)/30;if(h.steps.length!==expected)return false;
   if(h.steps.some((step,j)=>!step||step.from!==j*30||step.to!==(j+1)*30||!['L','S'].includes(step.dir)||![1,2,3,5,10].includes(step.lev)||!Number.isSafeInteger(step.delta)||step.action!==h.actions[j]))return false;
   if(h.picks.me.dir==='N'?h.scores.me!==-1000:h.steps.reduce((n,x)=>n+x.delta,0)!==h.scores.me)return false;
  }
  if(['me','bot'].some(id=>s.history.reduce((n,h)=>n+h.scores[id],0)!==s.total[id]))return false;
  return true;
 }catch(_){return false;}
}
function validPick(p){if(!p||!['L','S','N'].includes(p.dir)||![1,2,3,5,10].includes(p.lev)||p.skill)return false;R.choice(player(),p);return true;}
return {VERSION,CHARACTERS,SIGNATURES,OPPONENTS,TACTICS,create,eligible,commit,score,reveal,choose,validate};
});
