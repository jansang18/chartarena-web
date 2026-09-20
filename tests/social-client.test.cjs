const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const file=require('node:path').join(__dirname,'../arena-social.js'),api=fs.existsSync(file)?require(file):{};
function environment(){
 const data=new Map(),calls=[],signed=[];
 const env={crypto:crypto.webcrypto,TextEncoder,btoa:s=>Buffer.from(s,'binary').toString('base64'),location:{hash:'',pathname:'/chartarena-web/login.html',search:'',assign(url){this.assigned=url;}},history:{replaceState(a,b,url){env.cleaned=url;}},sessionStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},
 fetch:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>url.endsWith('/config')?{providers:{kakao:true,naver:true}}:{token:'mock-firebase-custom-token'}};}};
 const auth={local:false,safeNext:require('../arena-auth').safeNext,async signInToken(token){signed.push(token);return {uid:'kakao:verified'};}};
 const config={endpoint:'https://asia-northeast3-chartarena-3051a.cloudfunctions.net/socialAuth'};
 return {env,auth,config,data,calls,signed};
}
test('social login stores a random verifier in session storage and never in the redirect URL',async()=>{
 assert.equal(typeof api.createClient,'function');
 const e=environment(),client=api.createClient(e.env,e.auth,e.config);await client.start('kakao','quiz-battle.html?table=expert');
 const pending=JSON.parse([...e.data.values()][0]),url=new URL(e.env.location.assigned);
 assert.equal(pending.next,'quiz-battle.html?table=expert');assert.equal(url.searchParams.get('flow'),pending.flow);
 assert.equal(url.searchParams.get('challenge'),crypto.createHash('sha256').update(pending.verifier).digest('base64url'));
 assert.ok(!url.href.includes(pending.verifier));assert.equal(url.searchParams.get('provider'),'kakao');
});
test('same-tab return consumes the ticket once, removes the fragment, and signs in to Firebase',async()=>{
 const e=environment(),c=api.createClient(e.env,e.auth,e.config);await c.start('naver','deathmatch.html');const p=JSON.parse([...e.data.values()][0]);
 e.env.location.hash='#social_ticket='+crypto.randomBytes(32).toString('base64url')+'&flow='+p.flow;
 const result=await c.resume();assert.equal(result.next,'deathmatch.html');assert.equal(result.user.uid,'kakao:verified');
 assert.deepEqual(e.signed,['mock-firebase-custom-token']);assert.equal(e.data.size,0);assert.equal(e.env.cleaned,'/chartarena-web/login.html');
 assert.equal(e.calls[1].options.method,'POST');assert.equal(e.calls[1].options.credentials,'omit');
 await assert.rejects(c.resume(),{code:'social/expired'});assert.equal(e.signed.length,1);
});
test('foreign or stale returns and canceled consent never call Firebase sign-in',async()=>{
 const e=environment(),c=api.createClient(e.env,e.auth,e.config);await c.start('kakao','index.html');
 e.env.location.hash='#social_ticket='+crypto.randomBytes(32).toString('base64url')+'&flow='+crypto.randomBytes(32).toString('base64url');
 await assert.rejects(c.resume(),{code:'social/expired'});assert.equal(e.signed.length,0);
 await c.start('kakao','index.html');const p=JSON.parse([...e.data.values()][0]);e.env.location.hash='#social_error=cancelled&flow='+p.flow;
 await assert.rejects(c.resume(),{code:'social/cancelled'});assert.equal(e.signed.length,0);
});
test('unconfigured providers and local previews never redirect or request production auth',async()=>{
 const e=environment();await assert.rejects(api.createClient(e.env,e.auth,{}).start('kakao'),{code:'social/not-configured'});
 e.auth.local=true;await assert.rejects(api.createClient(e.env,e.auth,e.config).start('naver'),{code:'social/local-preview'});
 assert.equal(e.calls.length,0);assert.equal(e.env.location.assigned,undefined);
});
test('browser storage rejection fails before leaving the login page',async()=>{
 const e=environment();e.env.sessionStorage.setItem=()=>{throw Error('blocked');};
 await assert.rejects(api.createClient(e.env,e.auth,e.config).start('naver'),{code:'social/storage'});assert.equal(e.env.location.assigned,undefined);
});

test('Google is independently gated and uses native Firebase authentication',async()=>{
 const e=environment();e.auth.signInGoogle=async()=>({uid:'google-subject'});
 await assert.rejects(api.createClient(e.env,e.auth,e.config).start('google'),{code:'social/not-configured'});
 const c=api.createClient(e.env,e.auth,{googleEnabled:true});
 const result=await c.start('google','https://foreign.invalid');
 assert.equal(result.user.uid,'google-subject');assert.equal(result.next,'index.html');assert.equal(e.calls.length,0);
});

test('expired local pending state and provider failure do not sign in',async()=>{
 const e=environment(),c=api.createClient(e.env,e.auth,e.config);await c.start('naver');
 const key=[...e.data.keys()][0],pending=JSON.parse(e.data.get(key));pending.created-=900000;e.data.set(key,JSON.stringify(pending));
 e.env.location.hash='#social_ticket='+crypto.randomBytes(32).toString('base64url')+'&flow='+pending.flow;
 await assert.rejects(c.resume(),{code:'social/expired'});assert.equal(e.signed.length,0);
 await c.start('naver');const p=JSON.parse(e.data.get(key));e.env.location.hash='#social_ticket='+crypto.randomBytes(32).toString('base64url')+'&flow='+p.flow;
 e.env.fetch=async()=>({ok:false});await assert.rejects(c.resume(),{code:'social/failed'});assert.equal(e.signed.length,0);
});
