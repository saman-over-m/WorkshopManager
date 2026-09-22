const fs = require('fs');
const { execFileSync } = require('child_process');
const path = require('path');
const root = path.join(__dirname, '..');
const files = [
  'main.js', 'preload.js', 'db.js',
  path.join('factor','app.js')
];
for (const rel of files) {
  const p = path.join(root, rel);
  execFileSync(process.execPath, ['--check', p], { stdio: 'inherit' });
  console.log('OK syntax:', rel);
}
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
const opens = (html.match(/<script\b/gi)||[]).length;
const closes = (html.match(/<\/script>/gi)||[]).length;
if (opens !== closes) throw new Error(`script tag mismatch: ${opens} open / ${closes} close`);
if (!html.includes("const K='wm_web_v3'")) throw new Error('Workshop Manager state key missing');
if (!html.includes('FactorPlusEmbedded')) throw new Error('FactorPlus bridge missing');
if (!fs.readFileSync(path.join(root,'factor','app.js'),'utf8').includes('async function dbGet')) throw new Error('FactorPlus V32 dbGet fix missing');
if (!fs.readFileSync(path.join(root,'db.js'),'utf8').includes('clearFactorInvoices')) throw new Error('SQLite factor clear API missing');
console.log('OK HTML script balance:', opens);
