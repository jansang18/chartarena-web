const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const C=require('../arena-characters.js');
test('legacy roster migration selects a valid new trader without changing wallet or ownership',()=>{
 const saved={gems:126,equip:{ch:'hu13',skin:'lux',title:'기존칭호'},owned:{char:['hu13'],upg:['hu13']},setup:true};
 const before=JSON.stringify(saved),choice=C.selection(saved);
 assert.ok(C.list.some(c=>c.id===choice.ch));assert.equal(choice.skin,'normal');
 assert.equal(JSON.stringify(saved),before);
});
test('previously equipped classic skins resolve to new traders without deleting ownership',()=>{
 const saved={rosterVersion:1,equip:{ch:'hu13',skin:'lux'},owned:{char:['hu13'],upg:['hu13']}};
 const before=JSON.stringify(saved);
 assert.deepEqual(C.selection(saved),{ch:'tr_rin',skin:'normal'});
 assert.equal(JSON.stringify(saved),before);
});
test('new trader selection persists, and missing legacy profiles have a playable default',()=>{
 for(const c of C.list)assert.deepEqual(C.selection({rosterVersion:1,equip:{ch:c.id}}),{ch:c.id,skin:'normal'});
 assert.ok(C.list.some(c=>c.id===C.selection(null).ch));
});
test('all five unique traders resolve to shipped PNG assets for lobby and battle',()=>{
 assert.equal(C.list.length,5);assert.equal(new Set(C.list.map(c=>c.id)).size,5);
 const images={hu0:'legacy.png'};C.register(images);assert.equal(images.hu0,'legacy.png');
 for(const c of C.list){assert.equal(images[c.id],c.image);const png=fs.readFileSync(c.image);assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(png[25],6);}
});
