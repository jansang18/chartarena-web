const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function fixture(paused='0'){
 const listeners={},media={matches:false,addEventListener:(n,f)=>listeners.media=f};
 const img={src:'assets/traders/hyesu-v1.png',isConnected:true,addEventListener:(n,f)=>listeners[n]=f,getAttribute(){return this.src;},setAttribute(n,v){this[n]=v;}};
 const doc={hidden:false,readyState:'complete',body:{},querySelectorAll:()=>[img],addEventListener:(n,f)=>listeners[n]=f};
 let intersect,mutate;
 const win={ArenaCharacters:require('../arena-characters.js'),matchMedia:()=>media,navigator:{connection:{saveData:false}},localStorage:{getItem:key=>key==='chartarena-motion-paused'?paused:null},addEventListener(){},requestAnimationFrame:f=>{f();return 1;}};
 const context={window:win,document:doc,URL,Map,Set,IntersectionObserver:class{constructor(f){intersect=f;}observe(){}unobserve(){}},MutationObserver:class{constructor(f){mutate=f;}observe(){}}};
 vm.runInNewContext(fs.readFileSync('arena-motion.js','utf8'),context);
 return {img,doc,media,win,listeners,visible:(value)=>intersect([{target:img,isIntersecting:value}]),changed:()=>mutate([{type:'attributes',target:img,attributeName:'src'}])};
}
test('motion loads only on screen and returns to still when backgrounded or reduced',()=>{
 const f=fixture(); assert.match(f.img.src,/hyesu-v1.png$/);
 f.visible(true);assert.match(f.img.src,/hyesu-idle-v1.webp$/);
 f.doc.hidden=true;f.listeners.visibilitychange();assert.match(f.img.src,/hyesu-v1.png$/);
 f.doc.hidden=false;f.listeners.visibilitychange();assert.match(f.img.src,/hyesu-idle-v1.webp$/);
 f.media.matches=true;f.listeners.media();assert.match(f.img.src,/hyesu-v1.png$/);
});
test('character selection changes motion identity, failed assets stay on the selected PNG',()=>{
 const f=fixture(); f.visible(true);
 f.img.src='assets/traders/yuna-v1.png';f.changed();assert.match(f.img.src,/yuna-idle-v6.webp$/);
 f.listeners.error();assert.equal(f.img.src,'assets/traders/yuna-v1.png');
 f.visible(false);f.visible(true);assert.equal(f.img.src,'assets/traders/yuna-v1.png');
});
test('data saving does not request animated assets',()=>{
 const f=fixture();f.win.navigator.connection.saveData=true;f.visible(true);assert.match(f.img.src,/hyesu-v1.png$/);
});
test('legacy manual pause cannot prevent default motion after returning to the page',()=>{
 const f=fixture('1');f.visible(true);assert.match(f.img.src,/hyesu-idle-v1.webp$/);
 f.doc.hidden=true;f.listeners.visibilitychange();assert.match(f.img.src,/hyesu-v1.png$/);
 f.doc.hidden=false;f.listeners.visibilitychange();assert.match(f.img.src,/hyesu-idle-v1.webp$/);
 f.visible(false);f.visible(true);assert.match(f.img.src,/hyesu-idle-v1.webp$/);
});
