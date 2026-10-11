'use strict';
const fs=require('node:fs'),path=require('node:path');
const {pwaHead}=require('./pwa-head');
const {norm,sectionKey}=require('../src/core');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(__dirname,p),'utf8'));
const data=read('cards.json'),drugs=read('drugs.json'),brands=read('brands.json');
const enrich=new Map(read('enrichments.json').entries.map(e=>[e.id,e.text]));
// inglese: carte (i18n/en-G*.json), approfondimenti, titoli dei mazzi e nomi dei farmaci
const enCards=new Map();
for(const f of fs.readdirSync(path.join(__dirname,'i18n')).filter(f=>/^en-G\d+\.json$/.test(f)).sort())for(const e of read('i18n/'+f).entries)enCards.set(e.id,e);
const enEnrich=new Map(read('enrichments-en.json').entries.map(e=>[e.id,e.text]));
const decksEn=read('i18n/decks-en.json'),drugsEn=read('i18n/drugs-en.json');
const colors=['#cc795e','#ae8940','#548b76','#668ca6','#947ca6'];
// colori stabili: i mazzi G (principi generali) hanno un colore proprio, come in FarmacoFlash
// codeEn: codice mostrato in inglese (solo etichetta; id e link restano quelli italiani)
let ci=0;const decks=data.decks.map(d=>{const titleEn=decksEn[d.code]||decksEn[d.id];if(!titleEn)throw Error('Missing English deck title '+d.code);return {id:d.id,code:d.code,codeEn:(decksEn._codes||{})[d.code]||d.code,title:d.title,titleEn,module:d.module,color:/^G\d/.test(d.id)?'#7d6f55':colors[ci++%colors.length]};});
// corsivo markdown (*testo*) senza asterischi; restano gli asterischi che non sono corsivo: alleli CYP2C9 *2/*3, stato attivo R*
const italic=/(^|[\s(\[«"'‘“—–\/-])\*(?=[^\s*])([^*]*?[^\s*])\*(?=$|[\s.,;:!?)\]»"'’”—–\/-])/g;
const plain=s=>String(s||'').replace(/\*\*/g,'').replace(/\n/g,' ').replace(italic,(m,a,b)=>/[A-Za-zÀ-ÿ]/.test(b)?a+b:m).trim();
const short=s=>{s=plain(s);return s.length>170?s.slice(0,167)+'…':s;};
// indice di ricerca: parole normalizzate senza ripetizioni (la ricerca cerca ogni parola della query come sottostringa)
const index=s=>[...new Set(norm(s).split(' '))].join(' ');
const usedNames=new Set(Object.values(drugs).flat());
const nameEn={};
for(const n of [...usedNames].sort()){if(typeof drugsEn[n]!=='string'||!drugsEn[n].trim())throw Error('Missing English drug name '+n);nameEn[n]=drugsEn[n];}
// sinonimi: nomi italiani dello stesso farmaco (condividono un nome normalizzato: italiano, INN, nome USA/UK) più marchio -> principio attivo.
// Servono al quiz (distrattori, risposte accettate, niente ripetizioni) e alla rubrica inglese. I gruppi calcolati devono coincidere con _synonyms.
const brandOf=drugsEn._brands||{};
const synonyms=(()=>{
 const enParts=v=>{const m=v.match(/^(.*?)\s*\((.*)\)\s*$/);return m?[m[1],...m[2].split(/\s*,\s*/)]:[v];};
 const up=new Map([...usedNames].sort().map(n=>[n,n])),find=x=>{while(up.get(x)!==x){up.set(x,up.get(up.get(x)));x=up.get(x);}return x;};
 const join=(a,b)=>{a=find(a);b=find(b);if(a!==b)up.set(b,a);},seen=new Map();
 for(const n of up.keys())for(const k of [n,nameEn[n],...enParts(nameEn[n])].map(norm).filter(Boolean)){if(seen.has(k))join(seen.get(k),n);else seen.set(k,n);}
 for(const [b,inn] of Object.entries(brandOf)){if(!usedNames.has(b)||!usedNames.has(inn))throw Error('Unknown brand or INN in _brands: '+b+' -> '+inn);join(inn,b);}
 const groups=new Map();for(const n of up.keys()){const r=find(n);if(!groups.has(r))groups.set(r,[]);groups.get(r).push(n);}
 const key=g=>[...g].sort().join(' | '),found=[...groups.values()].filter(g=>g.length>1).map(key).sort();
 const declared=drugsEn._synonyms||[],want=declared.map(key).sort();
 if(JSON.stringify(found)!==JSON.stringify(want))throw Error('Synonym groups changed: update _synonyms in build/i18n/drugs-en.json\n found: '+found.join(' ; ')+'\n declared: '+want.join(' ; '));
 const out={};for(const g of declared)for(const n of g)out[n]=g[0];   // nome -> voce preferita (il primo del gruppo)
 return out;
})();
const brandList=n=>(brands[n.toLowerCase()]||'').split(' ').filter(Boolean);
const rows=data.cards.map(c=>{
 const d=decks.find(d=>d.id===c.deckId);if(!d)throw Error('Unknown deck '+c.deckId);
 const e=enCards.get(c.id);if(!e)throw Error('Missing English card '+c.id);
 // stesso campo della versione italiana: sezione con la stessa chiave semantica (core.sectionKey)
 const seg=key=>short((e.segments.find(s=>sectionKey(s.label)===key)||{}).value);
 const names=drugs[c.id]||[];
 const en=names.map(n=>nameEn[n]);
 const aliases=names.flatMap(brandList);
 const full=[c.name,d.code,d.title,...names,...en,...aliases,...c.segments.map(s=>s.value),...(c.freetext||[]),enrich.get(c.id)||''].join(' ');
 const fullEn=[e.name,d.codeEn,d.code,d.titleEn,...en,...names,...aliases,...e.segments.map(s=>s.value),...(e.freetext||[]),enEnrich.get(c.id)||''].join(' ');
 const r={id:c.id,deck:d.id,mod:d.module,name:c.name,nameEn:e.name,drugs:names,aliases,o:decks.indexOf(d),
  mecc:short(c.fields.mechanism||c.segments[0]?.value),ind:short(c.fields.indications),adr:short(c.fields.adr),
  meccEn:c.fields.mechanism?seg('mechanism'):short(e.segments[0]?.value),indEn:c.fields.indications?seg('indications'):'',adrEn:c.fields.adr?seg('adr'):'',
  _s:index(full),_se:index(fullEn)};
 if(!r.nameEn||(r.mecc&&!r.meccEn)||(r.ind&&!r.indEn)||(r.adr&&!r.adrEn))throw Error('Missing English table text '+c.id);
 return r;
});
for(const id of Object.keys(drugs))if(!data.cards.some(c=>c.id===id))throw Error('Unknown drug card '+id);
const names={en:nameEn,brands:Object.fromEntries([...usedNames].sort().map(n=>[n,brandList(n)]).filter(x=>x[1].length)),brandOf,syn:synonyms};
const safe=x=>JSON.stringify(x).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
let html=fs.readFileSync(path.join(__dirname,'table-template.html'),'utf8')
 .replace('__PWA_HEAD__',pwaHead({name:'FarmacoFlash · Tabella dei farmaci',title:'FarmacoFlash'}))
 .replace('__CORE_JS__',()=>fs.readFileSync(path.join(root,'src/core.js'),'utf8'))
 .replace('__BRIDGE_JS__',()=>fs.readFileSync(path.join(root,'src/bridge.js'),'utf8'))
 // dati per ultimi, nel blocco <script type="application/json" id="tb-data">: un segnaposto dentro i dati resta com'è
 .replace('__NAMES__',()=>safe(names)).replace('__DECKS__',()=>safe(decks)).replace('__DATA__',()=>safe(rows));
fs.writeFileSync(path.join(root,'Tabella-Farmaci.html'),html);
console.log('Tabella: '+rows.length+' schede · '+usedNames.size+' nomi (IT/EN)');
