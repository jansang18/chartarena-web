const fs = require('node:fs');
const crypto = require('node:crypto');
const versions = Object.fromEntries(['battle-fx.js', 'battle-fx.css', 'energy.js', 'app-shell.js', 'app-shell.css', 'battle-rules.js', 'gameplay.css', 'puzzle-rules.js', 'daily.js', 'daily-rules.js'].map(file =>
  [file, crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 12)]));
for (const page of fs.readdirSync('.').filter(p => p.endsWith('.html'))) {
  const html = fs.readFileSync(page, 'utf8');
  const updated = html.replace(/((?:src|href)=")(battle-fx\.js|battle-fx\.css|energy\.js|app-shell\.js|app-shell\.css|battle-rules\.js|gameplay\.css|puzzle-rules\.js|daily\.js|daily-rules\.js)(?:\?[^\"]*)?"/g,
    (_, prefix, file) => prefix + file + '?v=' + versions[file] + '"');
  if (updated !== html) fs.writeFileSync(page, updated.replace(/\r\n/g, '\n'));
}
console.log('Shared runtime content versions updated.');
