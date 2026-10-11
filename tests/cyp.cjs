/* Controlli dello slot «cyp» dell'atlante (Interazioni CYP): estrae lo slot JS dall'HTML e lo esegue in un contesto isolato.
   Uso: node tests/cyp.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'..','Canali-e-Recettori-3D.html'),'utf8');
const A='/* ═══ slot cyp: inizio (solo il suo agente) ═══ */', B='/* ═══ slot cyp: fine ═══ */';
const code=html.slice(html.indexOf(A)+A.length, html.indexOf(B));
assert.ok(code.length>1000,'slot cyp non trovato');

const ctx={LANG:'it',console,
  t(a){ return a[ctx.LANG==='en'?1:0]; },
  escAttr(v){ return (''+v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]); },
  document:{getElementById:()=>null,querySelector:()=>null},
  window:{matchMedia:()=>({matches:false})},matchMedia:()=>({matches:false}),requestAnimationFrame:()=>0};
vm.createContext(ctx);
vm.runInContext(code+';globalThis.__cx={cxAnalyze,cxTarget,cxPartner,cxTableRows,CX_DOC,CX_ISO,CX_D,CYPX_L,setState:s=>{cypxState=s;}};',ctx);
const X=ctx.__cx;
const an=(p,v)=>X.cxAnalyze(p,v);

/* 1. coppie documentate in Goodman & Gilman che non devono finire in «non presente» */
const GG=[['eritro','teof'],['clari','teof'],['fluco','ciclo'],['fluco','simva'],['fluco','atorva'],['amio','simva'],['amio','atorva'],
  ['cipro','warf'],['fluvox','warf'],['disulf','warf'],['fluox','warf'],['isoniaz','warf'],['disulf','feni'],
  ['isoniaz','feni'],['isoniaz','diaz'],['isoniaz','teof'],['rifa','cloz'],['feni','cloz'],['fenob','cloz'],
  ['fluox','cloz'],['parox','cloz'],['keto','cloz'],['itra','cloz'],['clari','cloz'],['rito','cloz'],['fluox','omep'],
  ['fumo','teof'],['fluco','omep'],['rifa','omep'],['fenob','oc'],['omep','feni'],['omep','diaz']];
GG.forEach(([p,v])=>assert.notEqual(an(p,v).st,'none',`${p}>${v} risulta «non presente»`));
['fenob>oc','fluco>omep','rifa>omep','fluox>omep','fumo>teof','eritro>teof','isoniaz>teof','disulf>warf','fluox>warf'].forEach(k=>{
  const [p,v]=k.split('>'); assert.equal(an(p,v).st,'gg',`${k} deve essere documentata (G&G)`); });

/* 2. matrice completa, IT ed EN: niente segnaposto rimasti, undefined, NaN */
const perps=[...new Set(X.CX_ISO.flatMap(b=>[...b.I,...b.N]))], victs=[...new Set(X.CX_ISO.flatMap(b=>b.S))];
let none=0,total=0;
for(const L of ['it','en']){
  ctx.LANG=L;
  for(const p of perps) for(const v of victs){
    const r=an(p,v); if(r.st==='same') continue; if(L==='it'){ total++; if(r.st==='none') none++; }
    const txt=[r.mech,r.cons,r.ex,r.time,r.note,r.isoTxt].filter(x=>x!=null).join(' | ');
    assert.ok(!/\{[A-Za-z]+\}|undefined|NaN|null/.test(txt),`${L} ${p}>${v}: testo incompleto: ${txt.slice(0,200)}`);
    if(r.st!=='none'){ const tg=X.cxTarget(r); if(tg){ assert.ok(tg.keF>=0.1&&tg.keF<=6&&tg.amp>0,`${p}>${v}: fattori curva fuori scala`); } }
    if(L==='it'&&r.st!=='none'){
      /* preposizioni articolate: niente «a warfarin», «elimina warfarin» */
      assert.ok(!/(?:^|[\s(])(a|elimina|eliminano|attiva|attivano|trasforma|trasformano|esposizione) (warfarin|etanolo|omeprazolo|anestetici|contraccettivi|clopidogrel|paracetamolo|codeina|simvastatina|teofillina|clozapina|FANS|sulfaniluree)\b/.test(txt),`${p}>${v}: articolo mancante: ${txt.slice(0,240)}`);
    }
  }
}
ctx.LANG='it';
console.log(`Coppie selezionabili: ${total}; «non presente in questi dati»: ${none} (${Math.round(none/total*100)}%)`);
/* soglia larga contro le regressioni (molte coppie restanti non hanno davvero un isoenzima in comune) */
assert.ok(none/total<0.66,'troppe coppie senza dati: un ruolo è stato perso?');

/* 3. testi: niente rassicurazioni false, niente lineette lunghe nei testi nuovi */
const allTxt=JSON.stringify(X.CYPX_L)+JSON.stringify(X.CX_DOC);
['livelli invariati','nessun allarme','levels unchanged','no alarm'].forEach(s=>assert.ok(!allTxt.includes(s),`testo vietato: ${s}`));
assert.ok(!allTxt.includes('—'),'lineetta lunga nei testi nuovi');

/* 4. etichette e decorsi specifici */
assert.equal(an('disulf','etoh').isoTxt,'ALDH');
assert.match(an('disulf','etoh').time,/14 giorni/);
assert.match(an('amio','warf').time,/settimane o mesi/);
assert.match(an('fluox','codeina').time,/norfluoxetina/);
assert.match(an('etohc','parac').time,/stabilizz/);
assert.match(an('etohc','parac').time,/formazione di NAPQI torna/);
assert.match(an('rifa','warf').time,/risalgono/);
assert.match(an('fumo','cloz').time,/8 giorni/);
assert.match(an('rifa','oc').time,/PXR/);
assert.equal(an('feni','warf').dir,0);
assert.equal(an('rito','oc').dir,-1);
assert.match(an('fluco','warf').mech,/^Il fluconazolo inibisce .*il warfarin/);

/* 5. curva: forza del perpetratore */
assert.ok(X.cxTarget(an('fluvox','cloz')).keF<0.2,'fluvoxamina + clozapina: curva troppo bassa');
assert.ok(X.cxTarget(an('rifa','warf')).keF>=4,'induttore forte: almeno −80%');
assert.ok(Math.abs(X.cxTarget(an('verap','atorva')).keF-1/2.4)<1e-9,'inibitore moderato');
assert.equal(X.cxTarget({st:'none'}),null);
assert.equal(X.cxTarget(an('omep','warf')),null,'effetto netto incerto: niente curva');

/* 6. passaggio dall'esploratore al costruttore: il partner scelto dà sempre un risultato */
X.setState({iso:'CYP3A4',drug:null,p:'fluco',v:'warf'});
for(const id of perps){ const v=X.cxPartner(id,'P'); assert.notEqual(an(id,v).st,'none',`partner di ${id}`); }
for(const id of victs){ const p=X.cxPartner(id,'V'); assert.notEqual(an(p,id).st,'none',`partner di ${id}`); }
assert.equal(X.cxPartner('omep','P'),'clopi');

/* 7. tabella riassuntiva generata dagli stessi dati */
const rows=X.cxTableRows(); assert.equal((rows.match(/<tr>/g)||[]).length,6); assert.match(rows,/molti altri/);

console.log('CYP interaction checks passed');
