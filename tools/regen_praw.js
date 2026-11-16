// Régénère PRAW_REF (401 quantiles des probabilités brutes de blocs, 960 cartes : 8 bassins, tailles 8, 12 et 20, 40 graines) et réécrit la ligne dans index.html.
// À relancer chaque fois que la formule brute (piège, réservoir, couverture, charge, score) change. Usage : node tools/regen_praw.js [--dry]
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
(async()=>{ const br = await chromium.launch(); const pg = await br.newPage(); const file = path.resolve(__dirname,'../index.html');
  await pg.addInitScript(()=>{ try{ localStorage.setItem('geoexplorer_tutorialSeen','1'); }catch(e){} });
  await pg.goto('file://'+file); await pg.waitForTimeout(500);
  const q = await pg.evaluate(()=>{ const all=[]; for(const bt of ['random','paris','rift','passive','foreland','aquitaine','north_sea','gulf_coast']) for(const size of [8,12,20]) for(let s=1;s<=40;s++){ generateGeology(size, bt, size!==8, s*7919+13); blocks.forEach(b=>all.push(b.pRaw)); }
    all.sort((a,b)=>a-b); const out=[]; for(let i=0;i<=400;i++) out.push(+all[Math.min(all.length-1, Math.round(i/400*(all.length-1)))].toFixed(4)); return { out, n: all.length }; });
  await br.close();
  let src = fs.readFileSync(file,'utf8'); const re = /const PRAW_REF = \[[^\]]*\];/; if(!re.test(src)){ console.error('PRAW_REF introuvable'); process.exit(1); }
  console.log('blocs :', q.n, ' min', q.out[0], ' médiane', q.out[200], ' max', q.out[400]);
  if(process.argv.includes('--dry')) return;
  fs.writeFileSync(file, src.replace(re, 'const PRAW_REF = ['+q.out.join(',')+'];')); console.log('PRAW_REF réécrit');
})();
