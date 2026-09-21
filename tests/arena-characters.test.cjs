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
 assert.deepEqual(C.selection(saved),{ch:'tr_narin',skin:'normal'});
 assert.equal(JSON.stringify(saved),before);
});
test('new trader selection persists, and missing legacy profiles have a playable default',()=>{
 for(const c of C.list)assert.deepEqual(C.selection({rosterVersion:1,equip:{ch:c.id}}),{ch:c.id,skin:'normal'});
 assert.ok(C.list.some(c=>c.id===C.selection(null).ch));
});
test('all ten selectable traders resolve to shipped transparent PNG assets',()=>{
 assert.equal(C.list.length,10);assert.equal(new Set(C.list.map(c=>c.id)).size,10);
 const images={hu0:'legacy.png'};C.register(images);assert.equal(images.hu0,'legacy.png');
 for(const c of C.list){assert.equal(images[c.id],c.image);const png=fs.readFileSync(c.image);assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(png[25],6);}
});
test('retired selections migrate to current portraits without changing saved currencies or ownership',()=>{
 const aliases={tr_seon:'tr_sera',tr_yuna:'tr_chaerin',tr_kai:'tr_taeo',tr_rin:'tr_narin',tr_doyun:'tr_jihan'};
 for(const [oldId,newId] of Object.entries(aliases)){
  const saved={gems:622,balance:35000,equip:{ch:oldId,skin:'lux'},owned:{char:[oldId],upg:[oldId]},setup:true};
  const before=JSON.stringify(saved);
  assert.deepEqual(C.selection(saved),{ch:newId,skin:'normal'});
  assert.equal(C.get(oldId).id,newId);
  assert.equal(JSON.stringify(saved),before);
 }
});
test('new characters have the same skill behavior as their migrated predecessors',()=>{
 const R=require('../battle-rules.js');
 const skills={tr_sera:'boost',tr_narin:'steady',tr_chaerin:'redesign',tr_sia:'neutral',tr_arin:'defense',tr_taeo:'defense',tr_ijun:'redesign',tr_jihan:'neutral',tr_ryujin:'boost',tr_mujin:'steady'};
 for(const [id,kind] of Object.entries(skills)){
  assert.equal(C.get(id).id,id);
  const player=R.create('me','standard',100000,id);
  assert.equal(player.character,id);
  const choice=R.activateSkill(player,{dir:'L',lev:2},30,1,5);
  assert.equal(choice.skill.kind,kind);
 }
});
