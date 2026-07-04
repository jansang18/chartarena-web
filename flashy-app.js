(function(){
"use strict";
var $=function(id){return document.getElementById(id);};
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
function toast(m){var t=$('toast');t.textContent=m;t.classList.add('show');setTimeout(function(){t.classList.remove('show');},1300);}

/* ---------------- nav ---------------- */
function go(v){
  document.querySelectorAll('.view').forEach(function(e){e.classList.remove('on');});
  $('v-'+v).classList.add('on');
  document.querySelectorAll('#nav div').forEach(function(d){d.classList.toggle('on',d.dataset.go===v);});
  document.querySelector('.body').scrollTop=0;
  if(v==='home')renderHome(); if(v==='game')renderGame(); if(v==='rank')renderRank(); if(v==='garage')renderGarage();
}
document.addEventListener('click',function(e){
  var g=e.target.closest('[data-go]'); if(g){go(g.dataset.go);return;}
  var t=e.target.closest('[data-toast]'); if(t){toast(t.dataset.toast+' — 데모');}
});

/* ---------------- shared cosmetic state ---------------- */
var EMO={bull:'🐂',bear:'🐻',shark:'🦈',tiger:'🐯',dragon:'🐲',king:'🤴',
  bike:'🚲',scooter:'🛵',car:'🚗',taxi:'🚕',sports:'🏎️',rocket:'🚀'};
var state={bal:25000, ch:'shark', car:'bike', title:''};

/* ---------------- HOME ---------------- */
function spark(seed,col){
  var n=18,pts=[],v=10,s=seed;
  for(var i=0;i<n;i++){s=(s*1103515245+12345)&0x7fffffff; v+=(s/0x7fffffff-0.42)*6; v=Math.max(2,Math.min(30,v)); pts.push(v);}
  var w=100,h=32,max=Math.max.apply(null,pts),min=Math.min.apply(null,pts);
  var xs=function(i){return i/(n-1)*w;},ys=function(p){return h-2-(p-min)/(max-min||1)*(h-6);};
  var line=pts.map(function(p,i){return (i?'L':'M')+xs(i).toFixed(1)+' '+ys(p).toFixed(1);}).join(' ');
  var g='g'+seed;
  return '<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><defs><linearGradient id="'+g+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+col+'" stop-opacity=".45"/><stop offset="1" stop-color="'+col+'" stop-opacity="0"/></linearGradient></defs><path d="'+line+' L'+w+' '+h+' L0 '+h+' Z" fill="url(#'+g+')"/><path d="'+line+'" fill="none" stroke="'+col+'" stroke-width="1.6" stroke-linejoin="round" style="filter:drop-shadow(0 0 3px '+col+')"/></svg>';
}
var RC=[{ic:'📈',col:'#35D07A',t:'주간 수익률',rk:'7위',d:'▲2',dc:'up',s:3},{ic:'🪙',col:'#4CA9FF',t:'주간 자산',rk:'16위',d:'—',dc:'fl',s:7},{ic:'🎯',col:'#FF5C8A',t:'주간 승률',rk:'8위',d:'▼1',dc:'dn',s:11}];
var homeAmtDone=false;
function renderHome(){
  $('rcards').innerHTML=RC.map(function(c){return '<div class="rc"><div class="ic" style="background:'+c.col+'22;border:1px solid '+c.col+'66;color:'+c.col+'">'+c.ic+'</div><div class="t">'+c.t+'</div><div class="rk">'+c.rk+'</div><div class="d '+c.dc+'">'+c.d+'</div>'+spark(c.s,c.col)+'</div>';}).join('');
  var _hc=document.querySelector('#v-home .ava .ch'); if(_hc)_hc.textContent=EMO[state.ch];
  var _hr=document.querySelector('#v-home .ava .car'); if(_hr)_hr.textContent=EMO[state.car];
  var el=$('hAmt');
  if(homeAmtDone||reduce){el.textContent='2,694 P';return;} homeAmtDone=true;
  var t0=null; el.textContent='0 P';
  (function step(t){if(!t0)t0=t;var k=Math.min(1,(t-t0)/900);var v=Math.round(2694*(1-Math.pow(1-k,3)));el.textContent=v.toLocaleString()+' P';if(k<1)requestAnimationFrame(step);})();
}

/* ---------------- GAME ---------------- */
var IND=[{k:'vol',l:'거래량',c:'#93A0BC',on:true},{k:'ma',l:'이평선',c:'#4CC3FF',on:true},{k:'boll',l:'볼린저',c:'#5AA9E6',on:true},{k:'rsi',l:'RSI',c:'#C9B458',on:true},{k:'macd',l:'MACD',c:'#4C8DF6',on:true},{k:'ichi',l:'일목',c:'#2BD4C4',on:false}];
var LEV=[1,2,3,5,10], WAG=[500,1000,2000,5000], STOP=[null,3,5,10], TAKE=[null,5,10,20], HOR=[5,10,30];
var GVIS=48, gSeed=12345;
var gsel={dir:null,lev:1,wag:1000,stop:null,take:null,hor:10}, gameBuilt=false, cd=2316, gPhase='bet', gReveal=48, gOutcome=null, revTimer=null;
function fmtStop(v){return v===null?'없음':v+'%';}
function buildGameControls(){
  $('indrow').innerHTML=IND.map(function(x){return '<div class="ichip'+(x.on?' on':'')+'" data-ik="'+x.k+'"><span class="dot" style="background:'+(x.on?x.c:'#5A6478')+'"></span>'+x.l+'</div>';}).join('');
  $('lev').innerHTML=LEV.map(function(v){return '<div class="chip'+(v>=10?' warn':'')+(gsel.lev===v?' on':'')+'" data-lev="'+v+'" style="flex:1">'+v+'배</div>';}).join('');
  $('wag').innerHTML=WAG.map(function(v){return '<div class="chip'+(gsel.wag===v?' on':'')+'" data-wag="'+v+'" style="flex:1">'+v.toLocaleString()+'</div>';}).join('');
  $('stop').innerHTML=STOP.map(function(v){return '<div class="chip'+(gsel.stop===v?' on':'')+'" data-stop="'+v+'" style="flex:1">'+fmtStop(v)+'</div>';}).join('');
  $('take').innerHTML=TAKE.map(function(v){return '<div class="chip'+(gsel.take===v?' on':'')+'" data-take="'+v+'" style="flex:1">'+fmtStop(v)+'</div>';}).join('');
  $('hor').innerHTML=HOR.map(function(v){return '<div class="chip'+(gsel.hor===v?' on':'')+'" data-hor="'+v+'" style="flex:1">'+v+'캔들</div>';}).join('');
  document.querySelectorAll('#v-game .dir').forEach(function(d){d.classList.toggle('on',gsel.dir===d.dataset.dir);});
  var st=$('subtxt'); st.textContent = gsel.dir===null?'방향을 선택하세요':(gsel.dir==='W'?'관망하고 결과 보기':'진입 · 채점 ▶');
  $('riskmsg').innerHTML = gsel.dir===null?'방향을 선택하면 리스크가 표시됩니다. 신중한 판단으로 전략을 완성하세요!'
    : gsel.dir==='W'?'관망: 포지션 없이 흐름을 지켜봅니다. <b style="color:var(--tprimary)">포인트 변동 없음.</b>'
    : '최대 손실 <b style="color:var(--pink)">-'+gsel.wag.toLocaleString()+'P</b> · 청산선 역방향 <b style="color:var(--tprimary)">'+(100/gsel.lev).toFixed(gsel.lev<10?1:0)+'%</b>';
}
document.addEventListener('click',function(e){
  if(e.target.closest('#again')){ resetGame(); return; }
  if(e.target.closest('#submit')){ submitGame(); return; }
  if(gPhase!=='bet') return;   // 베팅 단계에서만 컨트롤 반응
  var d=e.target.closest('#v-game .dir'); if(d){gsel.dir=d.dataset.dir; buildGameControls(); drawChart(); return;}
  var l=e.target.closest('[data-lev]'); if(l){gsel.lev=+l.dataset.lev; buildGameControls(); drawChart(); return;}
  var w=e.target.closest('[data-wag]'); if(w){gsel.wag=+w.dataset.wag; buildGameControls(); return;}
  var s=e.target.closest('[data-stop]'); if(s){gsel.stop=s.dataset.stop==='null'?null:+s.dataset.stop; buildGameControls(); drawChart(); return;}
  var tk=e.target.closest('[data-take]'); if(tk){gsel.take=tk.dataset.take==='null'?null:+tk.dataset.take; buildGameControls(); drawChart(); return;}
  var h=e.target.closest('[data-hor]'); if(h){gsel.hor=+h.dataset.hor; buildGameControls(); return;}
  var ic=e.target.closest('#v-game [data-ik]'); if(ic){var x=IND.find(function(z){return z.k===ic.dataset.ik;}); x.on=!x.on; buildGameControls(); drawChart(); return;}
});
var cdTimer=null;
function renderGame(){
  if(!gameBuilt){ buildGameControls(); gameBuilt=true; }
  var _b=document.querySelector('#v-game .bal .v'); if(_b)_b.textContent=state.bal.toLocaleString()+'P';
  drawChart();
  if(cdTimer)clearInterval(cdTimer);
  cdTimer=setInterval(function(){ if(gPhase==='bet' && $('v-game').classList.contains('on')){ cd=Math.max(0,cd-1); drawChart(); } },1000);
}
// deterministic candles
function gen(seed){
  var n=58,vis=48,s=seed,o=0.30,cs=[];
  var rnd=function(){s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff;};
  var p=0.30;
  for(var i=0;i<n;i++){var drift=i<28?-0.006:(i<40?-0.001:0.004);var op=p;p=Math.max(0.09,op+(rnd()-0.5)*0.02+drift);
    var hi=Math.max(op,p)+rnd()*0.008, lo=Math.min(op,p)-rnd()*0.008, vv=rnd()*0.7+0.3;
    cs.push([op,hi,lo,p,vv]);}
  return {cs:cs,vis:vis,n:n};
}
var GD=gen(gSeed);
function sma(cl,per,up){var out=[],sum=0;for(var i=0;i<up;i++){sum+=cl[i];if(i>=per)sum-=cl[i-per];out[i]=i>=per-1?sum/per:null;}return out;}
function drawChart(){
  var cv=$('chart'),ctx=cv.getContext('2d');var r=cv.getBoundingClientRect();if(r.width<2)return;
  var dpr=window.devicePixelRatio||1;cv.width=r.width*dpr;cv.height=r.height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
  var W=r.width,H=r.height;ctx.clearRect(0,0,W,H);
  var padL=6,axisW=46,plotR=W-axisW;
  var priceT=20,priceB=H*0.52,volT=H*0.55,volB=H*0.66,rsiT=H*0.70,rsiB=H*0.82,macdT=H*0.85,macdB=H-6;
  var cs=GD.cs,n=GD.n,vis=GD.vis,rev=gReveal,cw=(plotR-padL)/n,cx=function(i){return padL+cw*(i+0.5);};
  var cl=cs.map(function(c){return c[3];});
  var lo=1e9,hi=-1e9,vm=0;for(var i=0;i<rev;i++){if(cs[i][2]<lo)lo=cs[i][2];if(cs[i][1]>hi)hi=cs[i][1];if(cs[i][4]>vm)vm=cs[i][4];}
  var pad=(hi-lo)*0.12;lo-=pad;hi+=pad;var yOf=function(p){return priceB-(p-lo)/(hi-lo)*(priceB-priceT);};
  // grid + price axis
  ctx.font='9px '+getComputedStyle(document.body).fontFamily;ctx.textBaseline='middle';ctx.textAlign='left';
  for(var g=0;g<=4;g++){var yy=priceT+(priceB-priceT)*g/4,pr=hi-(hi-lo)*g/4;ctx.strokeStyle='rgba(30,44,70,.5)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(padL,yy);ctx.lineTo(plotR,yy);ctx.stroke();ctx.fillStyle='#6b7a96';ctx.fillText(pr.toFixed(4),plotR+4,yy);}
  // hidden future zone (revealed edge)
  if(rev<n){ var sx=cx(rev)-cw/2;
    ctx.fillStyle='rgba(233,185,73,.06)';ctx.fillRect(sx,priceT,plotR-sx,macdB-priceT);
    ctx.strokeStyle='rgba(233,185,73,.5)';ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(sx,priceT);ctx.lineTo(sx,macdB);ctx.stroke();ctx.setLineDash([]);
    if(gPhase==='bet'){ ctx.fillStyle='#E9B949';ctx.textAlign='right';ctx.fillText('미래 예측 구간',plotR-2,priceT+2);
      var hrs=Math.floor(cd/3600),mn=Math.floor(cd%3600/60),sc=cd%60;
      ctx.fillStyle='#93A0BC';ctx.fillText('⏱ '+hrs+':'+('0'+mn).slice(-2)+':'+('0'+sc).slice(-2),plotR-2,priceT+14); } }
  // bollinger
  var glow=function(col,w,fn){ctx.strokeStyle=col;ctx.lineWidth=w;ctx.shadowColor=col;ctx.shadowBlur=6;ctx.beginPath();fn();ctx.stroke();ctx.shadowBlur=0;};
  if(IND.find(function(x){return x.k==='boll';}).on){
    var mid=sma(cl,20,rev),bu=[],bl=[];
    for(var i=0;i<rev;i++){if(mid[i]==null){bu[i]=bl[i]=null;continue;}var ss=0;for(var j=i-19;j<=i;j++)ss+=Math.pow(cl[j]-mid[i],2);var sd=Math.sqrt(ss/20);bu[i]=mid[i]+2*sd;bl[i]=mid[i]-2*sd;}
    ctx.strokeStyle='rgba(90,169,230,.5)';ctx.lineWidth=1;
    [bu,bl].forEach(function(arr){ctx.beginPath();var st=false;for(var i=0;i<rev;i++){if(arr[i]==null)continue;var x=cx(i),y=yOf(arr[i]);if(!st){ctx.moveTo(x,y);st=true;}else ctx.lineTo(x,y);}ctx.stroke();});
  }
  // MA glow lines
  if(IND.find(function(x){return x.k==='ma';}).on){
    [[5,'#FFD54A'],[20,'#4CC3FF'],[60,'#B980FF'],[200,'#FF8FB0']].forEach(function(m){
      var a=sma(cl,m[0],rev);glow(m[1],1.4,function(){var st=false;for(var i=0;i<rev;i++){if(a[i]==null)continue;var x=cx(i),y=yOf(a[i]);if(!st){ctx.moveTo(x,y);st=true;}else ctx.lineTo(x,y);}});
    });
  }
  // volume
  if(IND.find(function(x){return x.k==='vol';}).on){for(var i=0;i<rev;i++){var c=cs[i],up=c[3]>=c[0];ctx.fillStyle=up?'rgba(240,97,109,.55)':'rgba(76,141,246,.55)';var bw=Math.max(1.4,cw*0.6);var vh=(c[4]/vm)*(volB-volT);ctx.fillRect(cx(i)-bw/2,volB-vh,bw,vh);}ctx.fillStyle='#6b7a96';ctx.textAlign='left';ctx.fillText('거래량',padL+2,volT+2);}
  // candles (gradient + subtle glow)
  for(var i=0;i<rev;i++){var c=cs[i],up=c[3]>=c[0],col=up?'#F0616D':'#4C8DF6';var x=cx(i);
    ctx.strokeStyle=col;ctx.lineWidth=1;ctx.shadowColor=col;ctx.shadowBlur=3;ctx.beginPath();ctx.moveTo(x,yOf(c[1]));ctx.lineTo(x,yOf(c[2]));ctx.stroke();ctx.shadowBlur=0;
    var bw=Math.max(2,cw*0.62),yo=yOf(c[0]),yc=yOf(c[3]),top=Math.min(yo,yc),bh=Math.max(1.5,Math.abs(yc-yo));
    var gr=ctx.createLinearGradient(0,top,0,top+bh);gr.addColorStop(0,up?'#F9899A':'#7EB0FF');gr.addColorStop(1,col);ctx.fillStyle=gr;ctx.fillRect(x-bw/2,top,bw,bh);}
  // MA legend
  ctx.textAlign='left';ctx.font='9px '+getComputedStyle(document.body).fontFamily;
  var lx=padL+2,ly=priceB-11,leg=[['MA5','#FFD54A'],['20','#4CC3FF'],['60','#B980FF'],['200','#FF8FB0'],['BB','#5AA9E6']];
  leg.forEach(function(t){ctx.fillStyle=t[1];ctx.fillText(t[0],lx,ly);lx+=ctx.measureText(t[0]).width+7;});
  // 난이도
  ctx.fillStyle='#B266FF';ctx.textAlign='left';ctx.fillText('난이도 ◆◆◆◆◆',padL+2,priceT+2);
  // entry line + tag
  var entry=cs[vis-1][3],ey=yOf(entry),ex=cx(vis-1);
  ctx.strokeStyle='rgba(233,185,73,.6)';ctx.setLineDash([4,3]);ctx.beginPath();ctx.moveTo(padL,ey);ctx.lineTo(plotR,ey);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#E9B949';roundRect(ctx,plotR-58,ey-8,56,16,4);ctx.fill();ctx.fillStyle='#080B14';ctx.textAlign='left';ctx.fillText('진입 '+entry.toFixed(4),plotR-54,ey);
  // 베팅 단계: 예측선 + 손절/익절 미리보기
  if(gPhase==='bet'){
    glow('#35D07A',1.4,function(){ctx.moveTo(ex,ey);ctx.lineTo(cx(vis+4),ey-30);ctx.lineTo(cx(vis+9),ey-52);});
    ctx.setLineDash([3,3]);glow('#F0616D',1.2,function(){ctx.moveTo(ex,ey);ctx.lineTo(cx(vis+5),ey+22);ctx.lineTo(cx(vis+9),ey+46);});ctx.setLineDash([]);
    if(gsel.dir&&gsel.dir!=='W'){ var lng=gsel.dir==='L',liq=100/gsel.lev,eff=Math.min(gsel.stop==null?1e9:gsel.stop,liq);
      var sp=lng?entry*(1-eff/100):entry*(1+eff/100), isLiq=gsel.stop==null||gsel.stop>=liq;
      if(sp>lo&&sp<hi){ ctx.strokeStyle='#E5484D';ctx.setLineDash([4,3]);ctx.beginPath();ctx.moveTo(padL,yOf(sp));ctx.lineTo(plotR,yOf(sp));ctx.stroke();ctx.setLineDash([]);
        ctx.fillStyle='#E5484D';roundRect(ctx,plotR-58,yOf(sp)-8,56,16,4);ctx.fill();ctx.fillStyle='#fff';ctx.textAlign='left';ctx.fillText((isLiq?'청산 ':'손절 ')+sp.toFixed(4),plotR-54,yOf(sp)); }
      if(gsel.take){ var tp=lng?entry*(1+gsel.take/100):entry*(1-gsel.take/100); if(tp>lo&&tp<hi){ ctx.strokeStyle='#35C46A';ctx.setLineDash([4,3]);ctx.beginPath();ctx.moveTo(padL,yOf(tp));ctx.lineTo(plotR,yOf(tp));ctx.stroke();ctx.setLineDash([]);
        ctx.fillStyle='#35C46A';roundRect(ctx,plotR-58,yOf(tp)-8,56,16,4);ctx.fill();ctx.fillStyle='#062';ctx.textAlign='left';ctx.fillText('익절 '+tp.toFixed(4),plotR-54,yOf(tp)); } } }
  }
  // 결과: 종료 지점 마커
  if(gPhase==='result'&&gOutcome&&gOutcome.dir!=='W'){ var oy=yOf(gOutcome.exit),oxi=vis-1+gOutcome.off;
    ctx.strokeStyle=gOutcome.points>=0?'#35C46A':'#E5484D';ctx.setLineDash([4,3]);ctx.beginPath();ctx.moveTo(padL,oy);ctx.lineTo(plotR,oy);ctx.stroke();ctx.setLineDash([]);
    var ox=cx(Math.min(oxi,n-1));ctx.fillStyle=gOutcome.points>=0?'#35C46A':'#E5484D';ctx.beginPath();ctx.arc(ox,oy,4,0,6.3);ctx.fill(); }
  // RSI
  if(IND.find(function(x){return x.k==='rsi';}).on){var rsiv=rsi(cl,14,rev);ctx.setLineDash([3,3]);ctx.strokeStyle='rgba(229,72,77,.35)';ctx.beginPath();ctx.moveTo(padL,rsiT+ (rsiB-rsiT)*0.3);ctx.lineTo(plotR,rsiT+(rsiB-rsiT)*0.3);ctx.stroke();ctx.strokeStyle='rgba(53,208,122,.35)';ctx.beginPath();ctx.moveTo(padL,rsiT+(rsiB-rsiT)*0.7);ctx.lineTo(plotR,rsiT+(rsiB-rsiT)*0.7);ctx.stroke();ctx.setLineDash([]);
    glow('#C9B458',1.3,function(){var st=false;for(var i=0;i<rev;i++){if(rsiv[i]==null)continue;var x=cx(i),y=rsiB-(rsiv[i]/100)*(rsiB-rsiT);if(!st){ctx.moveTo(x,y);st=true;}else ctx.lineTo(x,y);}});
    ctx.fillStyle='#6b7a96';ctx.textAlign='left';ctx.fillText('RSI 14',padL+2,rsiT+2);ctx.textAlign='left';ctx.fillText('70',plotR+4,rsiT+(rsiB-rsiT)*0.3);ctx.fillText('30',plotR+4,rsiT+(rsiB-rsiT)*0.7);}
  // MACD
  if(IND.find(function(x){return x.k==='macd';}).on){var mc=macd(cl,rev),mid=(macdT+macdB)/2,mm=1e-9;for(var i=0;i<rev;i++){[mc.m[i],mc.s[i],mc.h[i]].forEach(function(v){if(v!=null&&Math.abs(v)>mm)mm=Math.abs(v);});}
    var my=function(v){return mid-(v/mm)*((macdB-macdT)/2*0.8);};
    for(var i=0;i<rev;i++){if(mc.h[i]==null)continue;var x=cx(i),bw=Math.max(1.4,cw*0.6);ctx.fillStyle=mc.h[i]>=0?'rgba(53,208,122,.6)':'rgba(240,97,109,.6)';var y0=my(0),y1=my(mc.h[i]);ctx.fillRect(x-bw/2,Math.min(y0,y1),bw,Math.max(1,Math.abs(y1-y0)));}
    glow('#4C8DF6',1.2,function(){var st=false;for(var i=0;i<rev;i++){if(mc.m[i]==null)continue;var x=cx(i),y=my(mc.m[i]);if(!st){ctx.moveTo(x,y);st=true;}else ctx.lineTo(x,y);}});
    glow('#FF9A3C',1.2,function(){var st=false;for(var i=0;i<rev;i++){if(mc.s[i]==null)continue;var x=cx(i),y=my(mc.s[i]);if(!st){ctx.moveTo(x,y);st=true;}else ctx.lineTo(x,y);}});
    ctx.fillStyle='#6b7a96';ctx.textAlign='left';ctx.fillText('MACD 12·26·9',padL+2,macdT+2);}
}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function ema(v,p){var out=[],k=2/(p+1),prev=0;if(v.length<p)return v.map(function(){return null;});for(var i=0;i<p;i++)prev+=v[i];prev/=p;for(var i=0;i<v.length;i++){if(i<p-1){out[i]=null;}else if(i===p-1){out[i]=prev;}else{prev=(v[i]-prev)*k+prev;out[i]=prev;}}return out;}
function rsi(cl,p,up){var out=[],g=0,l=0;if(up<=p)return out;for(var i=1;i<=p;i++){var c=cl[i]-cl[i-1];if(c>=0)g+=c;else l-=c;}var ag=g/p,al=l/p;out[p]=al===0?100:100-100/(1+ag/al);for(var i=p+1;i<up;i++){var c=cl[i]-cl[i-1];ag=(ag*(p-1)+(c>0?c:0))/p;al=(al*(p-1)+(c<0?-c:0))/p;out[i]=al===0?100:100-100/(1+ag/al);}return out;}
function macd(v,up){var ef=ema(v.slice(0,up),12),es=ema(v.slice(0,up),26),m=[],s2,h=[];for(var i=0;i<up;i++)m[i]=(ef[i]!=null&&es[i]!=null)?ef[i]-es[i]:null;var first=m.findIndex(function(x){return x!=null;});var sig=[];if(first>=0){var comp=m.slice(first).map(function(x){return x==null?0:x;});var e=ema(comp,9);for(var j=0;j<e.length;j++)sig[first+j]=e[j];}for(var i=0;i<up;i++)h[i]=(m[i]!=null&&sig[i]!=null)?m[i]-sig[i]:null;return {m:m,s:sig,h:h};}

/* ---- 게임 진행(제출→미래 공개→손익 결과) ---- */
function evalGame(){
  var cs=GD.cs,entry=cs[GVIS-1][3],avail=GD.n-GVIS,hz=Math.min(gsel.hor,avail),exitIdx=Math.min(GVIS-1+hz,GD.n-1);
  if(gsel.dir==='W') return {dir:'W',reason:'관망',points:0,raw:0,lev:0,exit:cs[exitIdx][3],entry:entry,hz:hz,off:hz};
  var long=gsel.dir==='L',lev=gsel.lev,liq=100/lev,userStop=gsel.stop,effStop=Math.min(userStop==null?1e9:userStop,liq),stopIsLiq=userStop==null||userStop>=liq;
  var sp=long?entry*(1-effStop/100):entry*(1+effStop/100),tp=gsel.take?(long?entry*(1+gsel.take/100):entry*(1-gsel.take/100)):null;
  var exit=cs[exitIdx][3],reason='기간 종료',hitStop=false,hitTake=false,off=hz;
  for(var k=0;k<hz;k++){var c=cs[GVIS+k];if(!c)break;var adv=long?c[2]<=sp:c[1]>=sp,fav=tp!=null&&(long?c[1]>=tp:c[2]<=tp);
    if(adv){exit=sp;reason=stopIsLiq?'청산 💥':'손절';hitStop=true;off=k+1;break;}
    if(fav){exit=tp;reason='익절';hitTake=true;off=k+1;break;}}
  var sign=long?1:-1,raw=sign*(exit-entry)/entry*100,lr=Math.max(-100,raw*lev),points=Math.round(gsel.wag*lr/100);
  return {dir:gsel.dir,reason:reason,points:points,raw:raw,lev:lr,exit:exit,entry:entry,hz:hz,off:off,hitStop:hitStop,hitTake:hitTake};
}
function submitGame(){
  if(gPhase!=='bet') return;
  if(gsel.dir===null){ toast('방향을 먼저 선택하세요'); return; }
  gOutcome=evalGame(); gPhase='reveal';
  var target=GVIS+Math.min(gsel.hor,GD.n-GVIS);
  if(reduce){ gReveal=target; finishGame(); return; }
  if(revTimer)clearInterval(revTimer);
  revTimer=setInterval(function(){ gReveal++; drawChart(); if(gReveal>=target){ clearInterval(revTimer); finishGame(); } },70);
}
function finishGame(){
  gPhase='result'; var o=gOutcome; state.bal=Math.max(0,state.bal+o.points);
  var bv=document.querySelector('#v-game .bal .v'); if(bv)bv.textContent=state.bal.toLocaleString()+'P';
  drawChart();
  $('betpane').style.display='none'; var rp=$('respane'); rp.style.display='block';
  var col=o.points>0?'var(--green)':(o.points<0?'var(--pink)':'var(--tsec)');
  rp.innerHTML='<div class="rescard">'
    +'<div style="display:flex;align-items:flex-end;justify-content:space-between">'
      +'<div><div style="color:var(--tsec);font-size:12px">'+(o.dir==='W'?'관망 결과':'손익')+'</div>'
      +'<div style="font-family:var(--mono);font-weight:900;font-size:32px;color:'+col+'">'+(o.points>=0?'+':'')+o.points.toLocaleString()+' P</div></div>'
      +(o.dir!=='W'?'<div style="text-align:right"><div style="color:var(--tsec);font-size:11px">레버리지 수익률</div><div style="font-family:var(--mono);font-weight:800;font-size:18px;color:'+col+'">'+(o.lev>=0?'+':'')+o.lev.toFixed(2)+'%</div></div>':'')
    +'</div>'
    +'<div style="margin-top:10px;color:var(--gold);font-weight:700;font-size:13px">종료: '+o.reason+'</div>'
    +'<div style="color:var(--tsec);font-size:12px;margin-top:2px;font-family:var(--mono)">진입 '+o.entry.toFixed(4)+' → 종료 '+o.exit.toFixed(4)+' ('+o.off+'캔들)</div>'
    +'<button class="goldbtn" id="again" type="button" style="margin-top:14px">다음 문제 ▶</button></div>';
}
function resetGame(){
  gSeed=(gSeed+7777)&0x7fffffff; GD=gen(gSeed);
  gPhase='bet'; gReveal=GVIS; gsel.dir=null; gOutcome=null; cd=1800+(gSeed%3000);
  $('respane').style.display='none'; $('betpane').style.display='block';
  buildGameControls(); drawChart();
}

/* ---------------- RANKING ---------------- */
var PER=[['day','일간'],['week','주간'],['month','월간']], MET=[['ret','수익률'],['assets','자산'],['win','승률']];
var rp='day',rm='ret';
var BN=['존버왕','숏충이','불장러','캔들도사','존리형','물타기장인','추매요정','매수의신','청산킹','우상향고고','따상가자','칼손절'];
var BCH=['🤴','🐲','🐯','🦈','🐻','🐂','🦈','🐻','🐲','🐯','🐂','🐻'],BCA=['🚀','🏎️','🚕','🚗','🛵','🚗','🛵','🚲','🚕','🏎️','🚗','🛵'],BT=['🐋 고래','전설의 트레이더','청산 마스터','존버의 신','','개미','','','청산 마스터','존버의 신','',''];
var BR=[24,19,31,-8,15,12,22,-3,9,17,5,-12],BW=[64,58,71,44,60,55,67,48,53,62,50,41],BA=[520,410,360,300,265,235,205,180,160,140,120,104];
function rmul(p){return p==='day'?1:p==='week'?2.4:5.1;} function amul(p){return p==='day'?1:p==='week'?3.2:9.5;}
function build(){
  var rows=BN.map(function(n,i){return {n:n,ch:BCH[i],ca:BCA[i],t:BT[i],ret:+(BR[i]*rmul(rp)).toFixed(1),assets:Math.round(BA[i]*1000*amul(rp)),win:BW[i],me:false};});
  rows.push({n:'차트고수',ch:EMO[state.ch],ca:EMO[state.car],t:state.title,ret:+(15.5*rmul(rp)).toFixed(1),assets:state.bal,win:57,me:true});
  rows.sort(function(a,b){return b[rm]-a[rm];});return rows;
}
function mv(e){return rm==='ret'?(e.ret>=0?'+':'')+e.ret.toFixed(1)+'%':rm==='assets'?kf(e.assets)+'P':e.win+'%';}
function mc(e){return rm==='ret'?(e.ret>=0?'up':'dn'):'';}
function kf(v){return v>=100000?Math.round(v/1000)+'K':v>=10000?(v/1000).toFixed(1)+'K':v.toLocaleString();}
function sub(e){var a=[];if(rm!=='ret')a.push('수익 '+(e.ret>=0?'+':'')+e.ret.toFixed(1)+'%');if(rm!=='assets')a.push('자산 '+kf(e.assets)+'P');if(rm!=='win')a.push('승률 '+e.win+'%');return a.join(' · ');}
function renderRank(){
  $('pTabs').innerHTML=PER.map(function(p){return '<div class="chip'+(rp===p[0]?' on':'')+'" data-per="'+p[0]+'" style="flex:1;padding:9px 0">'+p[1]+'</div>';}).join('');
  $('mTabs').innerHTML=MET.map(function(m){return '<div class="ichip'+(rm===m[0]?' on':'')+'" data-met="'+m[0]+'" style="flex:1;text-align:center;padding:7px 0">'+m[1]+'</div>';}).join('');
  var L=build();
  $('podium').innerHTML=[[1,'🥈','p2'],[0,'🥇','p1'],[2,'🥉','p3']].map(function(o){var e=L[o[0]];return '<div class="ped '+o[2]+'"><div class="med">'+o[1]+'</div><div class="pav">'+e.ch+'</div><div class="pcar">'+e.ca+'</div><div class="pn" style="'+(e.me?'color:var(--gold)':'')+'">'+e.n+'</div>'+(e.t?'<div style="font-size:8px;color:var(--gold)">'+e.t+'</div>':'')+'<div class="ps '+mc(e)+'">'+mv(e)+'</div></div>';}).join('');
  $('rlist').innerHTML=L.slice(3).map(function(e,i){return '<div class="rrow'+(e.me?' me':'')+'"><div class="rk">'+(i+4)+'</div><div class="rav">'+e.ch+'</div><div class="rn"><div class="n">'+e.n+' '+e.ca+(e.t?' · <span style="color:var(--gold)">'+e.t+'</span>':'')+'</div><div class="s">'+sub(e)+'</div></div><div class="rv '+mc(e)+'">'+mv(e)+'</div></div>';}).join('');
}
document.addEventListener('click',function(e){var p=e.target.closest('[data-per]');if(p){rp=p.dataset.per;renderRank();}var m=e.target.closest('[data-met]');if(m){rm=m.dataset.met;renderRank();}});

/* ---------------- GARAGE ---------------- */
var ITEMS={char:[['bull','🐂','황소',0],['bear','🐻','곰',3000],['shark','🦈','상어',8000],['tiger','🐯','호랑이',15000],['dragon','🐲','드래곤',35000],['king','🤴','킹',80000]],
  car:[['bike','🚲','자전거',0],['scooter','🛵','스쿠터',2500],['car','🚗','경차',7000],['taxi','🚕','세단',16000],['sports','🏎️','스포츠카',40000],['rocket','🚀','슈퍼카',90000]],
  title:[['','—','없음',0],['개미','개미','개미 트레이더',2000],['존버의 신','존버의 신','존버의 신',12000],['청산 마스터','청산 마스터','청산 마스터',22000],['🐋 고래','🐋 고래','고래',60000],['전설의 트레이더','전설의 트레이더','전설',120000]]};
var owned={char:{bull:1,shark:1},car:{bike:1},title:{'':1}}, gcat='char';
function rar(p){return p===0?['기본','#5A6478']:p<5000?['일반','#9AA7BD']:p<15000?['레어','#4CC3FF']:p<45000?['에픽','#B980FF']:['전설','#E9B949'];}
function renderGarage(){
  $('gAmt').textContent=state.bal.toLocaleString()+' P';
  $('gvCh').textContent=EMO[state.ch];$('gvCar').textContent=EMO[state.car];
  $('gvTitle').textContent=state.title?('👑 '+state.title):'';
  var CN=[['char','캐릭터'],['car','자동차'],['title','칭호']];
  $('catbar').innerHTML=CN.map(function(c){return '<div class="ichip'+(gcat===c[0]?' on':'')+'" data-cat="'+c[0]+'" style="flex:1;text-align:center;padding:8px 0">'+c[1]+'</div>';}).join('');
  $('shop').innerHTML=ITEMS[gcat].map(function(it){var id=it[0],em=it[1],nm=it[2],pr=it[3];var isOwn=owned[gcat][id],isEq=(gcat==='char'?state.ch:gcat==='car'?state.car:state.title)===id;var rr=rar(pr);
    var st=isEq?'<div class="st" style="background:var(--gold);color:#111">장착중</div>':isOwn?'<div class="st" style="background:rgba(53,208,122,.2);color:#35D07A">보유</div>':'';
    var price=pr===0?'<div class="pr" style="color:var(--tsec)">기본</div>':isOwn?'<div class="pr" style="color:var(--tsec)">보유</div>':'<div class="pr">'+pr.toLocaleString()+' P</div>';
    var emh=gcat==='title'?'<div class="em tx" style="color:'+rr[1]+'">'+(id===''?'—':em)+'</div>':'<div class="em">'+em+'</div>';
    return '<div class="item" data-id="'+id+'" style="border-color:'+(isEq?'var(--gold)':rr[1]+'66')+';box-shadow:'+(isEq?'0 0 18px -6px '+rr[1]:'none')+'">'+st+emh+'<div class="nm">'+nm+'</div><div class="rr" style="color:'+rr[1]+'">'+rr[0]+'</div>'+price+'</div>';}).join('');
}
document.addEventListener('click',function(e){
  var c=e.target.closest('[data-cat]');if(c){gcat=c.dataset.cat;renderGarage();return;}
  var it=e.target.closest('#shop .item');if(!it)return;var id=it.dataset.id;var row=ITEMS[gcat].find(function(x){return x[0]===id;});var pr=row[3];
  if(owned[gcat][id]){equip(id);toast(row[2]+' 장착!');}
  else if(state.bal>=pr){state.bal-=pr;owned[gcat][id]=1;equip(id);toast('🛒 '+row[2]+' 구매 & 장착!');}
  else toast('자산 부족 ('+(pr-state.bal).toLocaleString()+'P 모자람)');
  renderGarage();
});
function equip(id){if(gcat==='char')state.ch=id;else if(gcat==='car')state.car=id;else state.title=id;}

/* ---------------- starfield bg ---------------- */
var cv=$('bg'),ctx=cv.getContext('2d'),W=0,H=0,stars=[],candles=[];
function resize(){var r=cv.getBoundingClientRect(),dpr=window.devicePixelRatio||1;W=r.width;H=r.height;cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
  stars=[];for(var i=0;i<64;i++)stars.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.4+.3,p:Math.random()*6.28,sp:Math.random()*.03+.005,c:Math.random()<.25?'#4CA9FF':(Math.random()<.4?'#E9B949':'#9fb4d8')});
}
function frame(){ctx.clearRect(0,0,W,H);var g=ctx.createRadialGradient(W*0.5,-40,10,W*0.5,-40,W*0.9);g.addColorStop(0,'rgba(233,185,73,.08)');g.addColorStop(1,'rgba(233,185,73,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  for(var i=0;i<stars.length;i++){var s=stars[i];if(!reduce)s.p+=s.sp;var a=.3+Math.abs(Math.sin(s.p))*.6;ctx.globalAlpha=a;ctx.fillStyle=s.c;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,6.3);ctx.fill();if(s.r>1){ctx.globalAlpha=a*.4;ctx.beginPath();ctx.arc(s.x,s.y,s.r*2.4,0,6.3);ctx.fill();}}ctx.globalAlpha=1;
  if(!reduce)requestAnimationFrame(frame);}
resize();frame();if(reduce)frame();
window.addEventListener('resize',function(){resize();if(reduce)frame();drawChart();});

renderHome();
})();
