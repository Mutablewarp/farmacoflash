// Genera il blocco <head> PWA/iOS (meta + apple-touch-icon PNG + manifest) da
// incorporare nei file single-file. Usato da build.js e _gen-table.js via
// placeholder __PWA_HEAD__. Icone embeddate come data: URI (resta single-file).
const fs = require('fs'), path = require('path');
const b64 = p => fs.readFileSync(path.join(__dirname, p)).toString('base64');

function pwaHead(o) {
  const theme = o.theme || '#fff8ec';
  const i180 = 'data:image/png;base64,' + b64('icon-180.png');
  const i512 = 'data:image/png;base64,' + b64('icon-512.png');
  const manifest = {
    name: o.name, short_name: o.title, display: 'standalone', orientation: 'portrait',
    background_color: theme, theme_color: theme,
    icons: [
      { src: i512, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: i512, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: i180, sizes: '180x180', type: 'image/png' }
    ]
  };
  const man = 'data:application/manifest+json,' + encodeURIComponent(JSON.stringify(manifest));
  return [
    '<meta name="theme-color" content="' + theme + '">',
    '<meta name="mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
    '<meta name="apple-mobile-web-app-title" content="' + o.title + '">',
    '<meta name="application-name" content="' + o.title + '">',
    '<meta name="format-detection" content="telephone=no">',
    '<link rel="apple-touch-icon" href="' + i180 + '">',
    '<link rel="icon" type="image/png" sizes="512x512" href="' + i512 + '">',
    '<link rel="manifest" href="' + man + '">'
  ].join('\n');
}
module.exports = { pwaHead };
