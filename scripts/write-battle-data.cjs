const fs=require('node:fs'),crypto=require('node:crypto');
module.exports=function writeBattleData(charts){
 fs.mkdirSync('data/battle',{recursive:true});
 const index=charts.map(seg=>{
  const json=JSON.stringify(seg.cs),hash=crypto.createHash('sha256').update(json).digest('hex').slice(0,12),file=`data/battle/${seg.id}-${hash}.json`;
  fs.writeFileSync(file,json+'\n');
  const {cs,...meta}=seg;let travel=0,net=0,turns=0,last=0,steps=0;
  for(let i=5;i<seg.vis;i+=5){const d=(cs[i][3]-cs[i-5][3])/cs[i-5][3];if(d*last<0)turns++;travel+=Math.abs(d);net+=d;last=d;steps++;}
  meta.swing=travel?(turns/Math.max(1,steps-1))*(1-Math.min(1,Math.abs(net)/travel)):0;meta.file=file;return meta;
 });
 fs.writeFileSync('battle-charts.js','/* Real 300-bar histories; candles are loaded only when a round needs them. */\nwindow.BATTLE_CHARTS='+JSON.stringify(index)+';\n');
};
