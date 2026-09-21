/* Presentation glue for completed battles. No access to wallet mutation APIs. */
(function(){
'use strict';
const ranks=new Map(),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function observeRank(id,rank,count){if(!id)return;const old=ranks.get(id)||{worst:1,count};old.worst=Math.max(old.worst,rank);ranks.set(id,old);if(ranks.size>12)ranks.delete(ranks.keys().next().value);}
function finish(options){
 const {id,character,place,initial,history,segment,delta,balance,practice}=options,root=document.getElementById('verdict'),caption=root.querySelector('.result-caption'),trader=ArenaCharacters.get(character);
 const note=caption.querySelector('.decisive-moment')?.textContent||'',cost=caption.querySelector('.rematch-cost')?.textContent||'',winner=caption.querySelector('.pl')?.textContent||'';
 const fmt=n=>(n>0?'+':'')+n.toLocaleString('ko-KR');
 root.dataset.place=String(place);root.classList.add('royal-result');
 // The chart clips its contents; results belong in the browser's modal layer.
 const originalParent=root.parentNode,host=document.createElement('dialog');host.className='royal-result-host';host.setAttribute('aria-label','경기 최종 결과');document.body.appendChild(host);host.appendChild(root);host.showModal();
 caption.innerHTML='<span class="section-kicker">MATCH COMPLETE · 5 ROUNDS</span><div class="result-rank"><span>'+String(place).padStart(2,'0')+'</span><div><small>FINAL RANK</small><h2 class="mv">'+(place===1?'우승':place+'위')+'</h2></div></div><p class="result-winner">'+esc(winner)+'</p><div class="result-gold"><span>'+(practice?'모의 손익':'골드 정산')+'</span><strong>'+fmt(delta)+' <small>G</small></strong><p>보유 '+balance.toLocaleString('ko-KR')+' G</p></div><p class="decisive-moment">'+esc(note)+'</p><p class="result-mastery" aria-live="polite"></p><p class="result-quote"></p><div class="result-actions"><button type="button" class="result-review">차트로 복기 ↗</button><button type="button" class="result-rematch">리벤지 · 같은 상대</button><a href="index.html">로비</a></div><small class="rematch-cost">'+esc(cost)+'</small>';
 const report=ArenaReview.build({initial,history,segment});caption.querySelector('.result-review').onclick=()=>ArenaReview.open(report);
 const alert=document.createElement('p');alert.className='result-alert';alert.setAttribute('role','alert');caption.querySelector('.result-actions').before(alert);
 const go=document.getElementById('go'),rematch=caption.querySelector('.result-rematch'),sync=()=>{rematch.disabled=go.disabled;rematch.textContent=go.textContent;};sync();
 let energyFailure=false;const message=document.getElementById('msg'),noEnergy=document.getElementById('bNoNrg');
 const feedback=()=>{if(noEnergy?.classList.contains('on')){energyFailure=true;alert.textContent='게임 횟수를 다 썼어요. '+document.getElementById('bNrgMsg').textContent;noEnergy.classList.remove('on');}else if(!energyFailure&&message?.classList.contains('show'))alert.textContent=message.textContent;};
 rematch.onclick=()=>{energyFailure=false;alert.textContent='';go.click();feedback();};
 const messages=new MutationObserver(feedback);if(message)messages.observe(message,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
 const observer=new MutationObserver(sync);observer.observe(go,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['disabled']});
 const release=()=>{observer.disconnect();messages.disconnect();life.disconnect();if(host.open)host.close();originalParent.appendChild(root);root.classList.remove('royal-result');host.remove();};
 const life=new MutationObserver(()=>{if(!root.classList.contains('show')||!root.classList.contains('final-result'))release();});life.observe(root,{attributes:true,attributeFilter:['class']});host.addEventListener('cancel',()=>root.classList.remove('show'));
 ArenaFeedback.play(place===1?'win':'lose');
 if(!practice&&history.length===5){const r=ranks.get(id)||{worst:1,count:4};ArenaMastery.record({id,character,won:place===1,comeback:place===1&&r.worst>1,escape:r.worst===r.count&&place<r.count}).then(p=>{
  if(!caption.isConnected)return;caption.querySelector('.result-mastery').textContent=trader.name+' 숙련도 Lv.'+p.level+' · '+p.wins+'승 · '+p.next;
  root.dataset.masteryFrame=p.unlocked.includes('frame')?'gold':'none';root.dataset.masterySpotlight=String(p.unlocked.includes('spotlight'));
  caption.querySelector('.result-quote').textContent=p.unlocked.includes('quote')?'“'+trader.quote+'”':'';
 }).catch(()=>{if(caption.isConnected)caption.querySelector('.result-mastery').textContent='숙련도를 저장하지 못했습니다. 기기 저장 공간을 확인해 주세요.';});}
 rematch.focus({preventScroll:true});
}
window.ArenaExperience={observeRank,finish};
document.addEventListener('DOMContentLoaded',()=>{ArenaFeedback.mount(document.querySelector('.top')||document.querySelector('.dm-top')||document.querySelector('.terminal-nav')||document.querySelector('.topbar'));});
})();
