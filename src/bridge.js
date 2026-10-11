// Ponte tra lo shell (index.html) e le app incorniciate (?embed=1): tema, lingua, rotte e viste.
// Funziona uguale da file://, in http(s) e nell'app installata.
// - Trasporto: da file:// ogni pagina ha origine opaca ('null'), mentre location.origin vale 'file://';
//   lì si invia con '*' e si accetta solo ciò che arriva dalla finestra attesa (parent). In http(s) resta la
//   stessa origine stretta. I messaggi portano solo tema, lingua e rotte: nessun dato personale.
// - Rotte: arrivano come navigazione di frammento (lo shell sostituisce l'hash dell'iframe: hashchange) e come
//   messaggio; gate() fa eseguire una sola volta la stessa rotta. Le app non creano voci di cronologia.
// - Tema e lingua: li decide lo shell (messaggio 'appearance'); in più si seguono le chiavi condivise
//   cr-theme e cr-lang ('storage', ritorno alla pagina), così anche un messaggio perso converge.
(function(){
  if(parent===window||new URLSearchParams(location.search).get('embed')!=='1')return;
  const LOCAL=location.protocol==='file:'||location.origin==='null';
  const TARGET=LOCAL?'*':location.origin;
  const fromShell=e=>e.source===parent&&(LOCAL?(e.origin==='null'||e.origin==='file://'):e.origin===location.origin);
  const send=data=>{try{parent.postMessage({__farmaco:1,...data},TARGET);}catch(e){}};
  const root=document.documentElement;
  const page=location.pathname.split('/').pop();
  const app=page==='Tabella-Farmaci.html'?'catalog':page==='Flashcard-Farmacologia.html'?'flashcard':'canali';
  const APPS={'index.html':'home','Flashcard-Farmacologia.html':'flashcard','Tabella-Farmaci.html':'catalog','Canali-e-Recettori-3D.html':'canali'};
  let linked=false; // lo shell ha risposto: i link passano da lui

  /* ---- link verso le altre app: attraverso lo shell; se non risponde, si apre lo shell stesso su quell'app ---- */
  window.FarmacoNavigate=function(href){
    let url;try{url=new URL(href,location.href);}catch(e){return false;}
    const p=url.pathname.split('/').pop();
    if(!(p in APPS)||(LOCAL?url.protocol!=='file:':url.origin!==location.origin))return false;
    if(linked){send({type:'navigate',path:p,hash:url.hash,query:url.search});return true;}
    const to=APPS[p];
    try{parent.location.href=new URL('index.html'+(to==='home'?'':'#'+to+'/'+encodeURIComponent(url.hash)),location.href).href;return true;}catch(e){return false;}
  };
  document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[href]');if(a&&!e.defaultPrevented&&FarmacoNavigate(a.getAttribute('href'))){e.preventDefault();e.stopImmediatePropagation();}},true);

  /* ---- rotte ---- */
  const ROUTE={
    flashcard:/^#(?:dash|study|browse|stats|(?:front|card)=[\w-]{1,200}|deck=[\w-]{1,80})$/,
    catalog:/^#(?:deck|q|vista|view|mod)=[^#]{0,400}$/,
    canali:/^#(?:card|target|q)=[^#]{0,400}$/
  }[app];
  const norm=h=>{try{return new URL(h,location.href).hash;}catch(e){return h;}};
  let last={h:'',t:-1e9};
  // vero se la rotta va eseguita: la stessa rotta, arrivata per hashchange e per messaggio, passa una volta sola
  function gate(h){h=norm(h);const now=performance.now();if(h===last.h&&now-last.t<1000)return false;last={h,t:now};return true;}
  function apply(){
    if(app==='flashcard'&&typeof applyHash==='function')applyHash();
    else if(app==='catalog'&&typeof applyRoute==='function')applyRoute();
  }
  function routeTo(h){
    if(typeof h!=='string'||!ROUTE.test(h)||!gate(h))return;
    if(location.hash!==norm(h))try{history.replaceState(history.state,'',h);}catch(e){}
    apply();
  }
  addEventListener('hashchange',()=>{if(ROUTE.test(location.hash)&&gate(location.hash))apply();});
  // vista cambiata dentro l'app (es. «Inizia la sessione» da Oggi): l'hash la segue senza nuove voci di cronologia
  const KIND=h=>{const m=/^#(dash|study|browse|stats|front|card|deck)\b/.exec(h||'');return m?({front:'study',card:'study',deck:'browse'}[m[1]]||m[1]):'';};
  function view(v){
    if(app!=='flashcard'||!/^(?:dash|study|browse|stats)$/.test(v)||KIND(location.hash)===v)return;
    const h='#'+v;try{history.replaceState(history.state,'',h);}catch(e){}
    last={h,t:performance.now()};send({type:'view',hash:h});
  }

  /* ---- tema e lingua ---- */
  const osDark=window.matchMedia?matchMedia('(prefers-color-scheme: dark)'):null;
  function readTheme(){let t;try{t=localStorage.getItem('cr-theme');}catch(e){return null;}return t==='dark'||t==='light'?t:(osDark&&osDark.matches?'dark':'light');}
  function readLang(){let l;try{l=localStorage.getItem('cr-lang');if(l!=='it'&&l!=='en')l=localStorage.getItem('farmaco-lang');}catch(e){return null;}return l==='en'?'en':'it';}
  function appear(t,l){
    if(t==='light'||t==='dark'){
      if(app==='flashcard'&&typeof applyTheme==='function')applyTheme(t);
      else if(app==='catalog'&&typeof setTheme==='function')setTheme(t,false);
      else root.dataset.theme=t;
    }
    if((l==='it'||l==='en')&&typeof LANG!=='undefined'&&LANG!==l){
      if(app==='flashcard'&&typeof toggleLang==='function')toggleLang();
      else if(app==='catalog'&&typeof setLang==='function')setLang(l,false);
    }
  }
  // 'painted': l'app è disegnata nel tema giusto (transizioni del cambio di tema finite); lo shell la mostra solo allora
  let paintSeq=0;
  function painted(){
    const n=++paintSeq;let done=false;
    const fire=()=>{
      if(done||n!==paintSeq)return;done=true;
      const run=document.getAnimations?document.getAnimations().filter(a=>a.playState==='running'&&'transitionProperty' in a):[];
      const out=()=>{if(n===paintSeq)send({type:'painted',app,theme:root.dataset.theme,lang:typeof LANG!=='undefined'?LANG:root.lang,hash:location.hash});};
      if(!run.length)return out();
      Promise.race([Promise.all(run.map(a=>a.finished.catch(()=>{}))),new Promise(r=>setTimeout(r,400))]).then(out);
    };
    requestAnimationFrame(()=>requestAnimationFrame(fire));setTimeout(fire,120); // in un iframe nascosto rAF può non girare
  }
  const reread=()=>{if(!document.hidden)appear(readTheme(),readLang());};
  addEventListener('storage',e=>{if(e.key===null||e.key==='cr-theme'||e.key==='cr-lang')appear(readTheme(),readLang());});
  if(osDark){const f=()=>appear(readTheme(),null);if(osDark.addEventListener)osDark.addEventListener('change',f);else if(osDark.addListener)osDark.addListener(f);}
  addEventListener('pageshow',reread);
  document.addEventListener('visibilitychange',reread);

  addEventListener('message',e=>{
    if(!fromShell(e)||!e.data||typeof e.data!=='object'||e.data.__farmaco!==1)return;
    const d=e.data;linked=true;
    if(d.type==='appearance'){appear(d.theme,d.lang);painted();}
    else if(d.type==='route'&&typeof d.hash==='string'&&d.hash.length<500)routeTo(d.hash);
    else if(d.type==='storage-reloaded'&&app==='catalog'&&typeof qstore!=='undefined'){try{qstore=FarmacoCore.validateQuiz(JSON.parse(localStorage.getItem(QKEY))||{wrong:{},answered:0,correct:0});quizStorageBlocked=false;}catch{quizStorageBlocked=true;}}
  });
  window.FarmacoBridge={send,view,gate};
  appear(readTheme(),readLang());
  // un solo saluto, dopo che tutti i gestori sono registrati: lo shell risponde con tema, lingua e rotta in attesa
  send({type:'ready',app,theme:root.dataset.theme,lang:typeof LANG!=='undefined'?LANG:root.lang,hash:location.hash});
})();
