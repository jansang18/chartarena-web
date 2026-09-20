const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),R=require('../battle-rules.js');
const html=fs.readFileSync('quiz-battle.html','utf8');
function equation(result){
 const c={fmtP:n=>n.toLocaleString('en-US')};vm.createContext(c);
 vm.runInContext(html.slice(html.indexOf('function goldEquation('),html.indexOf('function renderCtrl(')),c);
 return c.goldEquation(result);
}
test('missed and pass UI explains the fixed charge without a leverage formula',()=>{
 const p=R.create('me','standard');
 assert.equal(equation(R.profit(p,{dir:'N',lev:10},5)),'미제출 감점 -1,000G · 배율 무관');
 assert.equal(equation(R.profit(p,{dir:'W'},5)),'무료 패스 · 골드 변동 없음');
 assert.equal(equation(R.profit(R.create('me','standard',500),null,5)),'미제출 감점 -500G · 배율 무관 · 보유 골드 한도');
 assert.equal(equation(R.profit(R.create('me','standard',0),null,5)),'관전 · 추가 감점 없음');
});
