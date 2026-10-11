// Genera il blocco <head> PWA/iOS (meta + apple-touch-icon + manifest) dei due HTML generati.
// Usato da build.js e table.js via placeholder __PWA_HEAD__.
// Icone e manifest sono file accanto all'HTML (assets/, manifest.webmanifest), non data: URI:
// dentro lo shell (iframe) non servono e prima pesavano ~140 KB gzip per documento; da file:// e da https
// i percorsi relativi funzionano lo stesso e il service worker li tiene in cache.
function pwaHead(o) {
  const theme = o.theme || '#f3f0e9';
  return [
    '<meta name="theme-color" content="' + theme + '">',
    '<meta name="mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
    '<meta name="apple-mobile-web-app-title" content="' + o.title + '">',
    '<meta name="application-name" content="' + o.title + '">',
    '<meta name="format-detection" content="telephone=no">',
    '<link rel="apple-touch-icon" href="assets/icon-180.png">',
    '<link rel="icon" type="image/svg+xml" href="assets/icon.svg">',
    '<link rel="manifest" href="manifest.webmanifest">'
  ].join('\n');
}
module.exports = { pwaHead };
