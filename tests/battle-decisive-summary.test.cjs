const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const R=require('../battle-rules.js'),Rivals=require('../battle-rivals.js');
const html=fs.readFileSync('quiz-battle.html','utf8'),code=html.slice(html.indexOf('function decisiveSummary('),html.indexOf('function setupRematch('));
function summary(pick){
 const prices={0:0,30:-2,60:-4.94,90:-3.0388};
 const c={players:[{state:{id:'me'}}],ArenaRules:R,ArenaRivals:Rivals,selectedTable:'standard',matchStartGold:100000,myCh:'tr_sera',matchHistory:[{round:1,seg:1,picks:{me:pick}}],pickSegByIdx:()=>({}),finalMove:(_,at)=>prices[at],fmtLead:String};
 vm.createContext(c);vm.runInContext(code,c);const text=c.decisiveSummary();return {text,moments:c.decisiveChoices};
}
const switched=R.checkpoint({me:{dir:'L',lev:2}},{me:{decision:'SWITCH',lev:5}},1).me;
test('final highlights compare a SWITCH with the unchanged previous leverage',()=>{
 const pick=R.checkpoint({me:switched},{me:{decision:'STOP'}},2).me,before=JSON.stringify(pick),result=summary(pick);
 assert.match(result.text,/승부의 순간/);assert.equal(result.moments[0].swing,20880);assert.equal(JSON.stringify(pick),before);
});
test('two changed SWITCH multipliers produce final highlights without invalid future paths',()=>{
 const pick=R.checkpoint({me:switched},{me:{decision:'SWITCH',lev:3}},2).me,result=summary(pick);
 assert.equal(result.moments.length,2);assert.equal(result.moments[0].swing,20880);assert.equal(result.moments[1].swing,15700);
});
test('GO after a leverage change compares STOP while preserving earlier leverage history',()=>{
 const result=summary(switched);assert.equal(result.moments[1].action,'GO');assert.equal(result.moments[1].swing,-9700);
});
