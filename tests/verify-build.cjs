const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const files=['index.html','landscape.html','game.html','quiz-battle.html','puzzle.html','learn.html'];
let count=0;
for(const file of files){
  const html=fs.readFileSync(file,'utf8');
  for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
    if(!/\bsrc\s*=/.test(m[1])){ new vm.Script(m[2],{filename:file}); count++; }
  }
  const markup=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  for(const m of markup.matchAll(/(?:src|href)="((?:assets\/)[^"<>]+)"/g)){
    assert.ok(fs.existsSync(m[1].split('?')[0]),`${file}: missing ${m[1]}`);
  }
  assert.ok(html.includes('app-shell.css?v=1')&&html.includes('app-shell.js?v=1'),file+' missing common shell');
}
assert.equal(fs.readFileSync('index.html','utf8'),fs.readFileSync('landscape.html','utf8'));
const battle=fs.readFileSync('quiz-battle.html','utf8');
assert.doesNotMatch(battle,/1v1|mode1v1|function (?:setupDuel|finishDuelRound|duelEnd|showAnteScreen)/);
new vm.Script(fs.readFileSync('app-shell.js','utf8'),{filename:'app-shell.js'});
console.log(`PASS: ${count} inline scripts, asset references, shared shell, home parity and retired duel flow.`);
