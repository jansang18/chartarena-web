/* Shared presentation catalog. Legacy ownership keys remain valid. */
(function(root){
'use strict';
var list=[
{id:'tr_seon',name:'서온',en:'SEON',role:'직감을 믿는 승부사',quote:'기회는 기다려주지 않으니까.',color:'#d9b770',image:'assets/traders/seon-v1.png'},
{id:'tr_yuna',name:'유나',en:'YUNA',role:'흐름을 읽는 분석가',quote:'숫자에는 언제나 이유가 있어요.',color:'#74b6ac',image:'assets/traders/yuna-v1.png'},
{id:'tr_kai',name:'카이',en:'KAI',role:'흔들림 없는 도전자',quote:'내 판단에 승부를 건다.',color:'#c7747e',image:'assets/traders/kai-v1.png'},
{id:'tr_rin',name:'린',en:'RIN',role:'판을 읽는 베테랑',quote:'끝까지 남는 사람이 이기는 거야.',color:'#a4b3c9',image:'assets/traders/rin-v1.png'},
{id:'tr_doyun',name:'도윤',en:'DOYUN',role:'한 수 앞을 보는 전략가',quote:'급할수록, 한 번 더 생각해.',color:'#8eaedd',image:'assets/traders/doyun-v1.png'}
];
list.forEach(function(c){c.motion='assets/traders/motion/'+c.id.slice(3)+'-idle-v6.webp';});
function get(id){var exact=list.find(function(c){return c.id===id;});if(exact)return exact;var legacy=/^hu(\d+)$/.exec(String(id||''));return list[legacy?Number(legacy[1])%list.length:0];}
function register(images){list.forEach(function(c){images[c.id]=c.image;});}
function selection(profile){var equip=(profile||{}).equip||{};return {ch:get(equip.ch).id,skin:'normal'};}
var api={list:list,get:get,register:register,selection:selection};
root.ArenaCharacters=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:globalThis);
