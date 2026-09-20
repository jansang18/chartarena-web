'use strict';
const {randomBytes,createHash,timingSafeEqual,createHmac}=require('node:crypto');
const providers={
 kakao:{authorize:'https://kauth.kakao.com/oauth/authorize',token:'https://kauth.kakao.com/oauth/token',profile:'https://kapi.kakao.com/v2/user/me'},
 naver:{authorize:'https://nid.naver.com/oauth2.0/authorize',token:'https://nid.naver.com/oauth2.0/token',profile:'https://openapi.naver.com/v1/nid/me'}
};
const validProvider=p=>p==='kakao'||p==='naver';
const random=()=>randomBytes(32).toString('base64url');
const hash=s=>createHash('sha256').update(s).digest('base64url');
const valid=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{43}$/.test(s);
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const cookieName='__Host-chartarena_oauth';
function cookie(value,age=600){return `${cookieName}=${value}; Path=/; Max-Age=${age}; Secure; HttpOnly; SameSite=Lax`;}
function readCookie(header){return String(header||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1)||'';}
function createHandler({config,store,mintToken,fetch:request=fetch,now=Date.now}){
 const app=new URL(config.appUrl),base=new URL(config.baseUrl);
 if(app.protocol!=='https:'||base.protocol!=='https:'||app.search||app.hash||base.search||base.hash)throw Error('HTTPS configuration required');
 const enabled=p=>validProvider(p)&&!!(config[p]?.id&&config[p]?.secret);
 const callbackUrl=p=>config.baseUrl.replace(/\/$/,'')+'/callback/'+p;
 const redirect=(res,values)=>res.redirect(303,config.appUrl+'#'+new URLSearchParams(values));
 const jsonError=(res,status,code)=>res.status(status).json({error:code});
 async function providerIdentity(provider,code,state){
  const p=providers[provider],credentials=config[provider];
  const body=new URLSearchParams({grant_type:'authorization_code',client_id:credentials.id,client_secret:credentials.secret,redirect_uri:callbackUrl(provider),code});
  if(provider==='naver')body.set('state',state);
  const tokenResponse=await request(p.token,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString(),signal:AbortSignal.timeout(10000),redirect:'error'});
  if(!tokenResponse.ok)throw Error('provider-token');
  const token=await tokenResponse.json();
  if(typeof token.access_token!=='string'||!token.access_token||token.error)throw Error('provider-token');
  const profileResponse=await request(p.profile,{headers:{Authorization:'Bearer '+token.access_token},signal:AbortSignal.timeout(10000),redirect:'error'});
  if(!profileResponse.ok)throw Error('provider-profile');
  const profile=await profileResponse.json();
  if(provider==='naver'&&profile.resultcode!=='00')throw Error('provider-profile');
  const id=provider==='kakao'?profile.id:profile.response?.id;
  if(!['number','string'].includes(typeof id)||!String(id).length||String(id).length>512)throw Error('provider-id');
  // Provider-verified subject only. Email addresses never merge unrelated accounts.
  return provider+':'+createHash('sha256').update(String(id)).digest('hex');
 }
 return async function handler(req,res){
  res.set('Cache-Control','no-store');res.set('Pragma','no-cache');res.set('Referrer-Policy','no-referrer');res.set('X-Content-Type-Options','nosniff');
  res.set('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'");
  const origin=req.headers.origin;
  if(origin===app.origin){res.set('Access-Control-Allow-Origin',app.origin);res.set('Vary','Origin');}
  if(req.method==='OPTIONS'){
   if(origin!==app.origin)return jsonError(res,403,'origin');
   res.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.set('Access-Control-Allow-Headers','Content-Type');return res.status(204).end();
  }
  if((req.rawBody?.length||0)>4096)return jsonError(res,413,'request-size');
  const q=req.query||{};
  try{
   if(req.path==='/config'&&req.method==='GET')return res.json({providers:{kakao:enabled('kakao'),naver:enabled('naver')}});
   if(req.path==='/start'&&req.method==='GET'){
    const {provider,challenge,flow}=q;
    if(!validProvider(provider)||!valid(challenge)||!valid(flow))return jsonError(res,400,'request');
    if(!enabled(provider))return jsonError(res,503,'not-configured');
    const key=createHmac('sha256',config[provider].secret).update(String(req.ip||req.socket?.remoteAddress||'unknown')).digest('hex');
    if(!await store.limit(key,now()))return jsonError(res,429,'rate-limit');
    const state=random(),nonce=random();
    await store.put('state-'+hash(state),{kind:'state',provider,challenge,flow,nonceHash:hash(nonce),expiresAt:now()+600000});
    res.set('Set-Cookie',cookie(nonce));
    const url=new URL(providers[provider].authorize);
    url.search=new URLSearchParams({response_type:'code',client_id:config[provider].id,redirect_uri:callbackUrl(provider),state}).toString();
    return res.redirect(303,url.href);
   }
   if(req.path.startsWith('/callback/')&&req.method==='GET'){
    const provider=req.path.slice('/callback/'.length),nonce=readCookie(req.headers.cookie);
    if(!validProvider(provider)||!valid(q.state)||!valid(nonce))return jsonError(res,400,'invalid-state');
    const pending=await store.take('state-'+hash(q.state),d=>d.kind==='state'&&d.provider===provider&&d.expiresAt>now()&&equal(d.nonceHash,hash(nonce)));
    if(!pending)return jsonError(res,400,'invalid-state');
    res.set('Set-Cookie',cookie('',0));
    if(q.error)return redirect(res,{social_error:'cancelled',flow:pending.flow});
    if(typeof q.code!=='string'||!q.code||q.code.length>4096)return redirect(res,{social_error:'failed',flow:pending.flow});
    try{
     const uid=await providerIdentity(provider,q.code,q.state),ticket=random();
     await store.put('ticket-'+hash(ticket),{kind:'ticket',uid,challenge:pending.challenge,flow:pending.flow,expiresAt:now()+120000});
     return redirect(res,{social_ticket:ticket,flow:pending.flow});
    }catch{return redirect(res,{social_error:'failed',flow:pending.flow});}
   }
   if(req.path==='/exchange'&&req.method==='POST'){
    if(origin!==app.origin)return jsonError(res,403,'origin');
    if(!String(req.headers['content-type']||'').startsWith('application/json'))return jsonError(res,415,'content-type');
    const {ticket,verifier,flow}=req.body||{};
    if(!valid(ticket)||!valid(verifier)||!valid(flow))return jsonError(res,400,'request');
    const record=await store.take('ticket-'+hash(ticket),d=>d.kind==='ticket'&&d.expiresAt>now()&&equal(d.challenge,hash(verifier))&&equal(d.flow,flow));
    if(!record)return jsonError(res,400,'invalid-ticket');
    const token=await mintToken(record.uid);
    return res.json({token});
   }
   return jsonError(res,404,'not-found');
  }catch{return jsonError(res,503,'unavailable');}
 };
}
module.exports={createHandler};
