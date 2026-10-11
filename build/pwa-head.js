// Genera il blocco <head> mobile/PWA delle app generate (FarmacoFlash, Tabella), inserito da build.js e table.js
// al posto di __PWA_HEAD__.
// - Barra di stato e barre del browser: due theme-color (chiaro/scuro di sistema), poi entrambe seguono il tema
//   scelto (data-theme), anche quando cambia; color-scheme 'only light' impedisce a Chrome Android di ricolorare il chiaro.
// - Icone e manifest sono file accanto alla pagina (assets/, manifest.webmanifest), non data: URI: niente ~200 KB in
//   più a ogni apertura. Il manifest è quello dello shell, così installare da una qualsiasi pagina installa tutta l'app;
//   si collega solo in http(s) e fuori dallo shell (da file:// il browser lo bloccherebbe con un errore).
const LIGHT = '#f3f0e9', DARK = '#13110d';

const paint = `(function(){var r=document.documentElement,C={light:'${LIGHT}',dark:'${DARK}'};
function p(){var t=r.getAttribute('data-theme')==='dark'?'dark':'light',m=document.querySelectorAll('meta[name="theme-color"]'),s=document.querySelector('meta[name="color-scheme"]'),i;for(i=0;i<m.length;i++)m[i].content=C[t];if(s)s.content=t==='dark'?'dark':'only light';}
if(window.MutationObserver)new MutationObserver(p).observe(r,{attributes:true,attributeFilter:['data-theme']});if(r.hasAttribute('data-theme'))p();
if(/^https?:$/.test(location.protocol)&&!/[?&]embed=1/.test(location.search)){var l=document.createElement('link');l.rel='manifest';l.href='manifest.webmanifest';document.head.appendChild(l);}})();`;

function pwaHead(o) {
  return [
    '<meta name="theme-color" content="' + LIGHT + '" media="(prefers-color-scheme: light)">',
    '<meta name="theme-color" content="' + DARK + '" media="(prefers-color-scheme: dark)">',
    '<meta name="color-scheme" content="light dark">',
    '<meta name="mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
    '<meta name="apple-mobile-web-app-title" content="' + o.title + '">',
    '<meta name="application-name" content="' + o.title + '">',
    '<meta name="format-detection" content="telephone=no">',
    '<link rel="apple-touch-icon" href="assets/icon-180.png">',
    '<link rel="icon" type="image/svg+xml" href="assets/icon.svg">',
    '<script>/* barra di stato al tema scelto; manifest solo in http(s) */' + paint + '</script>'
  ].join('\n');
}
module.exports = { pwaHead };
