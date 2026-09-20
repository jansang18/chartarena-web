(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ArenaSocial=api.createClient(root,root.ArenaAuth,root.ArenaSocialConfig||{});
})(typeof window!=='undefined'?window:this,function(){
  'use strict';
  var key='chartarena_social_pending',valid=function(s){return typeof s==='string'&&/^[A-Za-z0-9_-]{43}$/.test(s);};
  function fail(code){var error=new Error(code);error.code='social/'+code;return error;}
  function message(error){return ({
    'social/not-configured':'이 로그인은 연결 준비 중이에요. 지금은 게스트로 입장할 수 있습니다.',
    'social/local-preview':'로컬 미리보기에서는 소셜 계정에 연결하지 않아요. 게스트로 입장해 주세요.',
    'social/storage':'로그인 정보를 잠시 보관할 수 없어요. 일반 브라우저에서 다시 시도해 주세요.',
    'social/expired':'로그인 요청이 만료됐어요. 버튼을 눌러 다시 시작해 주세요.',
    'social/cancelled':'로그인을 취소했어요. 다시 시작하거나 게스트로 입장할 수 있습니다.',
    'social/failed':'소셜 로그인을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.'
  })[error&&error.code];}
  function createClient(env,auth,config){
    function endpoint(){
      if(auth.local)throw fail('local-preview');
      try{var url=new URL(config.endpoint);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw Error();return url.href.replace(/\/$/,'');}
      catch(e){throw fail('not-configured');}
    }
    function encode(bytes){return env.btoa(String.fromCharCode.apply(null,new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
    function random(){return encode(env.crypto.getRandomValues(new Uint8Array(32)));}
    async function request(url,options){
      var response;
      try{response=await env.fetch(url,Object.assign({cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)},options));}
      catch(e){throw fail('failed');}
      if(!response.ok)throw fail('failed');
      return response.json();
    }
    async function availability(){
      var result={kakao:false,naver:false,google:!!config.googleEnabled};
      if(auth.local||!config.endpoint)return result;
      var data=await request(endpoint()+'/config');
      result.kakao=data.providers?.kakao===true;result.naver=data.providers?.naver===true;return result;
    }
    async function start(provider,next){
      if(auth.local)throw fail('local-preview');
      if(provider==='google'){
        if(!config.googleEnabled)throw fail('not-configured');
        return {user:await auth.signInGoogle(),next:auth.safeNext(next)};
      }
      if(provider!=='kakao'&&provider!=='naver')throw fail('not-configured');
      var base=endpoint(),available=await availability();
      if(!available[provider])throw fail('not-configured');
      var verifier=random(),flow=random();
      var challenge=encode(await env.crypto.subtle.digest('SHA-256',new env.TextEncoder().encode(verifier)));
      try{env.sessionStorage.setItem(key,JSON.stringify({verifier:verifier,flow:flow,next:auth.safeNext(next),created:Date.now()}));}
      catch(e){throw fail('storage');}
      env.location.assign(base+'/start?'+new URLSearchParams({provider:provider,challenge:challenge,flow:flow}));
    }
    async function resume(){
      var base=endpoint(),params=new URLSearchParams(env.location.hash.slice(1)),pending;
      env.history.replaceState(null,'',env.location.pathname+env.location.search);
      try{pending=JSON.parse(env.sessionStorage.getItem(key));env.sessionStorage.removeItem(key);}catch(e){throw fail('storage');}
      if(!pending||!valid(pending.verifier)||!valid(pending.flow)||pending.flow!==params.get('flow')||!Number.isFinite(pending.created)||Date.now()-pending.created>720000||pending.created>Date.now()+30000)throw fail('expired');
      if(params.has('social_error'))throw fail(params.get('social_error')==='cancelled'?'cancelled':'failed');
      var ticket=params.get('social_ticket');if(!valid(ticket))throw fail('expired');
      var data=await request(base+'/exchange',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticket:ticket,verifier:pending.verifier,flow:pending.flow})});
      if(typeof data.token!=='string'||!data.token)throw fail('failed');
      return {user:await auth.signInToken(data.token),next:auth.safeNext(pending.next)};
    }
    return {start:start,resume:resume,availability:availability,message:message};
  }
  return {createClient:createClient,message:message};
});
