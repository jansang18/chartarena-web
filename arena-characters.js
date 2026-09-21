/* Royal cast: user-supplied transparent originals. Retired saves resolve here. */
(function(root){
'use strict';
var list=[
{id:'tr_sera',name:'세라',en:'SERA',role:'여유롭게 판을 지배하는 승부사',quote:'승부는, 내가 정하는 순간에.',color:'#b95d6c',image:'assets/traders/royal/sera-v2.png'},
{id:'tr_narin',name:'나린',en:'NARIN',role:'흔들림 없이 기회를 기다리는 관찰자',quote:'마지막까지 내 흐름대로.',color:'#b1a1bb',image:'assets/traders/royal/narin-v2.png'},
{id:'tr_chaerin',name:'채린',en:'CHAERIN',role:'새로운 흐름을 읽는 전략가',quote:'판이 바뀌면, 답도 바뀌어.',color:'#e2d2ad',image:'assets/traders/royal/chaerin-v2.png'},
{id:'tr_sia',name:'시아',en:'SIA',role:'한 박자 쉬어가는 심리전의 고수',quote:'지금은, 기다릴 차례.',color:'#b9a7c9',image:'assets/traders/royal/sia-v2.png'},
{id:'tr_arin',name:'아린',en:'ARIN',role:'자신의 페이스를 지키는 플레이어',quote:'쉽게 흔들리지는 않아.',color:'#bd92b9',image:'assets/traders/royal/arin-v2.png'},
{id:'tr_taeo',name:'태오',en:'TAEO',role:'위기에도 냉정한 베테랑',quote:'남아 있어야 기회가 온다.',color:'#a0b0b4',image:'assets/traders/royal/taeo-v2.png'},
{id:'tr_ijun',name:'이준',en:'IJUN',role:'숫자로 다음 수를 읽는 설계자',quote:'모든 선택에는 이유가 있어.',color:'#8fa9c7',image:'assets/traders/royal/ijun-v2.png'},
{id:'tr_jihan',name:'지한',en:'JIHAN',role:'판의 속도를 조절하는 지휘자',quote:'멈출 줄 아는 것도 실력이지.',color:'#c3bbab',image:'assets/traders/royal/jihan-v2.png'},
{id:'tr_ryujin',name:'류진',en:'RYUJIN',role:'기회를 놓치지 않는 도전자',quote:'지금, 승부를 걸어.',color:'#c27672',image:'assets/traders/royal/ryujin-v2.png'},
{id:'tr_mujin',name:'무진',en:'MUJIN',role:'끝까지 버티는 묵직한 승부사',quote:'급할 것 없어. 끝을 보자.',color:'#b3a186',image:'assets/traders/royal/mujin-v2.png'}
];
// Preserve each retired trader's skill for existing profiles and open matches.
var retired={tr_seon:'tr_sera',tr_yuna:'tr_chaerin',tr_kai:'tr_taeo',tr_rin:'tr_narin',tr_doyun:'tr_jihan'};
var classic=['tr_sera','tr_chaerin','tr_taeo','tr_narin','tr_jihan'];
function get(id){
 var key=String(id||''),legacy=/^hux?(\d+)$/.exec(key);
 if(legacy)key=classic[Number(legacy[1])%classic.length];
 else if(Object.prototype.hasOwnProperty.call(retired,key))key=retired[key];
 return list.find(function(c){return c.id===key;})||list[0];
}
function register(images){list.forEach(function(c){images[c.id]=c.image;});}
function selection(profile){var equip=(profile||{}).equip||{};return {ch:get(equip.ch).id,skin:'normal'};}
var api={list:list,get:get,register:register,selection:selection};
root.ArenaCharacters=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:globalThis);
