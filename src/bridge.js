// Shared, source-checked navigation while the legacy views are being migrated.
(function(){
  if(parent===window||new URLSearchParams(location.search).get('embed')!=='1')return;
  const origin=location.origin;
  const send=data=>parent.postMessage({__farmaco:1,...data},origin==='null'?'*':origin);
  const page=location.pathname.split('/').pop();
  const app=page==='Tabella-Farmaci.html'?'catalog':page==='Flashcard-Farmacologia.html'?'flashcard':'canali';
  window.FarmacoNavigate=function(href){const url=new URL(href,location.href);if(url.origin!==origin)return false;const p=url.pathname.split('/').pop();if(!['index.html','Flashcard-Farmacologia.html','Tabella-Farmaci.html','Canali-e-Recettori-3D.html'].includes(p))return false;send({type:'navigate',path:p,hash:url.hash,query:url.search});return true;};
  document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(a&&FarmacoNavigate(a.getAttribute('href'))){e.preventDefault();e.stopImmediatePropagation();}},true);
  addEventListener('message',e=>{
    if(e.source!==parent||e.origin!==origin||!e.data||e.data.__farmaco!==1)return;
    const d=e.data;
    if(d.type==='appearance'){
      if(['light','dark'].includes(d.theme))document.documentElement.dataset.theme=d.theme;
      if(app==='flashcard'&&['it','en'].includes(d.lang)&&typeof LANG!=='undefined'&&LANG!==d.lang)toggleLang();
      if(app==='canali'&&typeof applyTheme==='function'&&['light','dark'].includes(d.theme))applyTheme(d.theme);
      if(app==='canali'&&typeof setLang==='function'&&['it','en'].includes(d.lang))setLang(d.lang);
    }
    if(d.type==='route'&&typeof d.hash==='string'&&d.hash.length<500){
      if(app==='flashcard'&&/^#(?:dash|browse|stats|study|front=[\w-]+|card=[\w-]+)$/.test(d.hash)){
        if(location.hash!==d.hash)location.hash=d.hash;
        else if(typeof applyHash==='function')applyHash();
      }
      if(app==='catalog'&&/^#(?:deck|q|vista|view|mod)=/.test(d.hash)){history.replaceState(null,'',d.hash);const v=applyUrlState();setMode(v||mode);}
    }
    if(d.type==='storage-reloaded'&&app==='catalog'&&typeof qstore!=='undefined'){try{qstore=FarmacoCore.validateQuiz(JSON.parse(localStorage.getItem(QKEY))||{wrong:{},answered:0,correct:0});quizStorageBlocked=false;}catch{quizStorageBlocked=true;}}
  });
  send({type:'ready',app});
})();
