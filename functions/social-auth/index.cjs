'use strict';
const {onRequest}=require('firebase-functions/v2/https');
const {defineSecret,defineString}=require('firebase-functions/params');
const {initializeApp,getApps}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const {getFirestore,Timestamp}=require('firebase-admin/firestore');
const {createHandler}=require('./core.cjs');
const kakaoId=defineSecret('KAKAO_REST_API_KEY'),kakaoSecret=defineSecret('KAKAO_CLIENT_SECRET');
const naverId=defineSecret('NAVER_CLIENT_ID'),naverSecret=defineSecret('NAVER_CLIENT_SECRET');
const baseUrl=defineString('SOCIAL_AUTH_BASE_URL',{default:'https://asia-northeast3-chartarena-3051a.cloudfunctions.net/socialAuth'});
const appUrl=defineString('SOCIAL_AUTH_APP_URL',{default:'https://jansang18.github.io/chartarena-web/login.html'});
let handler;
exports.socialAuth=onRequest({region:'asia-northeast3',secrets:[kakaoId,kakaoSecret,naverId,naverSecret],minInstances:0,maxInstances:2,timeoutSeconds:45,memory:'256MiB'},async(req,res)=>{
 if(!handler){
  const app=getApps()[0]||initializeApp();
  // Dedicated, default-deny database. Never place auth tickets in the game's legacy public score database.
  const db=getFirestore(app,'chartarena-auth'),collection=db.collection('oauthEphemeral');
  const store={
   async put(id,data){await collection.doc(id).create({...data,expireAt:Timestamp.fromMillis(data.expiresAt)});},
   async take(id,check){return db.runTransaction(async tx=>{const ref=collection.doc(id),snap=await tx.get(ref);if(!snap.exists||!check(snap.data()))return null;tx.delete(ref);return snap.data();});},
   async limit(key,now){return db.runTransaction(async tx=>{const ref=collection.doc('rate-'+key),snap=await tx.get(ref),old=snap.data();const data=old&&old.expiresAt>now?old:{count:0,expiresAt:now+600000};if(data.count>=15)return false;tx.set(ref,{...data,count:data.count+1,expireAt:Timestamp.fromMillis(data.expiresAt)});return true;});}
  };
  handler=createHandler({config:{baseUrl:baseUrl.value(),appUrl:appUrl.value(),kakao:{id:kakaoId.value(),secret:kakaoSecret.value()},naver:{id:naverId.value(),secret:naverSecret.value()}},store,mintToken:uid=>getAuth(app).createCustomToken(uid)});
 }
 return handler(req,res);
});
