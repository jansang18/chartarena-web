const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../arena-characters.js');
const home=fs.readFileSync('landscape.html','utf8'),battle=fs.readFileSync('quiz-battle.html','utf8');
test('old equipped ids render new artwork in footer, guild and matchmaking without altering ownership',()=>{
 const nodes={},ctx={ArenaCharacters:C,myChImg:C.get('tr_doyun').image,esc:String,$:id=>nodes[id]||=( {} )};
 vm.createContext(ctx);
 for(const name of ['charImg','gAva'])vm.runInContext(home.match(new RegExp('function '+name+'\\([^\\n]+'))[0],ctx);
 const from=battle.indexOf('function renderWait('),to=battle.indexOf('var mmAttempt=',from);
 vm.runInContext(battle.slice(from,to),ctx);
 ctx.renderWait([{ch:'hu13',nick:'old'},{ch:'hu0',nick:'me',me:true}],4,'매칭');
 assert.equal(ctx.charImg('hu13','lux'),C.get('tr_rin').image);
 assert.match(ctx.gAva('hu13'),/assets\/traders\/royal\/narin-v2.png/);
 assert.equal((nodes.lwplayers.innerHTML.match(/assets\/traders\//g)||[]).length,4);
 assert.doesNotMatch(nodes.lwplayers.innerHTML,/assets\/hux?\d/);
 assert.doesNotMatch(home,/기존 컬렉션/);
});
test('home and battle entry use the same ten current loading portraits with no old background',()=>{
 for(const page of [home,battle]){
  const intro=page.slice(page.indexOf('<div id="splash"'),page.indexOf('</div>\n</div>',page.indexOf('<div id="splash"')));
  for(const c of C.list)assert.ok(intro.includes(c.image));
  assert.doesNotMatch(page,/assets\/loading_bg/);
 }
});
