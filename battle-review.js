/* Post-match receipts. Reads completed history; never writes the wallet. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./battle-rules.js'):root.ArenaRules);if(typeof module==='object'&&module.exports)module.exports=api;else root.ArenaReview=api;})(typeof globalThis!=='undefined'?globalThis:this,function(R){
'use strict';
const sign=n=>(n>0?'+':'')+Math.round(n).toLocaleString('ko-KR');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function build({initial,history,segment}){
 let state={...initial};const rounds=[];
 for(const row of history.slice().sort((a,b)=>a.round-b.round)){
  const seg=segment(row.seg),pick=R.choice(state,(row.picks||{})[state.id]),move=at=>at?(seg.cs[seg.vis+at-1][3]/seg.cs[seg.vis-1][3]-1)*100:0;
  const settled=R.settle(state,pick,move,row.round),steps=[],markers=[];let previous=0;
  if(['L','S'].includes(pick.dir)){
   const end=R.exitAt(pick);markers.push({at:0,action:'진입',dir:pick.dir,lev:pick.lev});
   for(let from=0;from<end;from+=30){const to=Math.min(from+30,end),total=R.profit(state,pick,move,to).delta,dir=R.directionAt(pick,from),lev=R.leverageAt(pick,from);
    steps.push({from,to,dir,lev,delta:total-previous,action:from===0?'진입':(pick.switches||[]).includes(from)?'SWITCH':'GO'});previous=total;
    if(to<end)markers.push({at:to,action:(pick.switches||[]).includes(to)?'SWITCH':'GO',dir:R.directionAt(pick,to),lev:R.leverageAt(pick,to)});
   }
   markers.push({at:end,action:end<90?'STOP':'종료'});
  }
  const start=Math.max(0,seg.vis-60);
  rounds.push({round:row.round,delta:settled.delta,status:pick.dir==='W'?'패스':pick.dir==='N'?'미제출':'정산 완료',steps,markers,vis:seg.vis-start,candles:seg.cs.slice(start,seg.vis+90).map(c=>c.slice()),skill:pick.skill?R.skillFor(state.character).name:''});
  state=settled;
 }
 return {rounds,delta:state.score-initial.score};
}
function chart(candles,{vis,through=90,markers=[],width=900}){
 const start=Math.max(0,vis-60),cs=candles.slice(start,vis+through),entry=vis-start,total=entry+90;
 if(!cs.length)return '';
 const w=Math.max(260,Math.min(900,Number(width)||900)),h=w<540?230:300,pad=w<540?20:32,lo=Math.min(...cs.map(c=>c[2])),hi=Math.max(...cs.map(c=>c[1])),range=Math.max(hi-lo,.001),x=i=>pad+(w-pad*2)*(i+.5)/total,y=p=>42+(hi-p)/range*(h-94),dx=(w-pad*2)/total;
 let svg='<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="캔들 차트 · '+through+'봉 공개 · 빨강 상승, 파랑 하락"><rect width="'+w+'" height="'+h+'" fill="#111113"/>';
 for(let i=0;i<4;i++){const yy=42+i*(h-94)/3;svg+='<path d="M12 '+yy+'H'+(w-12)+'" stroke="#ffffff0d"/><text x="16" y="'+(yy-5)+'" fill="#a79e8c" font-size="10">'+(hi-range*i/3).toFixed(2)+'</text>';}
 svg+='<rect x="'+x(entry-1)+'" y="24" width="'+(w-pad-x(entry-1))+'" height="'+(h-54)+'" fill="#eac68406"/>';
 cs.forEach((c,i)=>{const color=c[3]>=c[0]?'#ef8790':'#80aef1';svg+='<path d="M'+x(i)+' '+y(c[1])+'V'+y(c[2])+'" stroke="'+color+'"/><rect x="'+(x(i)-dx*.31)+'" y="'+Math.min(y(c[0]),y(c[3]))+'" width="'+Math.max(.8,dx*.62)+'" height="'+Math.max(1,Math.abs(y(c[0])-y(c[3])))+'" fill="'+color+'"/>';});
 markers.filter(m=>m.at<=through).forEach((m,i)=>{const xx=x(entry+m.at-1),label=m.action+(m.lev?' '+m.lev+'×':'');svg+='<path d="M'+xx+' 24V'+(h-28)+'" stroke="#edca88" stroke-dasharray="3 5" opacity=".7"/><circle cx="'+xx+'" cy="'+y(cs[Math.max(0,entry+m.at-1)][3])+'" r="4" fill="#ffe1a0"/><text x="'+Math.max(46,Math.min(w-46,xx))+'" y="'+(i%2?h-10:19)+'" fill="#ffe1a0" text-anchor="middle" font-size="12" font-weight="700">'+esc(label)+'</text>';});
 return svg+'</svg>';
}
let dialog=null,returnFocus=null,currentRow=null;
function fitChart(){if(!dialog||!dialog.open||!currentRow)return;const el=dialog.querySelector('.review-chart');if(el)el.innerHTML=chart(currentRow.candles,{vis:currentRow.vis,markers:currentRow.markers,width:el.clientWidth});}
function open(report){
 if(!report||!report.rounds.length)return;
 const unit=report.unit==='PT'?'PT':'G';
 if(!dialog){dialog=document.createElement('dialog');dialog.className='review-dialog';dialog.setAttribute('aria-labelledby','reviewTitle');document.body.appendChild(dialog);dialog.addEventListener('close',()=>{if(returnFocus&&returnFocus.isConnected)returnFocus.focus();});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});}
 returnFocus=document.activeElement;
 dialog.innerHTML='<header class="review-head"><div><span class="section-kicker">THE DECISIVE MOMENT</span><h2 id="reviewTitle">나의 선택을 다시 읽다</h2><p>진입부터 확정까지, 배율과 손익을 한눈에.</p></div><button type="button" class="review-close" aria-label="복기 닫기">닫기 ×</button></header><nav class="review-rounds" aria-label="복기 라운드">'+report.rounds.map((r,i)=>'<button type="button" data-round="'+i+'">'+r.round+'R <span>'+sign(r.delta)+'</span></button>').join('')+'</nav><section class="review-body"></section>';
 dialog.querySelector('.review-close').onclick=()=>dialog.close();
 function select(i){const row=report.rounds[i];currentRow=row;dialog.querySelectorAll('[data-round]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.round)===i)));
  dialog.querySelector('.review-body').innerHTML='<div class="review-total"><span>'+row.round+'라운드 · '+esc(row.status)+(row.skill?' · '+esc(row.skill):'')+'</span><strong>'+sign(row.delta)+' <small>'+unit+'</small></strong></div><div class="review-chart">'+chart(row.candles,{vis:row.vis,markers:row.markers})+'</div>'+(row.steps.length?'<div class="review-ledger"><table><caption class="sr-only">선택 구간별 손익</caption><thead><tr><th>선택 / 구간</th><th>포지션</th><th>손익</th></tr></thead><tbody>'+row.steps.map(s=>'<tr><td><b>'+s.action+'</b><small>'+s.from+'–'+s.to+'봉</small></td><td><span class="review-'+s.dir+'">'+(s.dir==='L'?'롱':'숏')+'</span> '+s.lev+'배</td><td>'+sign(s.delta)+' '+unit+'</td></tr>').join('')+'</tbody></table></div>':'<p class="review-empty">'+(row.status==='패스'?'패스를 사용해 손익 없이 쉬어간 라운드입니다.':unit==='PT'?'진입 시간 초과로 1,000점이 감점되었습니다.':'진입 시간 초과로 방 단가만큼 감점되었습니다.')+'</p>')+'<p class="review-footnote">'+esc(report.footnote||'각 구간 손익의 합계는 최종 정산과 같습니다. STOP 이후 캔들은 비교용으로만 표시됩니다.')+'</p>';
 }
 dialog.querySelectorAll('[data-round]').forEach(b=>b.onclick=()=>{select(Number(b.dataset.round));fitChart();});select(0);dialog.showModal();fitChart();dialog.querySelector('.review-close').focus();
}
if(typeof window!=='undefined')window.addEventListener('resize',fitChart);
return {build,chart,open};
});
