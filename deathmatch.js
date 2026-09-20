/* Bot-only deathmatch. Human transfers require an authoritative server wallet. */
(function(){
'use strict';
const R=DeathmatchRules,KEY='chartarena_web_v1',owner=crypto.randomUUID(),$=id=>document.getElementById(id),fmt=n=>Math.round(n).toLocaleString('ko-KR'),sign=n=>(n>0?'+':'')+fmt(n);
let state=null,segment=null,busy=false,timer=0,animation=0,closed=false,shown=210,serial=0;
const read=()=>JSON.parse(localStorage.getItem(KEY)||'{}');
const write=g=>localStorage.setItem(KEY,JSON.stringify(g));
function error(e){$('error').textContent=e.message||String(e);$('error').hidden=false;setTimeout(()=>$('error').hidden=true,7000);}
function walletLock(fn){return ArenaWallet.run(fn,{ifAvailable:true});}
function profile(){try{return JSON.parse(localStorage.getItem('chartarena_hub_v1')||'{}');}catch(e){return {};}}
const p=profile(),me=ArenaCharacters.get((p.equip||{}).ch),nick=String(p.nick||me.name).slice(0,20);
let bot=ArenaCharacters.list.find(c=>c.id!==me.id);
document.documentElement.dataset.page='battle';
$('lobbyPortrait').src=me.image;$('lobbyPortrait').alt=me.name;
function stopTimers(){clearTimeout(timer);clearInterval(animation);timer=animation=0;}
function lobby(){
 stopTimers();state=null;closed=false;document.documentElement.removeAttribute('data-playing');$('game').hidden=true;$('lobby').hidden=false;$('exitButton').hidden=true;$('emobar').hidden=true;ArenaReactions.clear();
 const g=read(),active=g.deathmatchActive;$('roundLabel').textContent='5 ROUNDS';$('walletGold').textContent=fmt(R.balance(g))+' G';$('startButton').disabled=!!g.battleActive||(!active&&R.balance(g)<=0)||(!active&&!NRG.has());
 $('startButton').textContent=active?'진행 중인 데스매치 이어하기 →':R.balance(g)<=0?'골드가 필요합니다':!NRG.has()?'플레이 횟수가 부족합니다':'봇과 데스매치 시작 →';
 $('resumeLink').hidden=!g.battleActive;
 $('lobbyNotice').textContent=active?'경기에 보관 중인 내 골드 '+fmt(active.balances[0])+'G · 이어하기는 횟수를 사용하지 않습니다.':g.battleActive?'진행 중인 4인 배틀을 먼저 마쳐 주세요.':'5라운드 · 시작 시 플레이 1회 사용 · 현금 환전 불가';
 const last=g.deathmatchLast;$('lastReceipt').hidden=!last;if(last)$('lastReceipt').textContent='최근 봇 대전 · '+last.rounds+'라운드 · '+sign(last.delta)+'G 정산';
}
function nextIndex(exclude){
 let recent=[];try{recent=JSON.parse(localStorage.getItem('arena_recent_300_v1')||'[]');}catch(e){}
 if(!Array.isArray(recent))recent=[];
 const allowed=BATTLE_CHARTS.map((s,i)=>i).filter(i=>i!==exclude&&!recent.includes(BATTLE_CHARTS[i].id));
 const pool=allowed.length?allowed:BATTLE_CHARTS.map((s,i)=>i).filter(i=>i!==exclude);return pool[Math.floor(Math.random()*pool.length)];
}
function remember(index){try{let a=JSON.parse(localStorage.getItem('arena_recent_300_v1')||'[]');if(!Array.isArray(a))a=[];const id=BATTLE_CHARTS[index].id;localStorage.setItem('arena_recent_300_v1',JSON.stringify([...a.filter(v=>v!==id),id].slice(-500)));}catch(e){}}
function scheduleState(s){
 const n={...s,owner,deadline:null,botAction:null};
 if(['decision','respond'].includes(n.phase)){
  n.deadline=Date.now()+(n.turn===0?20000:1800);
  if(n.turn===1){
   const losing=n.mark*(n.picks[1]==='L'?1:-1)<0,roll=Math.random();
   if(n.phase==='respond')n.botAction={type:roll<(losing?.3:.1)?'FOLD':'CALL',actor:1};
   else if(losing&&roll<.15)n.botAction={type:'FOLD',actor:1};
   else {const higher=R.MULTIPLES.filter(m=>m>n.agreed);n.botAction=higher.length&&roll>.6?{type:'RAISE',actor:1,multiple:higher[Math.floor(Math.random()*higher.length)]}:{type:'GO',actor:1};}
  }
 }
 return n;
}
async function start(){
 if(busy)return;busy=true;$('startButton').disabled=true;
 try{
  const before=read(),index=before.deathmatchActive?before.deathmatchActive.segment:nextIndex();const loaded=await ArenaData.load(index);
  await walletLock(()=>{
   let g=read();if(g.battleActive)throw Error('진행 중인 4인 배틀을 먼저 마쳐 주세요.');const isNew=!g.deathmatchActive;
   if(g.deathmatchActive){if(g.deathmatchActive.segment!==index)throw Error('다른 창에서 경기가 진행되었습니다. 다시 이어하기를 눌러 주세요.');state={...g.deathmatchActive,owner};}
   else {
    if(before.deathmatchActive)throw Error('다른 창에서 이미 경기를 정산했습니다.');
    if(!NRG.has())throw Error('플레이 횟수가 부족합니다.');g=R.open(g,crypto.randomUUID(),index);
    state={...g.deathmatchActive,owner,botId:bot.id};
   }
   write(R.save(g,state));if(isNew)NRG.use();
  });
  if(state.phase==='closed'){lobby();return;}
  segment=loaded;bot=ArenaCharacters.get(state.botId);remember(index);closed=R.finished(state);$('lobby').hidden=true;$('game').hidden=false;$('exitButton').hidden=false;$('emobar').hidden=false;document.documentElement.dataset.playing='deathmatch';render();
 }catch(e){error(e);lobby();}finally{busy=false;}
}
async function action(type,extra={}){
 if(busy||closed||!state)return;busy=true;stopTimers();
 try{
  let loaded=null;if(type==='NEXT'){extra.segment=nextIndex(state.segment);loaded=await ArenaData.load(extra.segment);}
  await walletLock(()=>{
   const g=read(),fresh=g.deathmatchActive;
   if(!fresh||fresh.id!==state.id||fresh.owner!==owner||fresh.revision!==state.revision)throw Error('다른 창에서 경기를 진행했습니다. 이어하기로 다시 열어 주세요.');
   let next=R.step(fresh,{id:owner+':'+(++serial),type,...extra});
   next=scheduleState(next);write(R.save(g,next));state=next;closed=R.finished(next);
  });
  if(loaded){segment=loaded;remember(state.segment);}
  if(type==='EXIT'){lobby();return;}
  render();
 }catch(e){error(e);lobby();}finally{busy=false;}
}
function button(label,type,extra='',cls=''){return '<button class="'+cls+'" data-action="'+type+'" '+extra+'>'+label+'</button>';}
function render(){
 stopTimers();ArenaReactions.close();const s=state;if(!s)return;
 $('roundLabel').textContent='ROUND '+s.round+' / 5';$('mePortrait').src=me.image;$('botPortrait').src=bot.image;$('mePortrait').alt=me.name;$('botPortrait').alt=bot.name;
 $('meName').textContent='나 · '+nick;$('botName').textContent='봇 · '+bot.name;$('meGold').textContent=fmt(s.balances[0])+' G';$('botGold').textContent=fmt(s.balances[1])+' G';
 $('mePick').textContent=s.picks?(s.picks[0]==='L'?'롱 · 상승':'숏 · 하락'):'방향 선택 전';
 $('botPick').textContent=s.picks&&!(s.stage===1&&s.phase==='reveal')?(s.picks[1]==='L'?'롱 · 상승':'숏 · 하락'):'선택 비공개';
 $('multiplier').textContent='×'+s.agreed;$('chartTitle').textContent='실제 과거 차트 · '+segment.tf;
 $('stakeText').textContent='현재 포기 금액 '+fmt(R.stake(s))+'G';$('riskText').textContent='1%당 '+fmt(R.RATE*s.agreed)+'G · 정산 상한 '+fmt(Math.min(...s.balances))+'G';
 $('countdown').textContent='';let controls='';
 if(s.phase==='pick'){
  $('statusText').textContent='210봉을 읽고 방향을 선택하세요';shown=210;
  controls=button('↗ 롱 <small>상승에 승부</small>','LOCK','data-dir="L"','long')+button('↘ 숏 <small>하락에 승부</small>','LOCK','data-dir="S"','short');
 }else if(s.phase==='reveal'){
  $('statusText').textContent='다음 30봉 공개 중 · 합의 '+s.agreed+'배';controls='<button disabled>선택 확정 · 차트 공개 중</button>';
  const start=Date.now(),base=210+(s.stage-1)*30;shown=base;
  animation=setInterval(()=>{const elapsed=Date.now()-start,offset=Math.min(30,elapsed<6000?Math.floor(elapsed/250):24+Math.floor((elapsed-6000)/600));shown=base+offset;draw();if(offset>=30){clearInterval(animation);action('REVEALED',{move:moveAt(shown)});}},70);
 }else if(['decision','respond'].includes(s.phase)){
  shown=210+s.stage*30;
  if(s.turn===1){$('statusText').textContent=s.phase==='respond'?'봇이 '+s.offer.multiple+'배 제안을 검토 중':'봇이 GO / STOP을 고민 중';controls='<button disabled>상대의 선택을 기다립니다…</button>';}
  else if(s.phase==='respond'){
   $('statusText').textContent='봇이 '+s.offer.multiple+'배로 레이즈했습니다';
   controls=button('콜 · '+s.offer.multiple+'배 <small>1%당 '+fmt(R.RATE*s.offer.multiple)+'G</small>','CALL','','dm-primary')+button('포기 <small>−'+fmt(R.stake(s))+'G</small>','FOLD','','dm-danger');
  }else{
   $('statusText').textContent=s.stage*30+'봉 공개 · 계속할까요?';
   controls=button('GO · '+s.agreed+'배 유지','GO','','dm-primary')+R.MULTIPLES.filter(m=>m>s.agreed).map(m=>button(m+'배 <small>레이즈</small>','RAISE','data-multiple="'+m+'"')).join('')+button('STOP <small>−'+fmt(R.stake(s))+'G</small>','FOLD','','dm-danger');
  }
  const tick=()=>{if(!state||state.revision!==s.revision)return;const left=Math.max(0,Math.ceil((s.deadline-Date.now())/1000));$('countdown').textContent=s.turn===0?left+'초 뒤 자동 포기':'BOT';if(left<=0){if(s.turn===1&&s.botAction)action(s.botAction.type,s.botAction);else action('FOLD',{actor:0});}else timer=setTimeout(tick,200);};timer=setTimeout(tick,20);
 }else if(s.phase==='result'){
  shown=210+s.stage*30;const r=s.result,delta=r.winner===null?0:(r.winner===0?r.amount:-r.amount);
  $('statusText').textContent=(r.reason==='chart'?(r.winner===null?'무승부':delta>0?'차트 승부 승리':'차트 승부 패배'):r.winner===0?'상대 포기 · 승리':'STOP · 포기 정산')+'  '+sign(delta)+'G';
  $('stakeText').textContent=r.reason==='chart'?'진입 대비 '+r.move.toFixed(4)+'% × 20,000G × '+r.multiple+'배':'합의 판돈 '+fmt(R.RATE*r.multiple)+'G'+(r.capped?' · 보유 골드 상한 적용':'');
  $('riskText').textContent=R.finished(s)?'경기 총 손익 '+sign(s.balances[0]-s.initial)+'G · 지갑 반영 완료':'누적 손익 '+sign(s.balances[0]-s.initial)+'G';
  controls=R.finished(s)?button('경기 완료 · 로비로','LOBBY','','dm-primary'):button('다음 라운드 →','NEXT','','dm-primary');
 }
 $('actions').innerHTML=controls;$('exitButton').textContent=closed?'로비':'종료';draw();
}
function moveAt(count){return(segment.cs[count-1][3]/segment.cs[209][3]-1)*100;}
function draw(){
 if(!segment||!state)return;const canvas=$('chart'),rect=canvas.getBoundingClientRect();if(rect.width<1||rect.height<1)return;
 const dpr=Math.min(devicePixelRatio||1,2),w=rect.width,h=rect.height;if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
 const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const count=Math.min(300,shown),cs=segment.cs.slice(0,count),low=Math.min(...cs.map(c=>c[2])),high=Math.max(...cs.map(c=>c[1])),pad=Math.max((high-low)*.1,.001),min=low-pad,max=high+pad;
 const width=w-49,dx=width/300,x=i=>4+(i+.5)*dx,y=v=>7+(max-v)/(max-min)*(h-14);
 ctx.fillStyle='#26313d55';ctx.fillRect(x(210),0,width-x(210),h);ctx.font='10px system-ui';ctx.textAlign='left';
 for(let i=0;i<4;i++){const yy=8+(h-16)*i/3;ctx.strokeStyle='#26394a';ctx.beginPath();ctx.moveTo(0,yy);ctx.lineTo(width,yy);ctx.stroke();ctx.fillStyle='#8297a7';ctx.fillText((max-(max-min)*i/3).toFixed(2),width+5,yy+4);}
 ctx.setLineDash([3,4]);ctx.strokeStyle='#c9b17677';ctx.beginPath();ctx.moveTo(0,y(cs[209][3]));ctx.lineTo(width,y(cs[209][3]));ctx.stroke();ctx.beginPath();ctx.moveTo(x(210),0);ctx.lineTo(x(210),h);ctx.stroke();ctx.setLineDash([]);
 [5,20,60].forEach((period,k)=>{ctx.strokeStyle=['#d9bb70','#b892d0','#72b8c6'][k];ctx.lineWidth=1;ctx.beginPath();let sum=0;cs.forEach((c,i)=>{sum+=c[3];if(i>=period)sum-=cs[i-period][3];if(i>=period-1){const yy=y(sum/period);if(i===period-1)ctx.moveTo(x(i),yy);else ctx.lineTo(x(i),yy);}});ctx.stroke();});
 cs.forEach((c,i)=>{ctx.strokeStyle=ctx.fillStyle=c[3]>=c[0]?'#ed7f7f':'#6499e5';ctx.beginPath();ctx.moveTo(x(i),y(c[1]));ctx.lineTo(x(i),y(c[2]));ctx.stroke();ctx.fillRect(x(i)-Math.max(1,dx*.62)/2,Math.min(y(c[0]),y(c[3])),Math.max(1,dx*.62),Math.max(1,Math.abs(y(c[0])-y(c[3]))));});
 $('revealLabel').textContent=count===210?'210봉 분석':(count-210)+' / 90봉 공개';$('chartMove').textContent='진입 대비 '+(count>210?(moveAt(count)>=0?'+':'')+moveAt(count).toFixed(4)+'%':'—');
}
$('startButton').onclick=start;
$('actions').onclick=e=>{const b=e.target.closest('[data-action]');if(!b||busy)return;const type=b.dataset.action;if(type==='LOBBY'){lobby();return;}const extra={actor:0};if(type==='RAISE')extra.multiple=Number(b.dataset.multiple);if(type==='LOCK'){
 // Bot selection depends only on the visible 210-candle history.
 const trend=segment.cs[209][3]>=segment.cs[189][3]?'L':'S',botPick=Math.random()<.65?trend:trend==='L'?'S':'L';extra.picks=[b.dataset.dir,botPick];
 }action(type,extra);};
function askExit(){if(!state||closed){lobby();return;}$('exitCost').textContent=state.picks&&!['result','pick'].includes(state.phase)?'현재 합의 판돈 '+fmt(R.stake(state))+'G를 상대에게 지급하고 종료합니다. 아직 콜하지 않은 레이즈는 포함하지 않습니다.':'현재까지 정산된 골드를 돌려받고 종료합니다. 추가 차감은 없습니다.';$('exitDialog').showModal();}
$('exitButton').onclick=askExit;$('homeLink').onclick=e=>{if(state&&!closed){e.preventDefault();askExit();}};$('cancelExit').onclick=()=>$('exitDialog').close();$('confirmExit').onclick=()=>{$('exitDialog').close();action('EXIT');};
window.addEventListener('resize',draw);new ResizeObserver(draw).observe($('chart'));
window.addEventListener('storage',e=>{if(e.key!==KEY)return;try{const fresh=read().deathmatchActive;if(state&&!closed&&(!fresh||fresh.owner!==owner)){error('다른 창에서 경기를 이어하고 있습니다.');lobby();}else if(!state)lobby();}catch(e){error(e);}});
window.addEventListener('pagehide',stopTimers);window.addEventListener('pageshow',e=>{if(e.persisted)lobby();});
ArenaReactions.mount({players:()=>[{uid:'me',name:nick},{uid:'bot',name:bot.name,bot:true}],playing:()=>!!state&&!$('game').hidden,onLocal:()=>{const id=state&&state.id;setTimeout(()=>{if(state&&state.id===id)ArenaReactions.show(1,['cool','heartbeat','respect'][Math.floor(Math.random()*3)]);},850);}});
try{lobby();}catch(e){error(e);$('startButton').disabled=true;}
})();
