(function(){
  'use strict';
  var auth=window.ArenaAuth,$=function(id){return document.getElementById(id);};
  if(!auth){$('authStatus').hidden=false;$('authStatus').textContent='로그인 화면을 불러오지 못했어요. 새로고침하거나 게스트로 입장해 주세요.';return;}
  var mode='login',busy=false,next=auth.safeNext(new URLSearchParams(location.search).get('next'));
  $('guestEntry').href=next;$('memberEntry').href=next;
  $('previewNotice').hidden=!auth.local;
  function status(text,kind,target){var el=$(target||'authStatus');el.textContent=text||'';el.hidden=!text;el.dataset.kind=kind||'info';}
  function errors(){['email','password','confirm'].forEach(function(key){$(key+'Error').textContent='';$('auth'+key[0].toUpperCase()+key.slice(1)).removeAttribute('aria-invalid');});}
  function setBusy(value){busy=value;$('authFields').disabled=value;$('authForm').setAttribute('aria-busy',String(value));$('authSubmit').setAttribute('aria-busy',String(value));document.querySelectorAll('[data-mode],#resetBack').forEach(function(el){el.disabled=value;});$('submitLabel').textContent=value?'연결 중…':mode==='register'?'계정 만들기':mode==='reset'?'재설정 메일 보내기':'로그인';}
  function showMode(value){
    if(busy)return;mode=value;errors();status('');
    document.querySelectorAll('[data-mode]').forEach(function(el){el.setAttribute('aria-pressed',String(el.dataset.mode===value));});
    $('confirmField').hidden=value!=='register';$('authConfirm').required=value==='register';
    $('passwordField').hidden=value==='reset';$('authPassword').required=value!=='reset';
    $('resetMode').hidden=value!=='login';$('resetBack').hidden=value!=='reset';
    $('authPassword').autocomplete=value==='register'?'new-password':'current-password';
    $('authPassword').placeholder=value==='register'?'8자 이상 비밀번호':'비밀번호';
    $('authPassword').value='';$('authConfirm').value='';
    $('authPassword').type='password';$('passwordToggle').setAttribute('aria-pressed','false');$('passwordToggle').setAttribute('aria-label','비밀번호 표시');
    $('authTitle').textContent=value==='register'?'새로운 승부의 시작.':value==='reset'?'다시 연결해 드릴게요.':'다시, 아레나로.';
    $('authIntro').textContent=value==='register'?'이메일로 나만의 계정을 만들어 보세요.':value==='reset'?'가입한 이메일로 재설정 링크를 보내드립니다.':'당신의 다음 판단을 기다리고 있어요.';
    setBusy(false);
  }
  function fieldError(key,text){var field=$('auth'+key[0].toUpperCase()+key.slice(1));field.setAttribute('aria-invalid','true');$(key+'Error').textContent=text;field.focus();}
  function account(user){
    var member=!!(user&&!user.isAnonymous);
    $('signedIn').hidden=!member;$('signedOut').hidden=member;
    if(member){$('accountEmail').textContent=user.email||'내 계정';$('authTitle').textContent='입장할 준비가 됐어요.';$('authIntro').textContent='같은 차트 위에서 펼쳐지는 새로운 승부.';}
  }
  document.querySelectorAll('[data-mode]').forEach(function(el){el.addEventListener('click',function(){showMode(el.dataset.mode);});});
  $('resetMode').addEventListener('click',function(){showMode('reset');$('authEmail').focus();});
  $('resetBack').addEventListener('click',function(){showMode('login');});
  $('passwordToggle').addEventListener('click',function(){var show=$('authPassword').type==='password';$('authPassword').type=show?'text':'password';this.setAttribute('aria-pressed',String(show));this.setAttribute('aria-label',show?'비밀번호 숨기기':'비밀번호 표시');});
  $('authForm').addEventListener('submit',async function(e){
    e.preventDefault();if(busy)return;errors();status('');
    var email=$('authEmail').value.trim(),password=$('authPassword').value;
    if(!email||!$('authEmail').validity.valid){fieldError('email','올바른 이메일 주소를 입력해 주세요.');return;}
    if(mode!=='reset'&&!password){fieldError('password','비밀번호를 입력해 주세요.');return;}
    if(mode==='register'&&password.length<8){fieldError('password','비밀번호는 8자 이상으로 입력해 주세요.');return;}
    if(mode==='register'&&password!==$('authConfirm').value){fieldError('confirm','비밀번호가 일치하지 않습니다.');return;}
    setBusy(true);
    try{
      if(mode==='reset'){
        await auth.resetPassword(email);
        status('가입된 이메일이라면 재설정 링크가 발송됩니다. 메일함과 스팸함을 확인해 주세요.');
      }else{
        var user=mode==='register'?await auth.register(email,password):await auth.signIn(email,password);
        $('authPassword').value='';$('authConfirm').value='';account(user);$('authTitle').focus();
      }
    }catch(error){status(auth.message(error),'error');}
    finally{setBusy(false);}
  });
  $('logout').addEventListener('click',async function(){
    if(busy)return;busy=true;this.disabled=true;status('',null,'accountStatus');
    try{await auth.signOut();busy=false;account(null);showMode('login');status('로그아웃했어요. 이 기기의 게임 기록은 유지됩니다.');}
    catch(error){status(auth.message(error),'error','accountStatus');}
    finally{busy=false;this.disabled=false;}
  });
  setBusy(false);
  if(!auth.local)auth.current().then(account).catch(function(error){status(auth.message(error),'error');});
})();
