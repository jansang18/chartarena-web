/* Progressive character motion: the existing PNG is always the safe fallback. */
(function(){
'use strict';
if(!window.ArenaCharacters || typeof IntersectionObserver==='undefined')return;
var selector='#arenaHero,#lobbyTrader,#lobbyPortrait,#lobbyOpponent,#mePortrait,#botPortrait,.pod .ava img.ch,.result-trader,.collection-trader.on img';
var records=new Map(),failed=new Set(),reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
var catalog=window.ArenaCharacters.list;
function character(src){return catalog.find(function(c){return src.split('?')[0].endsWith(c.image)||src.split('?')[0].endsWith(c.motion);});}
function blocked(){return document.hidden||reduce.matches||!!(window.navigator.connection&&window.navigator.connection.saveData)||window.ArenaMotion.paused;}
function render(img,r){
 var desired=r.visible&&!blocked()&&!failed.has(r.character.id)?r.character.motion:r.character.image;
 if(img.getAttribute('src')!==desired)img.setAttribute('src',desired);
}
function refresh(){
 records.forEach(function(r,img){render(img,r);});
 document.querySelectorAll('[data-motion-toggle]').forEach(function(button){
  var stopped=window.ArenaMotion.paused||reduce.matches;
  button.textContent=stopped?'▶ 모션':'Ⅱ 모션';
  button.setAttribute('aria-pressed',String(stopped));
  button.setAttribute('aria-label',stopped?'캐릭터 움직임 켜기':'캐릭터 움직임 멈추기');
  button.disabled=reduce.matches;
  button.title=reduce.matches?'기기의 모션 줄이기 설정이 켜져 있습니다':'';
 });
}
var observer=new IntersectionObserver(function(entries){entries.forEach(function(e){var r=records.get(e.target);if(r){r.visible=e.isIntersecting;render(e.target,r);}});},{threshold:0});
function sync(){
 var eligible=new Set(document.querySelectorAll(selector));
 records.forEach(function(r,img){if(!img.isConnected||!eligible.has(img)){observer.unobserve(img);records.delete(img);if(img.isConnected)img.setAttribute('src',r.character.image);}});
 eligible.forEach(function(img){
  var c=character(img.getAttribute('src')||'');if(!c||!c.motion)return;
  var r=records.get(img);
  if(r){r.character=c;render(img,r);return;}
  r={character:c,visible:false};records.set(img,r);
  img.addEventListener('error',function(){var current=records.get(img);if(current&&img.getAttribute('src')===current.character.motion){failed.add(current.character.id);render(img,current);}});
  observer.observe(img);
 });
}
var paused=false;
try{paused=window.localStorage.getItem('chartarena-motion-paused')==='1';}catch(ignore){}
window.ArenaMotion={paused:paused,setPaused:function(value){this.paused=!!value;try{window.localStorage.setItem('chartarena-motion-paused',this.paused?'1':'0');}catch(ignore){}refresh();}};
function start(){
 sync();
 document.querySelectorAll('[data-motion-toggle]').forEach(function(button){button.addEventListener('click',function(){window.ArenaMotion.setPaused(!window.ArenaMotion.paused);});});
 refresh();
 new MutationObserver(sync).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src','class']});
 document.addEventListener('visibilitychange',refresh);
 reduce.addEventListener('change',refresh);
 if(window.navigator.connection&&window.navigator.connection.addEventListener)window.navigator.connection.addEventListener('change',refresh);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
