const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const file=require('node:path').join(__dirname,'../arena-auth.js');
const api=fs.existsSync(file)?require(file):{};

function environment(user){
  const calls=[];
  const auth={currentUser:null,languageCode:'',
    onAuthStateChanged(cb){queueMicrotask(()=>{this.currentUser=user;cb(user);});return ()=>{};},
    async signInAnonymously(){calls.push('anonymous');this.currentUser={uid:'guest',isAnonymous:true};return {user:this.currentUser};},
    async signInWithEmailAndPassword(email,password){calls.push(['login',email,password]);return {user:{uid:'member',isAnonymous:false}};},
    async createUserWithEmailAndPassword(email,password){calls.push(['register',email,password]);return {user:{uid:'new',isAnonymous:false}};},
    async sendPasswordResetEmail(email){calls.push(['reset',email]);},
    async signOut(){calls.push('logout');this.currentUser=null;}
  };
  const authFactory=()=>auth;
  authFactory.EmailAuthProvider={credential:(email,password)=>({email,password})};
  const env={location:{hostname:'jansang18.github.io',protocol:'https:'},firebase:{apps:[{}],auth:authFactory},setTimeout,clearTimeout};
  return {env,auth,calls};
}

test('restored member session is not replaced by an anonymous account',async()=>{
  assert.equal(typeof api.createClient,'function','authentication client exists');
  const e=environment({uid:'returning-member',isAnonymous:false});
  const client=api.createClient(e.env);
  assert.equal((await client.session()).uid,'returning-member');
  assert.deepEqual(e.calls,[]);
});

test('simultaneous guest consumers share one anonymous sign-in',async()=>{
  const e=environment(null),client=api.createClient(e.env);
  const users=await Promise.all([client.session(),client.session(),client.session()]);
  assert.equal(users.every(u=>u.uid==='guest'),true);
  assert.deepEqual(e.calls,['anonymous']);
});

test('registration upgrades the existing guest UID and does not create a second account',async()=>{
  const user={uid:'existing-guest',isAnonymous:true,async linkWithCredential(c){assert.equal(c.email,'test@example.invalid');return {user:{uid:this.uid,isAnonymous:false}};}};
  const e=environment(user),client=api.createClient(e.env);
  assert.equal((await client.register(' test@example.invalid ','a safe test password')).uid,user.uid);
  assert.deepEqual(e.calls,[]);
});

test('local previews never load or initialize production Firebase',async()=>{
  for(const hostname of ['localhost','127.0.0.1','[::1]']){
    const e=environment(null);e.env.location.hostname=hostname;
    e.env.document={createElement(){throw Error('network SDK requested');}};
    const client=api.createClient(e.env);
    await assert.rejects(client.signIn('test@example.invalid','not-a-real-password'),{code:'auth/local-preview'});
    assert.deepEqual(e.calls,[]);
  }
});

test('provider errors stay errors and do not silently enter the game',async()=>{
  const e=environment(null);e.auth.signInWithEmailAndPassword=async()=>{throw {code:'auth/operation-not-allowed'};};
  await assert.rejects(api.createClient(e.env).signIn('test@example.invalid','not-a-real-password'),{code:'auth/operation-not-allowed'});
  assert.match(api.message({code:'auth/operation-not-allowed'}),/준비/);
});

test('post-login destination only allows known game pages and table values',()=>{
  assert.equal(api.safeNext('quiz-battle.html?table=expert'),'quiz-battle.html?table=expert');
  assert.equal(api.safeNext('deathmatch.html'),'deathmatch.html');
  for(const value of ['https://evil.invalid','//evil.invalid','javascript:alert(1)','../index.html','quiz-battle.html?table=evil','index.html?email=private','login.html'])assert.equal(api.safeNext(value),'index.html');
});

test('password reset and login only forward the trimmed email, never persist application data',async()=>{
  const e=environment(null);e.env.localStorage={setItem(){throw Error('authentication must not rewrite game saves');},clear(){throw Error('must preserve game saves');}};
  const client=api.createClient(e.env);
  await client.signIn(' test@example.invalid ',' keep password spaces ');
  await client.resetPassword(' test@example.invalid ');
  await client.signOut();
  assert.deepEqual(e.calls,[['login','test@example.invalid',' keep password spaces '],['reset','test@example.invalid'],'logout']);
});
