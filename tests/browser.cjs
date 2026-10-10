// Run after npm run build, with npm start in another terminal.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined});
 const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[];  // SW bloccato: il test del fallback CDN deve vedere la rete
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/');
 await page.locator('#tour:not([hidden])').waitFor();
 await page.locator('#tour-skip').click();
 await page.locator('.sp[data-space="cards"]').click();await page.locator('[data-sub="names"]').click();
 const catalog=await (await page.$('#if-catalog')).contentFrame();
 await catalog.waitForFunction(()=>typeof quizStart==='function');
 const result=await catalog.evaluate(()=>{
   state.q='paracetamolo';render();const top=filtered()[0].name;
   quizStart('write');const q=quiz.hist[0];document.getElementById('qIn').value='incorrect-name';quizSubmit();
   const first={done:q.done,score:quiz.score,total:quiz.total};
   document.getElementById('qIn').value=q.target;quizSubmit();
   return {top,first,corrected:q.done,score:quiz.score};
 });
 assert.match(result.top,/Paracetamolo/i);assert.deepEqual(result.first,{done:false,score:0,total:1});assert(result.corrected);assert.equal(result.score,0);
 await catalog.locator('.q-study').click();
 const cards=await (await page.$('#if-flashcard')).contentFrame();
 await cards.waitForFunction(()=>location.hash.startsWith('#front='));
 await cards.evaluate(()=>revealCard());
 await cards.waitForFunction(()=>Math.abs(document.getElementById('gradeBar').getBoundingClientRect().bottom-innerHeight)<1);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert(await page.evaluate(()=>Math.abs(document.querySelector('.spaces').getBoundingClientRect().bottom-innerHeight)<1),'Mobile navigation must be anchored to viewport, not filtered header');
 for(const width of [320,360,390,430,768,1280]){
   await page.setViewportSize({width,height:844});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Shell overflow at '+width);
   assert(await page.locator('#lang').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;}),'Language control outside viewport at '+width);
   assert(await cards.evaluate(()=>Math.abs(document.getElementById('gradeBar').getBoundingClientRect().bottom-innerHeight)<1),'Grade bar at '+width);
 }
 await page.screenshot({path:'implementation/desktop-study.png'});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'implementation/mobile-study.png'});
 await page.locator('[data-sub="names"]').click();
 assert.equal(await catalog.evaluate(()=>quiz.total),1);
 const unique=await catalog.evaluate(()=>{const used=quiz.hist[0].target;quizNext();return quiz.hist[1].target!==used;});assert(unique);
 await page.locator('[data-sub="dash"]').click();await page.locator('[data-sub="study"]').click();
 await cards.waitForFunction(()=>document.getElementById('v-study').classList.contains('active'));
 // Real exported backup includes quiz history; invalid imports must leave storage intact.
 await page.locator('[data-sub="stats"]').click();
 await cards.locator('#imp').waitFor({state:'attached'});
 const downloaded=page.waitForEvent('download');await cards.evaluate(()=>exportData());
 const download=await downloaded, chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);
 const backup=JSON.parse(Buffer.concat(chunks));assert.equal(backup.version,2);assert.equal(JSON.parse(backup.storage['farmaco-quiz-v1']).answered,1);
 page.on('dialog',d=>d.accept());
 const state=JSON.parse(backup.storage['farmaco-srs-v1']);state.settings.newPerDay=31;backup.storage['farmaco-srs-v1']=JSON.stringify(state);
 await cards.locator('#imp').setInputFiles({name:'roundtrip.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
 await cards.waitForFunction(()=>S.settings.newPerDay===31);
 const saved=await cards.evaluate(()=>localStorage.getItem(KEY));
 state.settings.newPerDay=-7;backup.storage['farmaco-srs-v1']=JSON.stringify(state);
 await cards.locator('#imp').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
 await cards.waitForFunction(()=>document.getElementById('toast').textContent===T('t_invalid'));
 assert.equal(await cards.evaluate(()=>localStorage.getItem(KEY)),saved);
 // Missing 3D CDN must not remove textual teaching content or navigation.
 await page.route('https://unpkg.com/**',r=>r.abort());
 await page.locator('.sp[data-space="atlas"]').click();
 const explore=await (await page.$('#if-canali')).contentFrame();
 await explore.locator('#ex-toggle').click(); // l'elenco dei bersagli sta nel cassetto «Guarda canali e recettori»
 await explore.locator('#chip-zone button.chip').first().waitFor();
 assert.equal(await explore.locator('#chip-zone button.chip').count(),81);
 assert.match(await explore.locator('#canvas-host').innerText(),/unavailable/);
 await explore.locator('#chip-zone button.chip').first().click();
 // Without 3D the "In vista" bar must still follow the chosen target (not only the first one, already current).
 await explore.locator('#ex-toggle').click();
 await explore.locator('#chip-zone button.chip[data-id="gabaa"]').click();
 assert.match(await explore.locator('#ex-now-name').innerText(),/GABA-A/);
 assert.equal(await explore.locator('#ex-toggle').getAttribute('aria-expanded'),'false','Picking a target closes the list');
 // Long target names in the bar must never widen the page on phones.
 for(const width of [320,375]){
   await page.setViewportSize({width,height:844});
   const wide=await explore.evaluate(()=>{const t=document.getElementById('ex-toggle'),out=[];
     for(const ch of document.querySelectorAll('#chip-zone button.chip')){ if(t.getAttribute('aria-expanded')!=='true') t.click(); ch.click(); if(document.documentElement.scrollWidth>innerWidth) out.push(ch.dataset.id); }
     return out;});
   assert.deepEqual(wide,[],'Explorer wider than the viewport at '+width+'px: '+wide.join(' '));
 }
 await page.setViewportSize({width:390,height:844});
 assert.equal(errors.length,0,errors.join('\n'));
 await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));});
 await page.screenshot({path:'implementation/mobile-verified.png'});
 await page.reload();
 assert.equal(await page.locator('#tour:not([hidden])').count(),0,'Skipped tutorial must not repeat');
 await page.locator('#help').click();await page.locator('#tour-next').click();assert.match(await page.locator('#tour-n').innerText(),/^2 /);
 await browser.close();console.log('6 viewport widths, navigation, strict quiz, no-repeat, backup roundtrip/rejection, retained session, fixed bar, tutorial replay, CDN fallback and explorer bar (target, 320/375 px overflow) passed');
})().catch(e=>{console.error(e);process.exit(1);});
