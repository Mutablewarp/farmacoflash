'use strict';
const fs=require('node:fs'),path=require('node:path');
const {pwaHead}=require('./pwa-head');
const {norm}=require('../src/core');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(__dirname,p),'utf8'));
const data=read('cards.json'),drugs=read('drugs.json'),brands=read('brands.json');
const enrich=new Map(read('enrichments.json').entries.map(e=>[e.id,e.text]));
const colors=['#cc795e','#ae8940','#548b76','#668ca6','#947ca6'];
// colori stabili: i mazzi G (principi generali) hanno un colore proprio, come in FarmacoFlash
let ci=0;const decks=data.decks.map(d=>({id:d.id,code:d.code,title:d.title,module:d.module,color:/^G\d/.test(d.id)?'#7d6f55':colors[ci++%colors.length]}));
const plain=s=>String(s||'').replace(/\*\*/g,'').replace(/\n/g,' ').trim();
const short=s=>{s=plain(s);return s.length>170?s.slice(0,167)+'…':s;};
const rows=data.cards.map(c=>{
 const d=decks.find(d=>d.id===c.deckId);if(!d)throw Error('Unknown deck '+c.deckId);
 const names=drugs[c.id]||[];
 const aliases=names.flatMap(n=>(brands[n.toLowerCase()]||'').split(' ').filter(Boolean));
 const full=[c.name,d.code,d.title,...names,...aliases,...c.segments.map(s=>s.value),...(c.freetext||[]),enrich.get(c.id)||''].join(' ');
 return {id:c.id,deck:d.id,mod:d.module,name:c.name,drugs:names,aliases,o:decks.indexOf(d),mecc:short(c.fields.mechanism||c.segments[0]?.value),ind:short(c.fields.indications),adr:short(c.fields.adr),_s:norm(full)};
});
for(const id of Object.keys(drugs))if(!data.cards.some(c=>c.id===id))throw Error('Unknown drug card '+id);
const safe=x=>JSON.stringify(x).replace(/</g,'\\u003c');
let html=fs.readFileSync(path.join(__dirname,'table-template.html'),'utf8')
 .replace('__PWA_HEAD__',pwaHead({name:'FarmacoFlash · Tabella dei farmaci',title:'FarmacoFlash'}))
 .replace('__DATA__',()=>safe(rows)).replace('__DECKS__',()=>safe(decks))
 .replace('__CORE_JS__',()=>fs.readFileSync(path.join(root,'src/core.js'),'utf8'))
 .replace('__BRIDGE_JS__',()=>fs.readFileSync(path.join(root,'src/bridge.js'),'utf8'));
fs.writeFileSync(path.join(root,'Tabella-Farmaci.html'),html);
console.log('Tabella: '+rows.length+' schede');
