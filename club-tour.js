(function(){
'use strict';
const T=ClubTourRules,R=ArenaRules,KEY='chartarena_club_tour_v1',$=id=>document.getElementById(id),fmt=n=>(n>0?'+':'')+Math.round(n).toLocaleString('ko-KR');
let state=null,segment=null,character='tr_sera',selection=null,lev=2,busy=false,timer=0,lastCount=-1,lastCue=-1,restartTarget=null;
document.documentElement.dataset.page='tour';ArenaFeedback.mount(document.querySelector('.tour-top'));
function read(){try{const s=JSON.parse(localStorage.getItem(KEY)||'null');return T.validate(s)&&s.segments.every(i=>i<BATTLE_CHARTS.length)?s:null;}catch(_){return null;}}
function notice(text){$('tourNotice').textContent=text;$('tourNotice').hidden=!text;}
function lobby(message){clearTimeout(timer);state=null;segment=null;$('tourGame').hidden=true;$('tourLobby').hidden=false;notice(message||'');const saved=read(),active=saved&&!['won','lost'].includes(saved.phase);$('tourResume').hidden=!saved;$('tourResume').textContent=active?'진행 중인 투어 이어하기':'최근 투어 결과 보기';$('tourResumeNote').hidden=!saved;$('tourStart').disabled=false;if(saved)$('tourResumeNote').textContent=active?ArenaCharacters.get(saved.character).name+' · '+(saved.stage+1)+'번째 테이블 · 자동 저장된 투어가 있습니다.':'최근 투어 · '+(saved.phase==='won'?'3연전 우승':'도전 종료')+' · 총 '+fmt(saved.total.me)+'점';renderCharacter();}
function renderCharacter(){const c=ArenaCharacters.get(character),power=T.SIGNATURES[character];$('tourHero').src=c.image;$('tourHero').alt=c.name;$('tourHeroName').textContent=c.name;$('tourHeroQuote').textContent=c.quote;$('tourWord').textContent=c.en;$('tourStyle').textContent=power.tag;$('tourSkillName').textContent=power.name;$('tourSkillDescription').textContent=power.description;
 $('tourRoster').innerHTML=T.CHARACTERS.map(id=>{const c=ArenaCharacters.get(id);return '<button type="button" data-tour-character="'+id+'" aria-pressed="'+(id===character)+'" aria-label="'+c.name+' 선택"><img src="'+c.image+'" alt=""><b>'+c.name+'</b></button>';}).join('');
 $('tourRoute').innerHTML=T.OPPONENTS.map((o,i)=>'<div><small>TABLE 0'+(i+1)+'</small><b>'+o.name+'</b><p>'+o.description+'</p></div>').join('');
}
async function locked(fn){return navigator.locks?navigator.locks.request('chartarena-tour',fn):fn();}
async function enter(s){const loaded=await ArenaData.load(s.segments[s.stage]),fresh=read();if(!fresh||fresh.id!==s.id||fresh.revision!==s.revision)throw Error('다른 창에서 투어가 진행되었습니다. 최신 투어를 이어 주세요.');state=s;segment=loaded;selection=null;lev=2;$('tourSignature').checked=false;$('tourLobby').hidden=true;$('tourGame').hidden=false;notice('');render();}
async function start(expected=read()){if(busy)return;busy=true;$('tourStart').disabled=true;try{const indices=[];while(indices.length<3){const i=Math.floor(Math.random()*BATTLE_CHARTS.length);if(!indices.includes(i))indices.push(i);}await ArenaData.load(indices[0]);const s=T.create(crypto.randomUUID(),character,indices,Date.now());await locked(()=>{const fresh=read();if((fresh&&fresh.id)!==(expected&&expected.id)||(fresh&&fresh.revision)!==(expected&&expected.revision))throw Error('다른 창에서 투어가 진행되었습니다. 최신 투어를 이어 주세요.');localStorage.setItem(KEY,JSON.stringify(s));});await enter(s);}catch(e){lobby(e.message||'투어를 시작하지 못했습니다.');}finally{busy=false;}}
async function transition(make){if(busy||!state)return;busy=true;clearTimeout(timer);const before=state;try{
 const next=await locked(()=>{const fresh=read();if(!fresh||fresh.id!==before.id||fresh.revision!==before.revision)throw Error('다른 창에서 투어가 진행되었습니다. 최신 투어를 이어 주세요.');const n=make(fresh);if(!T.validate(n))throw Error('투어 상태를 저장하지 못했습니다.');localStorage.setItem(KEY,JSON.stringify(n));return n;});
 if(next.stage!==before.stage)segment=await ArenaData.load(next.segments[next.stage]);state=next;selection=null;lev=state.picks.me?R.baseLeverageAt(state.picks.me,state.revealed):2;$('tourSignature').checked=false;render();
 }catch(e){lobby(e.message||'저장 공간 또는 연결을 확인해 주세요.');}finally{busy=false;}}
function opponentChoice(){const o=T.OPPONENTS[state.stage],visible=segment.cs.slice(0,210+state.revealed);if(state.phase==='pick'){const p=ArenaRivals.entry(o.persona,visible);return {...p,lev:state.stage===2?3:p.lev};}
 const p=state.picks.bot,points=T.score(state,visible,state.revealed),action=ArenaRivals.checkpoint(o.persona,visible,{dir:R.directionAt(p,state.revealed),gainPct:points.bot/(1000*(R.baseLeverageAt(p,state.revealed)||1))});return {action,lev:state.stage===2?3:R.baseLeverageAt(p,state.revealed)};
}
function decide(expired){if(busy||!state||!['pick','checkpoint'].includes(state.phase))return;const timedOut=expired||Date.now()>=state.deadline,entry=state.phase==='pick';const pick=entry?{dir:timedOut?null:selection,lev}:{action:timedOut?'STOP':selection,lev:selection==='SWITCH'?lev:undefined};pick.signature=!timedOut&&$('tourSignature').checked;
 if(!timedOut&&!selection)return;const bot=opponentChoice();transition(s=>T.commit(s,pick,bot,Date.now()));
}
function renderControls(){if(!state)return;const phase=state.phase,entry=phase==='pick',choosing=entry||(phase==='checkpoint'&&['L','S'].includes(state.picks.me.dir)&&R.exitAt(state.picks.me)>state.revealed),power=T.SIGNATURES[state.character];$('tourControls').hidden=['reward','won','lost'].includes(phase);$('tourDirection').hidden=!entry;$('tourDecisions').hidden=phase!=='checkpoint'||!choosing;document.querySelector('.tour-leverage-row').hidden=!choosing;document.querySelector('.tour-signature-control').hidden=!choosing;
 $('tourStatus').textContent=phase==='reveal'?'선택 확정 · 다음 30봉 공개 중':entry?'첫 방향을 정하세요.':state.revealed+'봉, 다음 수를 고르세요.';
 $('tourStageNote').textContent=phase==='reveal'?'마지막 캔들까지 지켜보세요':entry?'미제출 −1,000점':'시간이 지나면 자동 STOP';
 document.querySelectorAll('[data-tour-dir]').forEach(b=>b.setAttribute('aria-pressed',String(selection===b.dataset.tourDir)));
 document.querySelectorAll('[data-tour-action]').forEach(b=>b.setAttribute('aria-pressed',String(selection===b.dataset.tourAction)));
 document.querySelectorAll('[data-tour-lev]').forEach(b=>{b.setAttribute('aria-pressed',String(lev===Number(b.dataset.tourLev)));b.disabled=!entry&&selection!=='SWITCH';});
 $('tourLeverageLabel').textContent=!entry&&selection!=='SWITCH'?'기존 배율':'새 배율';
 const eligible=choosing&&!!selection&&T.eligible(state,entry?'ENTRY':selection);$('tourSignature').disabled=!eligible;if(!eligible)$('tourSignature').checked=false;$('tourSignatureTitle').textContent=power.name+(state.signatureAt!==null?' · 사용됨':' · 1회');$('tourSignatureHint').textContent=state.signatureAt!==null?'다음 테이블에서 다시 사용할 수 있습니다.':power.description+' · '+power.when;
 $('tourConfirm').disabled=!choosing||!selection;$('tourConfirm').textContent=phase==='reveal'?'차트 공개 중…':entry?'선택 확정':selection==='SWITCH'?'SWITCH · '+lev+'배 확정':selection==='STOP'?'STOP · 손익 확정':selection==='GO'?'GO · 다음 30봉':'다음 수 선택';
}
function render(){if(!state)return;clearTimeout(timer);lastCount=-1;lastCue=-1;const me=ArenaCharacters.get(state.character),opponent=T.OPPONENTS[state.stage],bot=ArenaCharacters.get(opponent.character);
 $('tourGameRoute').innerHTML=T.OPPONENTS.map((o,i)=>'<span class="'+(i<state.stage?'done':i===state.stage?'current':'')+'"'+(i===state.stage?' aria-current="step"':'')+'><b>TABLE 0'+(i+1)+'</b>'+o.name+(i<state.stage?' · 통과':i===2?' · FINAL':'')+'</span>').join('');
 $('tourMePortrait').src=me.image;$('tourMePortrait').alt=me.name;$('tourMeName').textContent='나 · '+me.name;$('tourBotPortrait').src=bot.image;$('tourBotPortrait').alt=bot.name;$('tourBotName').textContent='봇 · '+bot.name;$('tourBotStyle').textContent=ArenaRivals.type(opponent.persona).label;
 $('tourBuild').textContent=state.tactics.length?state.tactics.map(id=>T.TACTICS[id].name).join(' + ')+' · 효과는 중첩됩니다.':'아직 선택한 전술이 없습니다. 첫 승리 뒤에 고르세요.';
 $('tourOutcome').hidden=!['reward','won','lost'].includes(state.phase);renderControls();
 if(state.phase==='reveal'){ArenaFeedback.pulse(document.querySelector('.tour-chart-box'),state.actions.at(-1)==='SWITCH'?'switch':'confirm');}
 if(['reward','won','lost'].includes(state.phase)){draw(90);outcome();return;}
 draw(state.revealed);timer=setTimeout(tick,100);
}
function draw(through){if(!state||!segment||through===lastCount)return;lastCount=through;const p=state.picks.me,markers=[];if(p&&['L','S'].includes(p.dir)){markers.push({at:0,action:'진입',lev:p.lev});for(const at of [30,60])if(at<=through&&state.actions[at/30])markers.push({at,action:state.actions[at/30],lev:R.exitAt(p)>at?R.leverageAt(p,at):undefined});}
 $('tourChart').innerHTML=ArenaReview.chart(segment.cs,{vis:210,through,markers,width:$('tourChart').clientWidth});const scores=T.score(state,segment.cs.slice(0,210+through),through);$('tourMeScore').textContent=fmt(scores.me);$('tourBotScore').textContent=fmt(scores.bot);const gap=scores.me-scores.bot;
 $('tourGap').textContent=gap===0?'동점 · 같거나 높으면 통과':gap>0?fmt(gap)+'점 앞서는 중':fmt(Math.abs(gap))+'점 추격 중';$('tourPosition').textContent=!p?'포지션을 선택하세요.':p.dir==='N'?'미제출 −1,000점':R.exitAt(p)<=through?(R.exitAt(p)<90?'STOP · 손익 확정':'90봉 · 정산 완료'):(R.directionAt(p,through)==='L'?'롱':'숏')+' '+R.leverageAt(p,through)+'배 · 1%당 1,000점';$('tourChartLabel').textContent=through?'공개 '+through+' / 90봉':'과거 210봉 분석 · 최근 60봉 표시';
}
function tick(){if(!state||busy)return;const now=Date.now();if(state.phase==='reveal'){
 const frame=ArenaPresentation.revealFrame(Math.max(0,now-state.revealStarted)),count=Math.min(90,state.revealed+frame.count);draw(count);const left=30-frame.count;$('tourClock').textContent=frame.intro?'공개':String(left);
 if(!frame.intro&&left>0&&left<=3&&left!==lastCue){lastCue=left;ArenaFeedback.play('last');}if(frame.done){transition(s=>T.reveal(s,segment.cs,Date.now()));return;}
 }else if(['pick','checkpoint'].includes(state.phase)){const left=Math.max(0,Math.ceil((state.deadline-now)/1000));$('tourClock').textContent=left+'초';if(!left){decide(true);return;}if(state.phase==='checkpoint'&&(!['L','S'].includes(state.picks.me.dir)||R.exitAt(state.picks.me)<=state.revealed)){decide(true);return;}}
 else return;timer=setTimeout(tick,100);
}
function outcome(){const s=state,o=T.OPPONENTS[s.stage],won=s.scores.me>=s.scores.bot,done=s.phase!=='reward';$('tourClock').textContent='완료';
 delete $('tourOutcome').dataset.masteryFrame;delete $('tourOutcome').dataset.masterySpotlight;
 $('tourOutcome').innerHTML='<span class="section-kicker">'+(s.phase==='won'?'CIRCUIT COMPLETE':s.phase==='lost'?'THE NEXT CHALLENGE':'TABLE CLEARED')+'</span><h2>'+(s.phase==='won'?'클럽 투어 우승':s.phase==='lost'?'이번 도전은 여기까지.':s.scores.me===s.scores.bot?'동점으로 다음 테이블에.':o.name+'의 테이블을 넘다.')+'</h2><p>이번 테이블 '+fmt(s.scores.me)+'점 · 상대 '+fmt(s.scores.bot)+'점<br>누적 투어 점수 '+fmt(s.total.me)+'점</p>'+(done?'<p>'+(won?'세 번의 승부를 통과했습니다. 다른 캐릭터와 전술 조합으로 다시 도전해 보세요.':'어느 선택에서 차이가 벌어졌는지 복기로 확인하고, 다음 전략을 준비하세요.')+'</p><p id="tourMasteryResult"></p><div class="tour-outcome-actions"><button type="button" data-tour-review>차트로 복기 ↗</button><button type="button" class="tour-primary" data-tour-new>새 투어 준비</button><a href="index.html">로비</a></div>':'<p>남은 테이블에 가져갈 전술을 하나 고르세요. 공격 전술은 손실도 커집니다.</p><div class="tour-tactic-cards">'+Object.entries(T.TACTICS).map(([id,t])=>'<button type="button" data-tour-tactic="'+id+'"><small>'+t.tag+'</small><b>'+t.name+'</b><p>'+t.description+'</p></button>').join('')+'</div><div class="tour-outcome-actions"><button type="button" data-tour-review>이번 승부 복기 ↗</button></div>');
 ArenaFeedback.play(won?'win':'lose');
 if(done)ArenaMastery.record({id:'tour:'+s.id,character:s.character,won:s.phase==='won',comeback:false,escape:false}).then(p=>{
  if(!state||state.id!==s.id||!$('tourMasteryResult'))return;const c=ArenaCharacters.get(s.character);
  $('tourMasteryResult').textContent=c.name+' 숙련도 Lv.'+p.level+' · '+p.next;
  $('tourOutcome').dataset.masteryFrame=p.unlocked.includes('frame')?'gold':'none';$('tourOutcome').dataset.masterySpotlight=String(s.phase==='won'&&p.unlocked.includes('spotlight'));
  if(s.phase==='won'&&p.unlocked.includes('quote')){const quote=document.createElement('blockquote');quote.className='tour-victory-quote';quote.textContent='“'+c.quote+'”';$('tourMasteryResult').before(quote);}
 }).catch(()=>{if($('tourMasteryResult'))$('tourMasteryResult').textContent='숙련도 저장 공간을 확인해 주세요.';});
}
async function review(){if(!state)return;const run=state;try{const segments=await Promise.all(run.history.map(h=>ArenaData.load(h.segment))),rounds=run.history.map((h,i)=>{const row=ArenaReview.build({initial:R.create('me','standard',100000000,run.character),history:[{round:1,seg:0,picks:h.picks}],segment:()=>segments[i]}).rounds[0];return {...row,round:i+1,delta:h.scores.me,status:h.picks.me.dir==='N'?'미제출':h.won?'테이블 통과':'도전 종료',steps:h.steps,skill:h.signatureAt!==null?T.SIGNATURES[run.character].name:''};});ArenaReview.open({rounds,unit:'PT',delta:run.total.me,footnote:'전술과 전용 전략을 적용한 투어 점수입니다. 보유 골드에는 영향을 주지 않습니다.'});}catch(e){notice('복기 차트를 불러오지 못했습니다. 연결을 확인하고 다시 눌러 주세요.');}}
document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b||b.disabled||busy)return;
 if(b.dataset.tourCharacter){character=b.dataset.tourCharacter;renderCharacter();$('tourRoster').querySelector('[data-tour-character="'+character+'"]').focus({preventScroll:true});}
 if(b.dataset.tourDir){selection=b.dataset.tourDir;renderControls();ArenaFeedback.play('select');}
 if(b.dataset.tourAction){selection=b.dataset.tourAction;lev=R.baseLeverageAt(state.picks.me,state.revealed);renderControls();ArenaFeedback.play('select');}
 if(b.dataset.tourLev){lev=Number(b.dataset.tourLev);renderControls();ArenaFeedback.play('select');}
 if(b.dataset.tourTactic){b.disabled=true;try{await ArenaData.load(state.segments[state.stage+1]);await transition(s=>T.choose(s,b.dataset.tourTactic,Date.now()));}catch(err){b.disabled=false;notice('다음 차트를 불러오지 못했습니다. 다시 선택해 주세요.');}}
 if(b.hasAttribute('data-tour-review'))review();if(b.hasAttribute('data-tour-new')){lobby();$('tourStart').focus();}
});
$('tourConfirm').onclick=()=>decide(false);$('tourStart').onclick=()=>{const s=read();if(s&&!['won','lost'].includes(s.phase)){restartTarget=s;$('tourRestart').showModal();}else start(s);};
$('tourResume').onclick=async()=>{if(busy)return;const s=read();if(!s){lobby('진행 중인 투어가 없습니다.');return;}busy=true;try{await enter(s);}catch(e){lobby(e.message);}finally{busy=false;}};
$('tourKeep').onclick=()=>{$('tourRestart').close();$('tourResume').click();};$('tourReplace').onclick=()=>{$('tourRestart').close();start(restartTarget);};
window.addEventListener('storage',e=>{if(e.key===KEY&&state){const fresh=read();if(!fresh||fresh.id!==state.id||fresh.revision!==state.revision)lobby('다른 창에서 투어가 진행되었습니다. 이어하기로 최신 상태를 여세요.');}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state){clearTimeout(timer);tick();}});
window.addEventListener('resize',()=>{if(state&&segment){const count=lastCount;lastCount=-1;draw(Math.max(0,count));}});
lobby();
})();
