const fs=require('fs'),path=require('path');
const B=__dirname, BUILD=path.resolve(B,'..');
const cards=JSON.parse(fs.readFileSync(path.join(BUILD,'cards.json'),'utf8')).cards;
const memo={};
for(const f of fs.readdirSync(path.join(BUILD,'memo')).filter(f=>f.endsWith('.json'))){
  for(const e of JSON.parse(fs.readFileSync(path.join(BUILD,'memo',f),'utf8')).entries||[]) memo[e.id]=e.memo;
}
const groups={
  G1:['A4','A5','A6'], G2:['A7','A8','A9'], G3:['A10','A11','A12'],
  G4:['B1','B2','B3','B4'], G5:['B5','B6','B7','B8'], G6:['B9','B10','B11','B11b'],
  G7:['B12','B12b','B13','B14'], G8:['Antibiotici-2','Antibiotici-3'], G9:['Beta-lattamici']
};
let tot=0;
for(const [g,decks] of Object.entries(groups)){
  const sel=cards.filter(c=>decks.includes(c.deckId)).map(c=>({
    id:c.id, name:c.name, nameShort:c.nameShort,
    memo:memo[c.id]||null,
    segments:c.segments.map(s=>({label:s.label,value:s.value})),
    freetext:c.freetext||[]
  }));
  fs.writeFileSync(path.join(B,'src-'+g+'.json'),JSON.stringify({group:g,cards:sel},null,1));
  console.log(g, decks.join(','), '→', sel.length, 'card');
  tot+=sel.length;
}
console.log('TOTALE', tot);
