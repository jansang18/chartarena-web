(function(){
 'use strict';
 const pending=new Map();
 window.ArenaData={load:function(index){
  const seg=window.BATTLE_CHARTS[index];
  if(!seg)return Promise.reject(Error('차트 번호를 확인할 수 없습니다.'));
  if(seg.cs)return Promise.resolve(seg);
  if(!pending.has(index))pending.set(index,fetch(seg.file).then(function(r){if(!r.ok)throw Error('차트 다운로드 실패');return r.json();}).then(function(cs){
   if(!Array.isArray(cs)||cs.length!==300||cs.some(function(c){return !Array.isArray(c)||c.length!==4||c.some(function(v){return !Number.isFinite(v)||v<=0;});}))throw Error('차트 데이터 오류');
   seg.cs=cs;pending.delete(index);return seg;
  }).catch(function(e){pending.delete(index);throw e;}));
  return pending.get(index);
 }};
})();
