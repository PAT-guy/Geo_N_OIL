// Mini-jeu « Lire un log » : chaque question doit avoir une réponse défendable avec les repères affichés.
// Lecteur idéal : Rt < 10 Ω·m = eau ; sinon écart densité-neutron > 7 points (jaune) = gaz ; sinon huile. Il ne doit jamais se tromper.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(400);
  const r = await pg.evaluate((N)=>{ const t0=performance.now(); const out={n:0,nul:0,faux:[],cnt:{eau:0,huile:0,gaz:0},sansTable:0,verdictFaux:0}; 
    for(let i=0;i<N;i++){ const f=['eau','huile','gaz'][i%3]; const l=window.__lgm.makeLog(f); if(!l){out.nul++; continue;} out.n++; out.cnt[l.fluid]++;
      const rt=l.rB.rt, gap=l.rB.gap; const pred = rt<10 ? 'eau' : (gap>7 ? 'gaz' : 'huile'); if(pred!==l.fluid) out.faux.push([l.fluid,pred,+rt.toFixed(1),+gap.toFixed(1)]);
      if(!l.qs.every(q=>/<table class="lgm-read"/.test(q.table||''))) out.sansTable++;
      if(l.qs[1].good!==l.fluid) out.verdictFaux++;
      if(!(l.rng.zA>=l.rng.z0 && l.rng.zA<=l.rng.z1-10 && l.rng.zB>=l.rng.z0 && l.rng.zB<=l.rng.z1-10)) out.horsLog=(out.horsLog||0)+1; }
    out.msParLog=(performance.now()-t0)/N; return out; }, 300);
  console.log(JSON.stringify({n:r.n,nul:r.nul,cnt:r.cnt,faux:r.faux.length,msParLog:Math.round(r.msParLog)}));
  ok(r.nul===0, 'aucun log introuvable (génération par rejet) : '+r.nul+' échecs sur 300');
  ok(r.faux.length===0, 'lecteur idéal : 0 erreur sur '+r.n+' questions de fluide '+JSON.stringify(r.faux.slice(0,4)));
  ok(Math.abs(r.cnt.eau-r.cnt.huile)<=2 && Math.abs(r.cnt.huile-r.cnt.gaz)<=2, 'fluides équilibrés '+JSON.stringify(r.cnt));
  ok(!r.horsLog, 'les repères A et B sont toujours dans la portion tracée du log ('+(r.horsLog||0)+' hors du dessin sur '+r.n+')');
  ok(r.sansTable===0, 'tableau de valeurs lues présent pour chaque question'); ok(r.verdictFaux===0, 'bonne réponse cohérente avec le fluide imposé');
  ok(r.msParLog<250, 'génération rapide : '+Math.round(r.msParLog)+' ms par log');
  // une manche contient bien les trois fluides
  const m = await pg.evaluate(()=>{ const seen=new Set(); for(let k=0;k<20;k++){ const s=new Set(); const f=['eau','huile','gaz']; f.forEach(x=>{const l=window.__lgm.makeLog(x); if(l) s.add(l.fluid);}); if(s.size===3) seen.add(k); } return seen.size; });
  ok(m===20, 'chaque manche peut proposer eau, huile et gaz');
  // roches demandées en A : jamais deux fois la même dans une manche de 4 logs (tant que le log le permet)
  const rep = await pg.evaluate(()=>{ let rep=0, tot=0; for(let k=0;k<60;k++){ const used=[]; ['eau','huile','gaz','huile'].forEach(f=>{ const l=window.__lgm.makeLog(f,used); if(l){ if(used.includes(l.qs[0].good)) rep++; used.push(l.qs[0].good); } }); tot++; } return rep; });
  ok(rep<=3, 'roches en A : '+rep+' répétitions sur 60 manches (tolérées si le puits n\'offre pas d\'autre roche)');
  console.log('erreurs JS', errs); console.log(ko?'ECHECS: '+ko:'TOUT OK'); await br.close(); process.exit(ko||errs.length?1:0); })();
