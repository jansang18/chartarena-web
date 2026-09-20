const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const R=require('../battle-rules.js');
const html=fs.readFileSync(require.resolve('../quiz-battle.html'),'utf8');
test('a match settles exactly five rounds and rejects a sixth round',()=>{
 assert.equal(R.ROUNDS,5);
 let game=R.walletOpen({balance:25000},'five','standard','me');
 for(let round=1;round<=5;round++)game=R.walletRound(game,'five',{dir:'L',lev:2},1,round,false);
 assert.throws(()=>R.walletRound(game,'five',{dir:'L',lev:2},1,6,false),/Invalid round/);
 game=R.walletClose(game,'five');assert.equal(game.balance,35000);assert.equal(game.battleLast.rounds,5);
 assert.deepEqual(R.walletClose(game,'five'),game);
});
test('actual next-round handler opens round five then finalizes without round six',()=>{
 const calls=[],ctx={phase:'result',round:4,ROUNDS:R.ROUNDS,clearAutoNext(){},startRound(){calls.push('start');},finalResult(){calls.push('final');}};
 vm.createContext(ctx);vm.runInContext(html.match(/function nextRound\(\)\{[^\n]+/)[0],ctx);
 ctx.nextRound();assert.equal(ctx.round,5);assert.deepEqual(calls,['start']);
 ctx.nextRound();assert.equal(ctx.round,5);assert.deepEqual(calls,['start','final']);
 assert.match(html,/var ROUNDS=ArenaRules\.ROUNDS/);
});
