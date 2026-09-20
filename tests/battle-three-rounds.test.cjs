const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const R=require('../battle-rules.js');
const html=fs.readFileSync(require.resolve('../quiz-battle.html'),'utf8');
test('a match settles exactly three rounds and rejects a fourth round',()=>{
 assert.equal(R.ROUNDS,3);
 let game=R.walletOpen({balance:25000},'three','standard','me');
 for(let round=1;round<=3;round++)game=R.walletRound(game,'three',{dir:'L',lev:2},1,round,false);
 assert.throws(()=>R.walletRound(game,'three',{dir:'L',lev:2},1,4,false),/Invalid round/);
 game=R.walletClose(game,'three');assert.equal(game.balance,31000);assert.equal(game.battleLast.rounds,3);
 assert.deepEqual(R.walletClose(game,'three'),game);
});
test('actual next-round handler opens round three then finalizes without round four',()=>{
 const calls=[],ctx={phase:'result',round:2,ROUNDS:R.ROUNDS,clearAutoNext(){},startRound(){calls.push('start');},finalResult(){calls.push('final');}};
 vm.createContext(ctx);vm.runInContext(html.match(/function nextRound\(\)\{[^\n]+/)[0],ctx);
 ctx.nextRound();assert.equal(ctx.round,3);assert.deepEqual(calls,['start']);
 ctx.nextRound();assert.equal(ctx.round,3);assert.deepEqual(calls,['start','final']);
 assert.match(html,/var ROUNDS=ArenaRules\.ROUNDS/);
});
