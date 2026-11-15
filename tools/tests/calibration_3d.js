// Sismique 3D : la probabilité affichée est une estimation calibrée (le meilleur décile n'est plus annoncé trop haut) et l'écart annoncé couvre l'erreur réelle environ deux fois sur trois.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(400);
  const r = await pg.evaluate(()=>{ const rows=[]; let ampBad=0, mu=0;
    for(let s=1;s<=60;s++){ generateGeology([8,12,20][s%3],['paris','rift','aquitaine','passive','north_sea'][s%5],false,s*131+7);
      blocks.forEach(b=>{ if(b.inSalt) return; const rng=makeRng(s*1000+b.id); const x=STUDIES.seismic3d.do(b, rng); rows.push([x.probEst, b.trueProbability, x.probErr]);
        const cls = x.probRaw>0.25 ? /forte|strong/ : x.probRaw>0.10 ? /mod[ée]r|moderate/ : /pas d|no clear/; if(!cls.test(x.amplitude)) ampBad++; }); }
    const n=rows.length, srt=[...rows].sort((a,b)=>a[0]-b[0]); const dec=[]; for(let q=0;q<10;q++){ const sl=srt.slice(Math.floor(n*q/10),Math.floor(n*(q+1)/10)); dec.push([sl.reduce((t,x)=>t+x[0],0)/sl.length, sl.reduce((t,x)=>t+x[1],0)/sl.length]); }
    const top=dec[9], cover=rows.filter(r=>Math.abs(r[0]-r[1])<=r[2]).length/n, meanGap=rows.reduce((t,x)=>t+(x[0]-x[1]),0)/n;
    return { n, top, dec, cover, meanGap, ampBad }; });
  ok(Math.abs(r.top[0]-r.top[1])<=0.04, 'meilleur décile : annoncé '+r.top[0].toFixed(3)+' pour réel '+r.top[1].toFixed(3)+' (écart <= 4 points)');
  ok(r.dec.every(d=>Math.abs(d[0]-d[1])<=0.05), 'les dix déciles sont calibrés à 5 points près '+JSON.stringify(r.dec.map(d=>[+d[0].toFixed(2),+d[1].toFixed(2)])));
  ok(Math.abs(r.meanGap)<=0.02, 'pas de biais d\'ensemble : '+r.meanGap.toFixed(3));
  ok(r.cover>=0.55 && r.cover<=0.85, 'l\'écart annoncé couvre l\'erreur réelle '+Math.round(r.cover*100)+' % du temps (visé : environ deux tiers)');
  ok(r.ampBad===0, 'la classe d\'anomalie d\'amplitude suit la lecture brute ('+r.ampBad+' écarts)');
  ok(errs.length===0, 'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko? 'ECHECS: '+ko : 'TOUT OK'); process.exit(ko?1:0); })();
