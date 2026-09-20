(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ArenaReactions=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const catalog=[
 {id:'letsgo',emoji:'🔥',label:'가보자고!',tone:'gold'},
 {id:'cool',emoji:'😎',label:'이걸 버텨?',tone:'blue'},
 {id:'panic',emoji:'😭',label:'살려줘…',tone:'blue'},
 {id:'shock',emoji:'😱',label:'이게 무슨 일이야',tone:'coral'},
 {id:'nice',emoji:'✨',label:'나이스!',tone:'gold'},
 {id:'respect',emoji:'🤝',label:'한 수 배웠다',tone:'blue'},
 {id:'heartbeat',emoji:'💓',label:'심장이…!',tone:'coral'},
 {id:'revenge',emoji:'😤',label:'다음 판 복수!',tone:'coral'}
];
const byId=new Map(catalog.map(x=>[x.id,x]));
function createStore(){
 const latest=new Map(),lastAt=new Map(),seen=new Set();
 return {
  accept(m,now){
   if(!m||typeof m.actor!=='string'||!m.actor||!byId.has(m.key)||typeof m.id!=='string'||!Number.isFinite(m.at)||m.at<now-8000||m.at>now+2000||seen.has(m.actor+":"+m.id))return null;
   if(now-(lastAt.get(m.actor)??-Infinity)<3000)return null;
   const item={...m,until:now+2600};lastAt.set(m.actor,now);seen.add(m.actor+":"+m.id);if(seen.size>128)seen.delete(seen.values().next().value);latest.set(m.actor,item);return item;
  },
  active(now){for(const [id,m] of latest)if(m.until<=now)latest.delete(id);return [...latest.values()];},
  remaining(actor,now){return Math.max(0,3000-(now-(lastAt.get(actor)??-Infinity)));},
  clear(){latest.clear();lastAt.clear();seen.clear();}
 };
}
let config,store=createStore(),muted=false,frame=0,serial=0,layer,pop,button,hint,announce;
const bubbles=new Map();
function roster(){return config?config.players():[];}
function actorId(p,i){return String(p.uid||(p.state&&p.state.id)||i);}
function close(focus){if(!pop)return;pop.classList.remove('on');button.setAttribute('aria-expanded','false');if(focus)button.focus({preventScroll:true});}
function clear(){close();if(announce)announce.textContent="";store.clear();bubbles.forEach(el=>el.remove());bubbles.clear();if(frame)cancelAnimationFrame(frame);frame=0;}
function paint(){
 frame=0;if(!config||!config.playing()){clear();return;}
 const list=store.active(Date.now()),ids=new Set(list.map(m=>m.actor)),pods=document.querySelectorAll('#podiums .pod'),people=roster();
 for(const [id,el] of bubbles)if(!ids.has(id)){el.remove();bubbles.delete(id);}
 for(const m of list){const i=people.findIndex((p,j)=>actorId(p,j)===m.actor);if(i<0||!pods[i])continue;const r=pods[i].getBoundingClientRect(),item=byId.get(m.key);let el=bubbles.get(m.actor);
  if(el&&el.dataset.message!==m.id){el.remove();bubbles.delete(m.actor);el=null;}
  if(muted&&i!==0){if(el){el.remove();bubbles.delete(m.actor);}continue;}
  if(!el){el=document.createElement('div');el.className='arena-reaction-bubble tone-'+item.tone+(r.height<90?' compact':'');el.dataset.message=m.id;el.setAttribute('aria-hidden','true');const emoji=document.createElement('span'),label=document.createElement('b');emoji.textContent=item.emoji;label.textContent=item.label;el.append(emoji,label);layer.appendChild(el);bubbles.set(m.actor,el);}
  const width=Math.min(230,Math.max(80,r.width-60));el.style.width=width+'px';el.style.left=Math.max(4,Math.min(innerWidth-width-4,r.right-width-6))+'px';el.style.top=(r.top+Math.max(2,Math.min(14,r.height*.12)))+'px';
 }
 if(list.length)frame=requestAnimationFrame(paint);
}
function show(i,key,message){
 if(!config||!config.playing())return false;const p=roster()[i];if(!p||(muted&&i!==0))return false;
 const now=Date.now(),m=store.accept({...message,actor:actorId(p,i),key,id:message?message.id:'local-'+now+'-'+(++serial),at:message?message.at:now},now);
 if(!m)return false;if(!frame)frame=requestAnimationFrame(paint);
 announce.textContent=(i===0?'나':p.name)+' · '+byId.get(key).label;return m;
}
function receive(messages){
 if(!config||!messages)return;roster().forEach((p,i)=>{if(i===0||p.bot||!p.uid)return;const m=messages[p.uid];if(m)show(i,m.key,m);});
}
function mount(options){
 config=options;button=document.getElementById('emobtn');pop=document.getElementById('emopop');if(!button||!pop)return;
 try{muted=localStorage.getItem('arena_reactions_muted')==='1';}catch(e){}
 layer=document.createElement('div');layer.className='arena-reaction-layer';document.body.appendChild(layer);
 pop.innerHTML='<div class="reaction-heading"><strong>한마디 승부</strong><button type="button" data-close aria-label="리액션 닫기">×</button></div><div class="reaction-grid"></div><div class="reaction-footer"><small id="reactionHint">선택하면 캐릭터 옆에 표시돼요</small><button type="button" id="muteReactions"></button></div>';
 const grid=pop.querySelector('.reaction-grid');catalog.forEach(item=>{const el=document.createElement('button');el.type='button';el.dataset.reaction=item.id;el.setAttribute('aria-label',item.label);el.innerHTML='<span aria-hidden="true">'+item.emoji+'</span><b>'+item.label+'</b>';grid.appendChild(el);});
 hint=pop.querySelector('#reactionHint');const mute=pop.querySelector('#muteReactions');
 function updateMute(){mute.textContent=muted?'상대 리액션 켜기':'상대 리액션 끄기';mute.setAttribute('aria-pressed',String(muted));}
 updateMute();announce=document.createElement('span');announce.className='reaction-sr';announce.setAttribute('role','status');announce.setAttribute('aria-live','polite');document.body.appendChild(announce);
 button.onclick=function(e){e.stopPropagation();const open=!pop.classList.contains('on');pop.classList.toggle('on',open);button.setAttribute('aria-expanded',String(open));if(open){const me=roster()[0],left=me?store.remaining(actorId(me,0),Date.now()):0;hint.textContent=left?'다음 리액션까지 '+Math.ceil(left/1000)+'초':'선택하면 캐릭터 옆에 표시돼요';grid.querySelector('button').focus({preventScroll:true});}};
 pop.onclick=function(e){const target=e.target.closest('button');if(!target)return;if(target.hasAttribute('data-close')){close(true);return;}if(target===mute){muted=!muted;try{localStorage.setItem('arena_reactions_muted',muted?'1':'0');}catch(e){}updateMute();if(!frame)paint();return;}
  const key=target.dataset.reaction;if(!key)return;const m=show(0,key);if(!m){hint.textContent='잠깐! 리액션은 3초에 한 번씩';return;}close(true);if(config.send)config.send({id:m.id,key:m.key,at:m.at});if(config.onLocal)config.onLocal(key);
 };
 document.addEventListener('click',e=>{if(!e.target.closest('#emobar'))close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&pop.classList.contains('on')){e.preventDefault();close(true);}});
}
return {catalog,createStore,mount,show,receive,clear,close};
});
