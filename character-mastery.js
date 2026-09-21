/* Cosmetic-only, local character progress. Match IDs make awards idempotent. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ArenaMastery=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const KEY='chartarena_mastery_v1',IDS=['tr_sera','tr_narin','tr_chaerin','tr_sia','tr_arin','tr_taeo','tr_ijun','tr_jihan','tr_ryujin','tr_mujin'];
const number=v=>Number.isSafeInteger(v)&&v>=0?Math.min(v,10000000):0;
function normalize(old){const characters={};for(const id of IDS){const c=(old&&old.characters||{})[id]||{};characters[id]={played:number(c.played),wins:number(c.wins),comebacks:number(c.comebacks),escapes:number(c.escapes),xp:number(c.xp)};}return {version:1,characters,awarded:Array.isArray(old&&old.awarded)?old.awarded.filter(x=>typeof x==='string').slice(-512):[]};}
function award(old,outcome){
 if(!outcome||typeof outcome.id!=='string'||!outcome.id||outcome.id.length>180||!IDS.includes(outcome.character))throw Error('Invalid mastery outcome');
 const s=normalize(old);if(s.awarded.includes(outcome.id))return s;
 const c=s.characters[outcome.character];c.played++;c.wins+=outcome.won===true?1:0;c.comebacks+=outcome.comeback===true?1:0;c.escapes+=outcome.escape===true?1:0;c.xp+=20+(outcome.won===true?30:0)+(outcome.comeback===true?15:0)+(outcome.escape===true?10:0);
 s.awarded.push(outcome.id);s.awarded=s.awarded.slice(-512);return s;
}
function read(){try{return normalize(JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(_){return normalize({});}}
function summary(character,old){const s=old===undefined?read():normalize(old),c=s.characters[character]||s.characters.tr_sera,unlocked=[];
 if(c.wins>=1)unlocked.push('quote');if(c.wins>=3)unlocked.push('frame');if(c.wins>=5||c.comebacks+c.escapes>=2)unlocked.push('spotlight');
 const next=!unlocked.includes('quote')?'첫 1승 · 전용 승리 대사':!unlocked.includes('frame')?'3승까지 '+(3-c.wins)+'승 · 골드 프레임':!unlocked.includes('spotlight')?'5승 또는 역전·탈출 2회 · 승리 조명':'모든 전용 보상 해금';
 return {...c,unlocked,next,level:1+Math.floor(c.xp/100),progress:c.xp%100};
}
function record(outcome){const update=()=>{const next=award(read(),outcome);localStorage.setItem(KEY,JSON.stringify(next));window.dispatchEvent(new Event('arena-mastery'));return summary(outcome.character,next);};return (navigator.locks?navigator.locks.request('chartarena-mastery',update):Promise.resolve().then(update));}
function render(element,character){if(!element)return;const p=summary(character);element.classList.add('mastery-card');element.dataset.frame=p.unlocked.includes('frame')?'gold':'none';element.innerHTML='<div><span>CHARACTER MASTERY</span><b>Lv.'+p.level+' <small>· '+p.wins+'승</small></b></div><progress value="'+p.progress+'" max="100" aria-label="다음 숙련도 레벨"></progress><p>'+p.next+'</p><small>완주 +20 · 승리 +30 · 역전 +15 · 꼴찌 탈출 +10 XP</small>';}
return {KEY,normalize,award,summary,record,render};
});
