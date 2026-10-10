const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const files=['Flashcard-Farmacologia.html','Tabella-Farmaci.html'];
execFileSync(process.execPath,['build/build.js']);
const before=files.map(f=>fs.readFileSync(f,'utf8'));
execFileSync(process.execPath,['build/build.js']);
files.forEach((f,i)=>{const html=fs.readFileSync(f,'utf8');assert.equal(html,before[i],'Non-deterministic build');assert(!/__DATA__|__DATA_B64__|__CORE_JS__|__BRIDGE_JS__|__PWA_HEAD__/.test(html));for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1],{filename:f});});
const html=before[0],data=JSON.parse(Buffer.from(html.match(/const DATA = decodeData\("([^"]+)"\)/)[1],'base64'));
assert.equal(data.cards.length,255);assert.equal(new Set(data.cards.map(c=>c.id)).size,255);
for(const c of data.cards){assert(c.en&&c.memo);for(const s of [...c.segments,...c.en.segments])assert(s.key&&s.label&&typeof s.value==='string');}
console.log('Build deterministic; 255 card IDs; scripts parse; bilingual semantic keys verified');
