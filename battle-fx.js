/* Presentation-only effects. Never reads or writes a wallet. */
(function(root){
'use strict';
let layer=null;const animations=new Set();
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function getLayer(){if(!layer){layer=document.createElement('div');layer.className='arena-fx-layer';layer.setAttribute('aria-hidden','true');document.body.append(layer);}return layer;}
function point(el,dx=.5,dy=.5){const r=el.getBoundingClientRect();return {x:r.left+r.width*dx,y:r.top+r.height*dy};}
function node(cls,x,y,text){const n=document.createElement('div');n.className=cls;n.style.left=x+'px';n.style.top=y+'px';if(text)n.textContent=text;getLayer().append(n);return n;}
function animate(n,frames,options){if(!n.animate){n.remove();return;}const a=n.animate(frames,options);animations.add(a);a.finished.catch(()=>{}).finally(()=>{animations.delete(a);n.remove();});}
function clear(){for(const a of animations)a.cancel();animations.clear();if(layer)layer.replaceChildren();}
function badge(anchor,text,tone='gold',duration=1100){if(!anchor)return;const p=point(anchor,.5,.22);const n=node('arena-fx-badge '+tone,p.x,p.y,text);animate(n,reduced()?[{opacity:1},{opacity:1},{opacity:0}]:[{opacity:0,transform:'translate(-50%,-50%) scale(.88)'},{opacity:1,transform:'translate(-50%,-50%) scale(1.04)',offset:.16},{opacity:1,transform:'translate(-50%,-50%) scale(1)',offset:.76},{opacity:0,transform:'translate(-50%,-65%) scale(1)'}],{duration,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'});}
function pulse(anchor,tone='gold') {if(!anchor)return;const r=anchor.getBoundingClientRect();const n=node('arena-fx-frame '+tone,r.left,r.top);n.style.width=r.width+'px';n.style.height=r.height+'px';animate(n,reduced()?[{opacity:1},{opacity:0}]:[{opacity:0,transform:'scale(.98)'},{opacity:1,transform:'scale(1)',offset:.25},{opacity:0,transform:'scale(1.015)'}],{duration:750,easing:'ease-out'});}
function coins(from,to,count=9){if(!from||!to||reduced())return;const a=point(from),b=point(to);count=Math.min(16,Math.max(1,count));for(let i=0;i<count;i++){const n=node('arena-fx-coin',a.x,a.y);const image=document.createElement('img');image.src='assets/coin.png?v=1';image.alt='';n.append(image);const spread=(i-(count-1)/2)*11;animate(n,[{opacity:0,transform:'translate(-50%,-50%) scale(.5)'},{opacity:1,transform:`translate(calc(-50% + ${(b.x-a.x)*.42+spread}px),calc(-50% + ${(b.y-a.y)*.42-50}px)) rotate(-15deg) scale(1.1)`,offset:.45},{opacity:1,transform:`translate(calc(-50% + ${b.x-a.x}px),calc(-50% + ${b.y-a.y}px)) rotate(10deg) scale(.65)`,offset:.9},{opacity:0,transform:`translate(calc(-50% + ${b.x-a.x}px),calc(-50% + ${b.y-a.y}px)) scale(.4)`}],{duration:700,delay:i*36,easing:'cubic-bezier(.24,.65,.4,1)',fill:'both'});}}
function sparks(anchor){if(!anchor||reduced())return;const p=point(anchor,.5,.4);for(let i=0;i<18;i++){const angle=i*Math.PI*2/18,dist=55+(i%4)*20;const n=node('arena-fx-spark',p.x,p.y);animate(n,[{opacity:0,transform:'scale(.2)'},{opacity:1,offset:.15},{opacity:0,transform:`translate(${Math.cos(angle)*dist}px,${Math.sin(angle)*dist}px) rotate(${i*29}deg) scale(.3)`}],{duration:850,delay:(i%3)*35,easing:'ease-out',fill:'both'});}}
function commit({from,anchor,lev=1}){clear();coins(from,anchor,6);badge(anchor,lev+'배 · 선택 확정','blue',950);pulse(anchor,'blue');}
function last({anchor,count=1}){clear();badge(anchor,'마지막 '+count+'봉','gold',650);pulse(anchor,'gold');}
function result({anchor,target,amount=0,practice=false}){clear();const text=(practice?'모의 ':'')+(amount>0?'+':'')+Math.round(amount).toLocaleString()+' G';badge(anchor,text,amount>0?'gold':amount<0?'loss':'blue',1700);if(amount>0){coins(anchor,target,12);sparks(anchor);pulse(target);}else pulse(target,amount<0?'loss':'blue');}
function victory({anchor}){clear();badge(anchor,'WINNER','gold',1900);sparks(anchor);pulse(anchor);}
root.ArenaFX={clear,commit,last,result,victory};
window.addEventListener('resize',clear);document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
})(window);
