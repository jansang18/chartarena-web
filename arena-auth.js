/* Shared Firebase identity. Game saves and virtual gold remain device-local. */
(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ArenaAuth=api.createClient(root);
})(typeof window!=='undefined'?window:this,function(){
  'use strict';
  var config={apiKey:'AIzaSyCRGFwkDNEIkTc7mnPPqiubFDaTjWf87iA',authDomain:'chartarena-3051a.firebaseapp.com',projectId:'chartarena-3051a',appId:'1:44830019146:web:76089575110b3107e460b3'};
  function fail(code){var e=new Error(code);e.code=code;return e;}
  function safeNext(value){
    return /^(index\.html|deathmatch\.html|quiz-battle\.html(?:\?table=(?:beginner|standard|expert))?)$/.test(value||'')?value:'index.html';
  }
  function message(error){
    var messages={
      'auth/local-preview':'미리보기에서는 계정에 연결하지 않아요. 게스트로 화면을 둘러볼 수 있습니다.',
      'auth/operation-not-allowed':'이메일 로그인을 준비 중입니다. 지금은 게스트로 입장해 주세요.',
      'auth/password-login-disabled':'이메일 로그인을 준비 중입니다. 지금은 게스트로 입장해 주세요.',
      'auth/configuration-not-found':'이메일 로그인을 준비 중입니다. 지금은 게스트로 입장해 주세요.',
      'auth/invalid-api-key':'로그인 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.',
      'auth/invalid-email':'이메일 주소를 확인해 주세요.',
      'auth/invalid-credential':'이메일 또는 비밀번호를 확인해 주세요.',
      'auth/invalid-login-credentials':'이메일 또는 비밀번호를 확인해 주세요.',
      'auth/user-not-found':'이메일 또는 비밀번호를 확인해 주세요.',
      'auth/wrong-password':'이메일 또는 비밀번호를 확인해 주세요.',
      'auth/email-already-in-use':'가입할 수 없는 이메일입니다. 로그인하거나 비밀번호를 재설정해 주세요.',
      'auth/credential-already-in-use':'이미 연결된 계정입니다. 로그인으로 이어서 진행해 주세요.',
      'auth/weak-password':'비밀번호를 더 길게 설정해 주세요. 최소 8자 이상을 권장합니다.',
      'auth/password-does-not-meet-requirements':'비밀번호가 계정 보안 기준에 맞지 않습니다. 영문 대·소문자, 숫자, 기호를 포함해 다시 입력해 주세요.',
      'auth/too-many-requests':'시도가 많아 잠시 쉬고 있어요. 조금 뒤 다시 시도해 주세요.',
      'auth/network-request-failed':'연결이 원활하지 않아요. 인터넷 연결을 확인하고 다시 시도해 주세요.',
      'auth/timeout':'서버 연결이 늦어지고 있어요. 잠시 후 다시 시도해 주세요.',
      'auth/user-disabled':'이용이 제한된 계정입니다.',
      'auth/already-signed-in':'이미 로그인되어 있습니다. 계정 화면에서 계속해 주세요.',
      'auth/popup-closed-by-user':'로그인 창을 닫았어요. 다시 시도하거나 게스트로 입장해 주세요.',
      'auth/popup-blocked':'로그인 팝업이 차단됐어요. 팝업을 허용하거나 Chrome·Safari에서 다시 열어 주세요.',
      'auth/account-exists-with-different-credential':'같은 이메일의 다른 로그인 계정이 있습니다. 기존 방법으로 로그인해 주세요.',
      'auth/unauthorized-domain':'이 주소에서 소셜 로그인을 준비 중이에요. 게스트로 입장해 주세요.'
    };
    return messages[error&&error.code]||'로그인을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.';
  }
  function createClient(env){
    var local=env.location.protocol==='file:'||/^(localhost|127\.0\.0\.1|\[::1\])$/.test(env.location.hostname);
    var scripts={},readyPromise=null,guestPromise=null;
    function load(module){
      if(env.firebase&&(module==='app'||env.firebase[module]))return Promise.resolve();
      if(scripts[module])return scripts[module];
      scripts[module]=new Promise(function(resolve,reject){
        var s=env.document.createElement('script');
        var timer=env.setTimeout(function(){s.remove();reject(fail('auth/timeout'));},12000);
        s.src='https://www.gstatic.com/firebasejs/10.12.2/firebase-'+module+'-compat.js';
        s.onload=function(){env.clearTimeout(timer);resolve();};
        s.onerror=function(){env.clearTimeout(timer);s.remove();reject(fail('auth/network-request-failed'));};
        env.document.head.appendChild(s);
      }).catch(function(e){delete scripts[module];throw e;});
      return scripts[module];
    }
    function ready(){
      if(local)return Promise.reject(fail('auth/local-preview'));
      if(!readyPromise)readyPromise=load('app').then(function(){return load('auth');}).then(function(){
        if(!env.firebase.apps.length)env.firebase.initializeApp(config);
        var auth=env.firebase.auth();auth.languageCode='ko';
        return new Promise(function(resolve,reject){
          var stop=function(){},done=false;
          var timer=env.setTimeout(function(){stop();reject(fail('auth/timeout'));},12000);
          stop=auth.onAuthStateChanged(function(){done=true;env.clearTimeout(timer);stop();resolve(auth);},function(e){env.clearTimeout(timer);stop();reject(e);});
          if(done)stop();
        });
      }).catch(function(e){readyPromise=null;throw e;});
      return readyPromise;
    }
    function session(){
      return ready().then(function(auth){
        if(auth.currentUser)return auth.currentUser;
        if(!guestPromise)guestPromise=auth.signInAnonymously().then(function(c){return c.user;}).finally(function(){guestPromise=null;});
        return guestPromise;
      });
    }
    return {
      local:local,safeNext:safeNext,message:message,
      current:function(){return ready().then(function(auth){return auth.currentUser;});},
      session:session,
      signInToken:function(token){return ready().then(function(auth){return auth.signInWithCustomToken(token);}).then(function(c){return c.user;});},
      signInGoogle:function(){return ready().then(function(auth){var provider=new env.firebase.auth.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});return auth.signInWithPopup(provider);}).then(function(c){return c.user;});},
      connect:function(){return session().then(function(user){return load('firestore').then(function(){return {user:user,db:env.firebase.firestore()};});});},
      signIn:function(email,password){return ready().then(function(auth){return auth.signInWithEmailAndPassword(email.trim(),password);}).then(function(c){return c.user;});},
      register:function(email,password){return ready().then(function(auth){
        if(auth.currentUser){
          if(!auth.currentUser.isAnonymous)throw fail('auth/already-signed-in');
          return auth.currentUser.linkWithCredential(env.firebase.auth.EmailAuthProvider.credential(email.trim(),password));
        }
        return auth.createUserWithEmailAndPassword(email.trim(),password);
      }).then(function(c){return c.user;});},
      resetPassword:function(email){return ready().then(function(auth){return auth.sendPasswordResetEmail(email.trim());}).catch(function(e){if(e.code!=='auth/user-not-found')throw e;});},
      signOut:function(){return ready().then(function(auth){return auth.signOut();});}
    };
  }
  return {createClient:createClient,safeNext:safeNext,message:message};
});
