const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs');
const file=require('node:path').join(__dirname,'../functions/social-auth/core.cjs');
const api=fs.existsSync(file)?require(file):{};
const value=()=>crypto.randomBytes(32).toString('base64url');
const digest=s=>crypto.createHash('sha256').update(s).digest('base64url');
function harness(){
 const records=new Map(),calls=[],minted=[];let time=100000;
 const store={async put(id,data){records.set(id,{...data});},async take(id,check){const data=records.get(id);if(!data||!check(data))return null;records.delete(id);return data;},async limit(){return true;}};
 const handler=api.createHandler({store,now:()=>time,mintToken:async uid=>{minted.push(uid);return 'test-custom-token';},
  config:{baseUrl:'https://asia-northeast3-chartarena-3051a.cloudfunctions.net/socialAuth',appUrl:'https://jansang18.github.io/chartarena-web/login.html',kakao:{id:'test-kakao',secret:'test-kakao-secret'},naver:{id:'test-naver',secret:'test-naver-secret'}},
  fetch:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>url.includes('/token')?{access_token:'server-only-token'}:url.includes('kapi.kakao.com')?{id:123456}:{resultcode:'00',response:{id:'naver-subject'}}};}});
 async function request(path,query={},extra={}){const headers={},res={statusCode:200,set(k,v){headers[k.toLowerCase()]=v;return this;},status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;},send(body){this.body=body;return this;},end(){return this;},redirect(code,url){this.statusCode=code;this.location=url;return this;}};await handler({method:'GET',path,query,headers:{},...extra},res);return {...res,headers};}
 async function start(provider='kakao'){const verifier=value(),flow=value();const res=await request('/start',{provider,challenge:digest(verifier),flow});return {provider,verifier,flow,res,state:new URL(res.location).searchParams.get('state'),cookie:res.headers['set-cookie'].split(';')[0]};}
 return {request,start,records,calls,minted,store,advance(ms){time+=ms;}};
}
test('server bridge validates cookies/state and exchanges verified provider identity for a one-use ticket',async()=>{
 assert.equal(typeof api.createHandler,'function');
 const h=harness(),flow=await h.start();assert.match(flow.res.location,/^https:\/\/kauth.kakao.com\/oauth\/authorize\?/);
 assert.match(flow.res.headers['set-cookie'],/HttpOnly/);assert.match(flow.res.headers['set-cookie'],/Secure/);
 const callback=await h.request('/callback/kakao',{state:flow.state,code:'provider-code'},{headers:{cookie:flow.cookie}});
 const fragment=new URLSearchParams(new URL(callback.location).hash.slice(1));const ticket=fragment.get('social_ticket');
 assert.ok(ticket);assert.equal(fragment.get('flow'),flow.flow);assert.doesNotMatch(callback.location,/server-only-token|test-custom-token|provider-code/);
 const exchange=()=>h.request('/exchange',{}, {method:'POST',headers:{origin:'https://jansang18.github.io','content-type':'application/json'},body:{ticket,verifier:flow.verifier,flow:flow.flow}});
 assert.equal((await exchange()).body.token,'test-custom-token');assert.equal((await exchange()).statusCode,400);
 assert.match(h.minted[0],/^kakao:[a-f0-9]{64}$/);assert.equal(h.minted.length,1);
 assert.equal(h.calls[0].options.method,'POST');assert.equal(new URLSearchParams(h.calls[0].options.body).get('client_secret'),'test-kakao-secret');
});
test('callback without browser cookie or with wrong provider cannot consume a valid login',async()=>{
 const h=harness(),f=await h.start();
 assert.equal((await h.request('/callback/kakao',{state:f.state,code:'x'})).statusCode,400);
 assert.equal((await h.request('/callback/naver',{state:f.state,code:'x'},{headers:{cookie:f.cookie}})).statusCode,400);
 assert.equal(h.calls.length,0);
 assert.equal((await h.request('/callback/kakao',{state:f.state,code:'x'},{headers:{cookie:f.cookie}})).statusCode,303);
});
test('ticket theft cannot mint a token without the original browser verifier and origin',async()=>{
 const h=harness(),f=await h.start('naver');
 const cb=await h.request('/callback/naver',{state:f.state,code:'code'},{headers:{cookie:f.cookie}});
 const ticket=new URLSearchParams(new URL(cb.location).hash.slice(1)).get('social_ticket');
 const req=(origin,verifier)=>h.request('/exchange',{}, {method:'POST',headers:{origin,'content-type':'application/json'},body:{ticket,verifier,flow:f.flow}});
 assert.equal((await req('https://attacker.invalid',f.verifier)).statusCode,403);
 assert.equal((await req('https://jansang18.github.io',value())).statusCode,400);
 assert.equal(h.minted.length,0);
 assert.equal((await req('https://jansang18.github.io',f.verifier)).statusCode,200);
 assert.match(h.minted[0],/^naver:/);
 assert.equal(new URLSearchParams(h.calls[0].options.body).get('state'),f.state);
});
test('expired states and tickets, cancellation, callback replay and arbitrary redirects fail closed',async()=>{
 const h=harness(),f=await h.start();h.advance(601000);
 assert.equal((await h.request('/callback/kakao',{state:f.state,code:'x'},{headers:{cookie:f.cookie}})).statusCode,400);
 const second=await h.start();const canceled=await h.request('/callback/kakao',{state:second.state,error:'access_denied',redirect_uri:'https://attacker.invalid'},{headers:{cookie:second.cookie}});
 assert.match(canceled.location,/^https:\/\/jansang18.github.io\/chartarena-web\/login.html#/);assert.match(canceled.location,/social_error=cancelled/);
 assert.equal((await h.request('/callback/kakao',{state:second.state,code:'x'},{headers:{cookie:second.cookie}})).statusCode,400);
 const third=await h.start();const cb=await h.request('/callback/kakao',{state:third.state,code:'x'},{headers:{cookie:third.cookie}});
 h.advance(121000);const ticket=new URLSearchParams(new URL(cb.location).hash.slice(1)).get('social_ticket');
 assert.equal((await h.request('/exchange',{}, {method:'POST',headers:{origin:'https://jansang18.github.io','content-type':'application/json'},body:{ticket,verifier:third.verifier,flow:third.flow}})).statusCode,400);
 assert.equal(h.minted.length,0);
});
test('invalid providers and rate-limited starts never request provider APIs',async()=>{
 const h=harness();assert.equal((await h.request('/start',{provider:'__proto__',flow:value(),challenge:value()})).statusCode,400);
 h.store.limit=async()=>false;
 assert.equal((await h.request('/start',{provider:'kakao',flow:value(),challenge:value()})).statusCode,429);assert.equal(h.calls.length,0);
});
