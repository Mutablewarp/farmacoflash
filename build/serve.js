#!/usr/bin/env node
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
const MIME={'.html':'text/html;charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
// Solo i file pubblicati su GitHub Pages (stesso elenco di .github/workflows/pages.yml).
const PUBLIC=new Set(['/index.html','/Flashcard-Farmacologia.html','/Tabella-Farmaci.html','/Canali-e-Recettori-3D.html',
  '/sw.js','/manifest.webmanifest','/novita.json','/assets/icon.svg','/assets/icon-180.png','/assets/icon-192.png','/assets/icon-512.png','/assets/icon-maskable-512.png']);
http.createServer((req,res)=>{
  let p;try{p=decodeURIComponent(req.url.split('?')[0]);}catch{res.writeHead(400);return res.end();}
  if(p==='/')p='/index.html';
  if(!PUBLIC.has(p)){res.writeHead(404);return res.end('not found');}
  const f=path.join(ROOT,p);
  if(!f.startsWith(ROOT)){res.writeHead(403);return res.end();}
  fs.readFile(f,(e,b)=>{
    if(e){res.writeHead(404);return res.end('not found');}
    res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});
    res.end(b);
  });
}).listen(8765,'127.0.0.1',()=>console.log('http://127.0.0.1:8765'));
