const fs = require('node:fs');
const crypto = require('node:crypto');
const test = require('node:test');
const assert = require('node:assert/strict');
test('every shared runtime reference matches its content version', () => {
  for (const page of fs.readdirSync('.').filter(p => p.endsWith('.html'))) {
    const html = fs.readFileSync(page, 'utf8');
    for (const match of html.matchAll(/(?:src|href)="(arena-motion\.js|arena-wallet\.js|deathmatch\.js|deathmatch\.css|deathmatch-rules\.js|arena-reactions\.js|arena-reactions\.css|battle-charts\.js|battle-data\.js|arena-design\.css|arena-characters\.js|terminal-home\.css|terminal-home\.js|exchange-theme\.css|battle-fx\.css|battle-fx\.js|energy\.js|app-shell\.js|app-shell\.css|battle-rules\.js|gameplay\.css|puzzle-rules\.js|daily\.js|daily-rules\.js)([^\"]*)"/g)) {
      const hash = crypto.createHash('sha256').update(fs.readFileSync(match[1])).digest('hex').slice(0, 12);
      assert.equal(match[2], '?v=' + hash, `${page}: ${match[1]} must invalidate the previous cached runtime`);
    }
  }
});
