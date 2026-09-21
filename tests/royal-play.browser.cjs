const {chromium}=(()=>{try{return require('playwright');}catch(_){return require(require('node:path').join(require('node:os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}})();
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.CHARTARENA_URL||'http://127.0.0.1:8035/';
async function reach(p,selector){for(let i=0;i<120;i++){if(await p.locator(selector).isVisible())return;await p.clock.fastForward(500);await p.waitForTimeout(20);}throw Error('Missing '+selector+' '+await p.locator('body').innerText());}
(async()=>{
 fs.mkdirSync('exports',{recursive:true});
 const b=await chromium.launch({headless:true}),c=await b.newContext({viewport:{width:1440,height:900}}),errors=[];
 await c.addInitScript(()=>{if(!localStorage.getItem('qa-seeded')){localStorage.setItem('chartarena_hub_v1',JSON.stringify({nick:'로열테스터',equip:{ch:'tr_sera'},setup:true,owned:{char:['tr_sera']},gems:100}));localStorage.setItem('chartarena_web_v1',JSON.stringify({balance:100000000}));localStorage.setItem('qa-seeded','1');}sessionStorage.setItem('ca_club_intro_v2_b','1');sessionStorage.setItem('ca_club_intro_v2','1');});
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.clock.install({time:new Date('2026-09-21T10:00:00Z')});await p.clock.pauseAt(new Date('2026-09-21T10:00:01Z'));
 await p.goto(base+'index.html',{waitUntil:'networkidle'});await p.clock.fastForward(8000);if(await p.locator('#dpop .dbtn').isVisible())await p.locator('#dpop .dbtn').click();else if(await p.getByRole('button',{name:'받기',exact:true}).isVisible())await p.getByRole('button',{name:'받기',exact:true}).click();await p.screenshot({path:'exports/royal-play-home.png',fullPage:true});
 assert.equal(await p.locator('#characterMastery').count(),1);assert.equal(await p.locator('a[href="club-tour.html"]').count(),1);
 await p.goto(base+'quiz-battle.html?table=standard',{waitUntil:'networkidle'});await p.locator('#modeLive').click();await reach(p,'#dL:enabled');await p.locator('#dL').click();await p.locator('#levs [data-lev="2"]').click();await p.locator('#go').click();
 for(const lev of [5,3]){await reach(p,'#switchHere:enabled');await p.locator('#switchHere').click();await p.locator('#switchLeverages [data-lev="'+lev+'"]').click();await p.locator('#switchConfirm').click();}
 for(let i=0;i<120;i++){if(await p.locator('#verdict.royal-result.show').count())break;await p.clock.fastForward(60000);await p.waitForLoadState('networkidle');}
 assert.equal(await p.locator('#verdict.royal-result.show').count(),1);await p.screenshot({path:'exports/royal-play-result.png'});
 const wallet=await p.evaluate(()=>JSON.parse(localStorage.getItem('chartarena_web_v1')));assert.equal(wallet.battleActive,null);assert.equal(wallet.battleLast.rounds,5);
 await p.evaluate(()=>localStorage.setItem('chartarena_energy_v1',JSON.stringify({plays:0,last:Date.now()})));await p.locator('.result-rematch').click();assert.match(await p.locator('.royal-result').innerText(),/게임 횟수를 다 썼어요/);await p.evaluate(()=>localStorage.setItem('chartarena_energy_v1',JSON.stringify({plays:10,last:Date.now()})));
 const enoughGold=await p.evaluate(()=>JSON.parse(localStorage.getItem('chartarena_web_v1')).balance);await p.evaluate(()=>{const w=JSON.parse(localStorage.getItem('chartarena_web_v1'));w.balance=0;localStorage.setItem('chartarena_web_v1',JSON.stringify(w));});await p.locator('.result-rematch').click();await p.waitForTimeout(20);assert.match(await p.locator('.result-alert').innerText(),/골드/);await p.evaluate(balance=>{const w=JSON.parse(localStorage.getItem('chartarena_web_v1'));w.balance=balance;localStorage.setItem('chartarena_web_v1',JSON.stringify(w));},enoughGold);
 await p.locator('.result-review').click();await p.locator('.review-dialog').waitFor({state:'visible'});assert.deepEqual(await p.locator('.review-ledger tbody tr td:nth-child(2)').allTextContents(),['롱 2배','숏 5배','롱 3배']);await p.screenshot({path:'exports/royal-play-review.png'});
 await p.keyboard.press('Escape');assert.equal(await p.locator('.review-dialog').isVisible(),false);
 const layouts=[];for(const [width,height] of [[320,650],[390,844],[667,375],[960,720],[2002,1085]]){await p.setViewportSize({width,height});await p.screenshot({path:`exports/royal-play-result-${width}.png`});layouts.push(await p.evaluate(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,rect:document.querySelector('.royal-result').getBoundingClientRect().toJSON(),buttons:[...document.querySelectorAll('.result-actions>*')].map(e=>({label:e.textContent,h:e.getBoundingClientRect().height,w:e.getBoundingClientRect().width,y:e.getBoundingClientRect().y,bottom:e.getBoundingClientRect().bottom}))})));}
 await p.setViewportSize({width:1440,height:900});await p.locator('.result-rematch').click();await reach(p,'#dL:enabled');assert.ok((await p.evaluate(()=>JSON.parse(localStorage.getItem('chartarena_mastery_v1')))).characters.tr_sera.played>=1);
 // Separate browser storage for tours, leaving the active QA battle isolated.
 const tc=await b.newContext({viewport:{width:1440,height:900}}),t=await tc.newPage();t.on('pageerror',e=>errors.push(e.message));await t.clock.install({time:new Date('2026-09-21T11:00:00Z')});await t.clock.pauseAt(new Date('2026-09-21T11:00:01Z'));
 await t.goto(base+'club-tour.html',{waitUntil:'networkidle'});await t.screenshot({path:'exports/royal-play-tour-lobby.png',fullPage:true});
 // Fixed rising charts exercise the complete winning/tactics path through real UI controls.
 const fixture=()=>{const cs=Array.from({length:300},(_,i)=>{const v=100+Math.max(0,i-209)*.01;return[v,v+.002,v-.002,v];});BATTLE_CHARTS.forEach(s=>s.cs=cs);};
 await t.evaluate(fixture);await t.locator('#tourStart').click();await t.locator('#tourGame').waitFor({state:'visible'});
 const snapshots=[];
 for(let stage=0;stage<3;stage++){
  await t.locator('[data-tour-dir="L"]').click();await t.locator('[data-tour-lev="3"]').click();await t.locator('#tourConfirm').click();await t.locator('#tourDirection').waitFor({state:'hidden'});
  if(stage===0){const before=await t.evaluate(()=>JSON.parse(localStorage.getItem('chartarena_club_tour_v1')));await t.reload({waitUntil:'networkidle'});await t.evaluate(fixture);await t.locator('#tourResume').click();const after=await t.evaluate(()=>JSON.parse(localStorage.getItem('chartarena_club_tour_v1')));assert.deepEqual(after,before);snapshots.push({reloadPreserved:true});}
  for(let n=0;n<2;n++){await reach(t,'#tourDecisions:not([hidden])');await t.locator('[data-tour-action="GO"]').click();if(n===0)await t.locator('#tourSignature').check();await t.locator('#tourConfirm').click();await t.locator('#tourDecisions').waitFor({state:'hidden'});}
  await reach(t,'#tourOutcome:not([hidden])');const state=await t.evaluate(()=>JSON.parse(localStorage.getItem('chartarena_club_tour_v1')));snapshots.push({stage,state});
  await t.screenshot({path:`exports/royal-play-tour-stage-${stage}.png`,fullPage:true});if(stage<2)await t.locator('[data-tour-tactic="'+(stage===0?'flow':'guard')+'"]').click();
 }
 assert.equal((await t.evaluate(()=>JSON.parse(localStorage.getItem('chartarena_club_tour_v1')))).phase,'won');assert.equal(await t.evaluate(()=>localStorage.getItem('chartarena_web_v1')),null);
 await t.locator('[data-tour-review]').click();assert.match(await t.locator('.review-total').textContent(),/PT/);await t.screenshot({path:'exports/royal-play-tour-review.png'});await t.keyboard.press('Escape');
 const mastery=await t.evaluate(()=>JSON.parse(localStorage.getItem('chartarena_mastery_v1')));assert.equal(mastery.characters.tr_sera.played,1);await t.reload({waitUntil:'networkidle'});await t.evaluate(fixture);await t.locator('#tourResume').click();assert.equal((await t.evaluate(()=>JSON.parse(localStorage.getItem('chartarena_mastery_v1')))).characters.tr_sera.played,1);
 for(const [width,height] of [[320,650],[390,844],[667,375],[960,720]]){await t.setViewportSize({width,height});await t.screenshot({path:`exports/royal-play-tour-${width}.png`,fullPage:true});const overflow=await t.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false,'tour overflow '+width);}
 const landscape=layouts.find(l=>l.width===667);assert.ok(landscape.buttons.every(x=>x.y>=0&&x.bottom<=375),'landscape actions must remain visible');
 assert.deepEqual(errors,[]);assert.ok(layouts.every(l=>!l.overflow&&l.buttons.every(x=>x.h>=44)));
 fs.writeFileSync('exports/royal-play-qa.json',JSON.stringify({wallet:wallet.battleLast,layouts,snapshots,errors},null,2));console.log('PASS: battle + review + rematch + 3-table tour + tactics + reload + wallet isolation + responsive layouts');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
