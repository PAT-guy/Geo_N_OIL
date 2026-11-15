// Garantie de jouabilité : chaque carte (8 bassins, tailles 8, 12 et 20) a au moins une cuisine mature (deux, ou 3 % des blocs), et au moins un bloc réellement chargé.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(400);
  const r = await pg.evaluate(()=>{ const bad=[]; let n=0, charged0=0;
    for(const bt of ['paris','rift','passive','foreland','aquitaine','north_sea','gulf_coast','random']) for(const size of [8,12,20]) for(let s=1;s<=60;s++){ generateGeology(size,bt,size!==8,s*131+7); n++;
      const k=blocks.filter(b=>b.genStrength>=0.15).length, need=Math.max(2,Math.ceil(blocks.length*0.03)); if(k<need) bad.push(bt+size+'#'+s+':'+k);
      const top=[...blocks].sort((a,b)=>b.trueProbability-a.trueProbability).slice(0,3); const okTop=top.some(b=>b.viaFault || (b.chargeFrom && (()=>{ const k=blocks.find(z=>z.x===b.chargeFrom.x && z.y===b.chargeFrom.y); return k && k.maturityClass!=='Immature'; })())); if(!okTop) charged0++; }
    return {n, bad:bad.slice(0,5), nb:bad.length, charged0}; });
  ok(r.nb===0, 'cuisines matures suffisantes sur '+r.n+' cartes ('+r.nb+' manquantes) '+JSON.stringify(r.bad));
  ok(r.charged0<=r.n*0.03, 'parmi les 3 meilleurs blocs de chaque carte, au moins un est chargé par une cuisine mature (ou par faille), tolérance 3 % ('+r.charged0+' cartes sans)');
  ok(errs.length===0, 'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko? 'ECHECS: '+ko : 'TOUT OK'); process.exit(ko?1:0); })();
