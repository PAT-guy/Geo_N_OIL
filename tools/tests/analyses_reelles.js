// Analyses du métier (V5.13) : option de partie ; sur un bloc foré, calculs faits sur les données réelles du puits, bonus unique, absence de bouton quand l'option est coupée.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1300,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  ok(await pg.evaluate(()=>LAB_DEFAULT_OPT.analyses===false && LAB_PRESETS.complet.o.analyses===true && LAB_PRESETS.expert.o.analyses===true && !LAB_PRESETS.decouverte.o.analyses),'option « Analyses du métier » : coupée par défaut, active en Complet et Expert');
  await pg.evaluate(async()=>{ document.getElementById('geoSeed').value='2024'; menuConfig.mode='junior'; menuConfig.basinType='paris'; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); LABOPT.analyses=true; G.labOpt && (G.labOpt.analyses=true); setSpeed(0); G.budget=60e6; });
  // un puits productif réel : on cherche un bloc, on fore et on avance
  const bid = await pg.evaluate(()=>{ performStudy(null,'gravity'); G.labPick=null; G.labOpt.pick=false; LABOPT.pick=false; const c=blocks.filter(b=>!b.inSalt && !b.isOffshore).sort((a,z)=>z.trueProbability-a.trueProbability).slice(0,8); let got=-1; for(const b of c){ drillBlock(b.id,'vertical','renforce'); for(let i=0;i<40&&G.drilling.length;i++) monthTick(); drillRevealQueue.length=0; drillRevealPlaying=false; document.getElementById('drillRevealModal')?.classList.remove('open'); if(b.well){ got=b.id; break; } } for(let i=0;i<14;i++) monthTick(); return got; });
  const st = await pg.evaluate(id=>({ well: !!blocks[id].well, status: blocks[id].well?.status, dry: !!blocks[id].dryHole }), bid);
  ok(st.well && st.status==='producing','puits productif obtenu pour le test '+JSON.stringify(st));
  await pg.evaluate(id=>{ performStudy(id,'core'); selectedBlock=id; renderGeoPanel(blocks[id]); }, bid);
  const btns = await pg.evaluate(()=>[...document.querySelectorAll('#geoContent .lab-chips button[onclick*="anaOpen"]')].map(b=>b.textContent.trim()));
  ok(btns.length===4,'quatre boutons d\'analyse sur un bloc foré '+JSON.stringify(btns));
  // déclin : cumul 10 ans = formule hyperbolique, et cohérent avec la boucle du jeu
  const dec = await pg.evaluate(id=>{ const b=blocks[id], w=b.well, q=window.__qz.anaBuild(b,'decline'); if(!Array.isArray(q)) return { err:q.err }; const num=t=>parseFloat(String(t).replace(/\s/g,'').replace(',','.').replace(/[^\d.]/g,'')); const cm=w.comps[0], d=cm.dc||DECL; let sum=0; for(let m=0;m<120;m++) sum+=cm.q0*declineFactor(m,d); const got=num(q[0].choices[q[0].correct])*1e3; return { n:q.length, got, sum, rel:Math.abs(got-sum)/sum }; }, bid);
  if(dec.err) console.log('decline err:',dec.err);
  ok(dec.n===2 && dec.rel<0.04,'déclin : le cumul 10 ans proposé = somme mensuelle de la courbe du jeu (écart '+(dec.rel*100).toFixed(1)+' %)');
  const vol = await pg.evaluate(id=>{ const q=window.__qz.anaBuild(blocks[id],'volumes'); return Array.isArray(q) ? q[0].facts.length : q.err; }, bid);
  ok(vol===6,'volumes : six données, porosité et Sw tirées de la carotte '+vol);
  const wt = await pg.evaluate(id=>{ const q=window.__qz.anaBuild(blocks[id],'welltest'); if(!Array.isArray(q)) return q.err; const num=t=>parseFloat(String(t).replace(/\s/g,'').replace(',','.').replace(/[^\d.]/g,'')); const f=q[0].facts.map(a=>num(a[1])); const k=162.6*f[0]*f[2]*f[1]/(f[4]*f[3]); return Math.abs(num(q[0].choices[q[0].correct])-k)<=Math.max(0.03*k,0.6) ? 'ok' : 'faux'; }, bid);
  ok(wt==='ok' || /trop forte/.test(wt),'essai de puits : k recalculé depuis la pente affichée ('+wt+')');
  // essai de puits sur de nombreux puits fictifs (le puits du test peut être trop perméable) : au moins un tiers lisible, et toujours juste
  const wtm = await pg.evaluate(()=>{ let built=0, wrong=0, n=0; const num=t=>parseFloat(String(t).replace(/\s/g,'').replace(',','.').replace(/[^\d.]/g,'')); blocks.filter(b=>!b.inSalt && !b.well && !b.dryHole && b.horizons.some(h=>h.role==='reservoir')).slice(0,80).forEach(b=>{ b.well={ blockId:b.id, status:'producing', method:'vertical', cost:3e6, production:9000+Math.random()*6000, comps:[{q0:12000,t0:0}], monthsActive:20 }; n++; const q=window.__qz.anaBuild(b,'welltest'); if(Array.isArray(q)){ built++; const f=q[0].facts.map(a=>num(a[1])); const k=162.6*f[0]*f[2]*f[1]/(f[4]*f[3]); if(Math.abs(num(q[0].choices[q[0].correct])-k)>Math.max(0.03*k,0.6)) wrong++; } b.well=null; }); return {built,wrong,n}; });
  ok(wtm.built>=wtm.n/3 && wtm.wrong===0,'essai de puits : lisible sur au moins un tiers des blocs, toujours correct '+JSON.stringify(wtm));
  const lim = await pg.evaluate(id=>{ const b=blocks[id]; const q=window.__qz.anaBuild(b,'limiting'); const F=[b.trapFactor,b.resFactor,b.sealFactor,b.srcFactor]; return q[0].correct===F.indexOf(Math.min(...F)); }, bid);
  ok(lim,'facteur limitant : la bonne réponse est le plus faible des quatre facteurs réels');
  // prime unique
  await pg.evaluate(id=>window.__qz.anaOpen(id,'limiting'), bid); await pg.waitForTimeout(200);
  const b0 = await pg.evaluate(()=>G.budget);
  await pg.evaluate(()=>{ const q=window.__qz.order()[0]; document.querySelectorAll('.qz-choice').forEach(c=>{ if(+c.dataset.orig===q.correct) c.click(); }); });
  await pg.waitForTimeout(200);
  const b1 = await pg.evaluate(()=>G.budget); ok(Math.round(b1-b0)===60000,'une analyse réussie rapporte 60 k$ '+(b1-b0));
  await pg.evaluate(()=>{ document.getElementById('quizModal').classList.remove('open'); }); await pg.evaluate(id=>window.__qz.anaOpen(id,'limiting'), bid); await pg.waitForTimeout(200);
  await pg.evaluate(()=>{ const q=window.__qz.order()[0]; document.querySelectorAll('.qz-choice').forEach(c=>{ if(+c.dataset.orig===q.correct) c.click(); }); }); await pg.waitForTimeout(200);
  const b2 = await pg.evaluate(()=>G.budget); ok(Math.round(b2-b1)===0,'pas de seconde prime sur la même analyse '+(b2-b1));
  // option coupée : aucun bouton
  await pg.evaluate(id=>{ LABOPT.analyses=false; document.getElementById('quizModal').classList.remove('open'); renderGeoPanel(blocks[id]); }, bid);
  ok(await pg.evaluate(()=>!document.querySelector('#geoContent button[onclick*="anaOpen"]')),'option coupée : aucun bouton d\'analyse');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
