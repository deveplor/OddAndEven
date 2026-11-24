const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'oae-check-'));
let count = 0;
let failed = false;
try {
  for (const file of fs.readdirSync('.').filter(f => /\.(html|js)$/.test(f))) {
    const source = fs.readFileSync(file, 'utf8');
    const scripts = file.endsWith('.js') ? [source] : [...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m => !/\bsrc\s*=/.test(m[1]) && m[2].trim() && !/application\/ld\+json/.test(m[1])).map(m => m[2]);
    for (const script of scripts) {
      const target = path.join(temporary, `script-${count++}.mjs`);
      fs.writeFileSync(target, script);
      const result = spawnSync(process.execPath, ['--check', target], { encoding: 'utf8' });
      if (result.status !== 0) { failed = true; console.error(file, result.stderr); }
    }
    if (file.endsWith('.html')) {
      for (const match of source.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"?#]+)[^"]*"/g)) {
        if (/^(https?:|data:|\/\/)/.test(match[1])) continue;
        if (!fs.existsSync(match[1])) { failed = true; console.error(`${file}: missing asset ${match[1]}`); }
      }
    }
  }
} finally { fs.rmSync(temporary, { recursive: true, force: true }); }
console.log(`Checked ${count} scripts and local script/style dependencies.`);
process.exitCode = failed ? 1 : 0;
