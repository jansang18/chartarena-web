/* All current wallet writers share this origin-wide mutex. */
(function(root){
'use strict';
let release=null,starting=false;
function locks(){if(!root.navigator||!root.navigator.locks)throw Error('골드 저장을 위해 최신 브라우저를 사용해 주세요.');return root.navigator.locks;}
function run(fn,options){return locks().request('chartarena-wallet',options||{},lock=>{if(!lock)throw Error('다른 창의 경기가 끝난 뒤 다시 시도해 주세요.');return fn();});}
function hold(fn){
 if(starting||release)return Promise.resolve(false);starting=true;
 return run(()=>new Promise((resolve,reject)=>{
  release=()=>{release=null;resolve(true);};
  try{if(!fn()&&release)release();}catch(e){release=null;reject(e);}
 }),{ifAvailable:true}).finally(()=>{starting=false;});
}
root.ArenaWallet={run,hold,release(){if(release)release();}};
})(typeof window==='object'?window:globalThis);
