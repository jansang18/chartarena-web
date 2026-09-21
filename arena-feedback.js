/* Short, gesture-unlocked audio cues. No loops, portrait motion, or scoring effects. */
(function(){
'use strict';
const KEY='chartarena_sound_v1';let enabled=true,ctx=null,last=0;
try{enabled=localStorage.getItem(KEY)!=='off';}catch(_){}
function sync(){document.querySelectorAll('[data-arena-sound]').forEach(b=>{b.textContent=enabled?'소리 켜짐':'소리 꺼짐';b.setAttribute('aria-pressed',String(enabled));b.setAttribute('aria-label','게임 효과음 '+(enabled?'끄기':'켜기'));});}
function unlock(){if(!enabled)return;try{if(!ctx){const C=window.AudioContext||window.webkitAudioContext;if(C)ctx=new C();}if(ctx&&ctx.state==='suspended')ctx.resume().catch(()=>{});}catch(_){}}
function play(kind){
 if(!enabled||document.hidden)return;unlock();if(!ctx||ctx.state!=='running')return;
 const now=ctx.currentTime;if(now-last<.05)return;last=now;
 const notes={select:[[560,0,.055]],confirm:[[740,0,.07],[990,.055,.08]],switch:[[330,0,.09],[660,.065,.12]],last:[[190,0,.10]],win:[[523,0,.16],[659,.10,.18],[784,.20,.28]],lose:[[294,0,.15],[220,.11,.20]]}[kind]||[[440,0,.05]];
 notes.forEach(([frequency,delay,duration])=>{const oscillator=ctx.createOscillator(),gain=ctx.createGain(),at=now+delay;oscillator.type=kind==='confirm'?'triangle':'sine';oscillator.frequency.setValueAtTime(frequency,at);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(kind==='last'?.035:.055,at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);oscillator.connect(gain);gain.connect(ctx.destination);oscillator.start(at);oscillator.stop(at+duration+.02);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};});
}
function pulse(element,kind){if(!element)return;play(kind||'confirm');if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const mark=document.createElement('span');mark.className='choice-feedback '+(kind==='switch'?'is-switch':'');mark.setAttribute('aria-hidden','true');mark.innerHTML=kind==='switch'?'<b>SWITCH</b>':'<img src="assets/fx-gold-token-v2.png" alt="">';element.appendChild(mark);setTimeout(()=>mark.remove(),650);}
function mount(parent){if(!parent||parent.querySelector('[data-arena-sound]'))return;const b=document.createElement('button');b.type='button';b.className='sound-toggle';b.dataset.arenaSound='';b.onclick=()=>{enabled=!enabled;try{localStorage.setItem(KEY,enabled?'on':'off');}catch(_){}if(!enabled&&ctx)ctx.suspend().catch(()=>{});sync();if(enabled)play('select');};parent.appendChild(b);sync();}
document.addEventListener('pointerdown',unlock,{passive:true});document.addEventListener('keydown',unlock,{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&ctx)ctx.suspend().catch(()=>{});});
window.addEventListener('storage',e=>{if(e.key===KEY){enabled=e.newValue!=='off';if(!enabled&&ctx)ctx.suspend().catch(()=>{});sync();}});
document.addEventListener('click',e=>{const b=e.target.closest('button,a');if(!b||b.disabled||b.matches('[data-arena-sound]'))return;if(b.matches('.dir,.lev,[data-trader],.trader-choice,[data-tour-character],.review-rounds button'))play('select');});
window.ArenaFeedback={play,pulse,mount};
})();
