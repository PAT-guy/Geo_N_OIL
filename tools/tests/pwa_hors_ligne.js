// Installation et hors ligne : manifeste valide, icônes présentes, service worker enregistré, jeu rechargé sans réseau
const { chromium } = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path');
const racine = path.resolve(__dirname,'../..'); const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.woff2':'font/woff2','.txt':'text/plain'};
const srv = http.createServer((q,r)=>{ let f = path.join(racine, decodeURIComponent(q.url.split('?')[0])); if(f.endsWith('/')) f += 'index.html'; fs.readFile(f,(e,d)=>{ if(e){ r.writeHead(404); r.end(); } else { r.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'}); r.end(d); } }); });
(async()=>{ await new Promise(r=>srv.listen(0,r)); const base='http://localhost:'+srv.address().port+'/'; let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const br = await chromium.launch(); const ctx = await br.newContext(); const pg = await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
  await pg.goto(base+'index.html'); await pg.waitForTimeout(500);
  const m = JSON.parse(fs.readFileSync(path.join(racine,'manifest.webmanifest'),'utf8'));
  ok(m.display==='standalone' && m.icons.some(i=>i.sizes==='192x192') && m.icons.some(i=>i.sizes==='512x512') && m.icons.some(i=>i.purpose==='maskable'), 'manifeste : standalone, icônes 192 et 512, maskable');
  ok(m.icons.every(i=>fs.existsSync(path.join(racine,i.src))), 'manifeste : toutes les icônes existent');
  ok(await pg.evaluate(()=>!!document.querySelector('link[rel=manifest]')), 'lien vers le manifeste dans index.html');
  await pg.evaluate(()=>navigator.serviceWorker.ready); const sw = await pg.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration())); ok(sw, 'service worker enregistré');
  await pg.reload(); await pg.waitForTimeout(800);
  const cache = await pg.evaluate(async()=>{ const c = await caches.open('geoexplorer-v1'); return (await c.keys()).map(k=>new URL(k.url).pathname); }); ok(cache.includes('/index.html') && cache.some(p=>p.includes('/fonts/')), 'cache : index.html et polices gardés ('+cache.length+' fichiers)');
  await ctx.setOffline(true); await pg.reload(); await pg.waitForTimeout(800);
  const hors = await pg.evaluate(()=>({ titre: document.title, jeu: typeof G!=='undefined' || !!document.getElementById('startBtn') })); ok(/GeoExplorer/.test(hors.titre) && hors.jeu, 'hors ligne : le jeu se recharge ('+hors.titre+')');
  await pg.click('#startBtn'); await pg.waitForTimeout(300); ok(await pg.evaluate(()=>!!document.getElementById('labOptGo')), 'hors ligne : DÉMARRER ouvre l\'écran d\'options');
  console.log('erreurs JS', errs); console.log(ko?'ECHECS: '+ko:'TOUT OK'); await br.close(); srv.close(); process.exit(ko||errs.length?1:0); })();
