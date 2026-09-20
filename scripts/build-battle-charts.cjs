/* Reproducible, contiguous historical windows. Never splice or synthesize bars. */
const fs=require('node:fs'),crypto=require('node:crypto');
const symbols=['BTC','ETH','BNB','SOL','XRP','DOGE','ADA','AVAX','LINK','DOT','LTC','BCH','UNI','ATOM','NEAR','APT','ARB','OP','SUI','SEI'];
const intervals=[['1m','1분봉',60000],['5m','5분봉',300000],['15m','15분봉',900000],['30m','30분봉',1800000],['1h','1시간봉',3600000]];
const cutoff=Date.parse('2026-09-18T00:00:00Z'),jobs=symbols.flatMap(s=>intervals.map(tf=>({s,tf}))),out=[],manifest=[];
async function get(url){for(let n=0;n<4;n++){const r=await fetch(url);if(r.ok)return r.json();if(r.status!==429&&r.status<500)throw Error(r.status+' '+url);await new Promise(r=>setTimeout(r,2000*(n+1)));}throw Error('Data retry exhausted');}
async function job({s,tf:[interval,label,ms]}){
 let end=cutoff-1,history=[];
 for(let batch=0;batch<15;batch++){
  const url=`https://data-api.binance.vision/api/v3/klines?symbol=${s}USDT&interval=${interval}&limit=1000&endTime=${end}`;
  const rows=await get(url);if(rows.length!==1000)throw Error('Incomplete history '+s);
  for(let i=1;i<rows.length;i++)if(rows[i][0]-rows[i-1][0]!==ms)throw Error('Non-contiguous history '+s);
  manifest.push({symbol:s+'USDT',interval,start:rows[0][0],end:rows.at(-1)[0],sha256:crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex')});
  history=rows.concat(history);
  end=rows[0][0]-1;
 }
 for(let i=1;i<history.length;i++)if(history[i][0]-history[i-1][0]!==ms)throw Error('Gap between requests');
 for(let start=0;start<history.length;start+=300){const slice=history.slice(start,start+300),base=Number(slice[0][1]);out.push({id:`${s}_${interval}_${slice[0][0]}`,sym:s,tf:label,source:'Binance public klines',startTime:slice[0][0],intervalMs:ms,vis:210,fut:90,cs:slice.map(r=>r.slice(1,5).map(v=>Number((Number(v)/base*100).toFixed(6))))});}
 console.log(s,interval,'50 non-overlapping windows');
}
(async()=>{let next=0;await Promise.all(Array.from({length:3},async()=>{while(next<jobs.length)await job(jobs[next++]);}));out.sort((a,b)=>a.id.localeCompare(b.id));manifest.sort((a,b)=>(a.symbol+a.interval+a.start).localeCompare(b.symbol+b.interval+b.start));require('./write-battle-data.cjs')(out);fs.writeFileSync('docs/battle-chart-sources.json',JSON.stringify({cutoff:new Date(cutoff).toISOString(),endpoint:'https://data-api.binance.vision/api/v3/klines',windows:out.length,history:210,future:90,requests:manifest},null,2)+'\n');console.log('Saved',out.length,'windows');})().catch(e=>{console.error(e);process.exitCode=1;});
