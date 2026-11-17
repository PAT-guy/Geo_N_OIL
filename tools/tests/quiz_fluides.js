// Quiz Fluides (V5.11) : huit questions par manche (2 mécanismes avec courbes, 2 eau, 2 gaz, 2 pression), réponses calculées avec les constantes du jeu, exercice du tutoriel, carte et bouton rapide présents, texte anglais.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:390,height:844}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const r = await pg.evaluate(()=>{ const kinds={}, bad=[]; let mn=99, balance=[0,0], n=0; for(let i=0;i<60;i++){ const rd=window.__qz.qzBuildRound(window.__qz.QUIZ_BANKS.fluides); mn=Math.min(mn,rd.length); rd.forEach(q=>{ kinds[q.kind]=(kinds[q.kind]||0)+1; if(!(q.choices.length>=2 && q.correct>=0 && q.correct<q.choices.length && q.explain && (q.q||q.ask))) bad.push(q.kind); if(q.kind==='fluide-eau'||q.kind==='fluide-gaz'||q.kind==='fluide-pression'){ n++; balance[q.correct]++; } if(q.kind==='fluide-meca' && !/<polyline/.test(q.fig)) bad.push('sans courbe'); }); }
    return { kinds, bad, mn, balance, n, tuto: window.__qz.qzGenFluidsTuto().map(q=>q.kind) }; });
  ok(r.mn===8,'chaque manche compte 8 questions '+r.mn);
  ok(['fluide-meca','fluide-eau','fluide-gaz','fluide-pression','fluide-contact','fluide-wor','fluide-gor'].every(k=>r.kinds[k]>=40),'les sept gabarits apparaissent régulièrement (80 manches) '+JSON.stringify(r.kinds));
  ok(r.bad.length===0,'questions bien formées, courbes présentes '+r.bad.join(','));
  ok(r.balance[0]>r.n*0.25 && r.balance[1]>r.n*0.25,'les décisions « non » et « oui » sont toutes deux fréquentes '+r.balance);
  ok(r.tuto.length===3 && r.tuto[0]==='fluide-meca' && r.tuto[1]==='fluide-eau' && r.tuto[2]==='fluide-gaz','exercice du tutoriel : mécanisme, eau, gaz '+r.tuto);
  // la bonne réponse suit bien les constantes : le SWD n'est jamais correct sous 27 mois de retour sur le contraire
  const cons = await pg.evaluate(()=>{ let wrong=0; for(let i=0;i<200;i++){ const q=(()=>{ for(let j=0;j<40;j++){ const f=window.__qz.qzGenFluids().find(x=>x.kind==='fluide-eau'); if(f) return f; } })(); const vol=+q.facts[0][1].replace(/\D/g,''); const pay=WATER.swdCapex/(vol*(WATER.truck-WATER.swd)); if((pay<=27)!==(q.correct===1)) wrong++; } return wrong; });
  ok(cons===0,'eau : la réponse suit le retour sur investissement du SWD '+cons);
  const nf = await pg.evaluate(()=>{ const num=t=>parseFloat(String(t).replace(/\s/g,'').replace('−','-').replace(',','.').replace(/[^\d.\-]/g,'')); let wor=0,con=0,gor=0,n=[0,0,0]; for(let i=0;i<150;i++){ window.__qz.qzGenFluids().forEach(q=>{
      if(q.kind==='fluide-wor'){ n[0]++; const b=num(q.facts[0][1])/100, tr=num(q.facts[1][1]); if(Math.abs(num(q.choices[q.correct])-b/(1-b)*tr)>0.006) wor++; }
      if(q.kind==='fluide-contact'){ n[1]++; const h=num(q.facts[1][1]), f=num(q.facts[2][1])/100; if(Math.abs(num(q.choices[q.correct])-h*f)>0.6) con++; }
      if(q.kind==='fluide-gor'){ n[2]++; const pi=num(q.facts[0][1]), p=num(q.facts[1][1]), g0=num(q.facts[3][1]), pf=p/pi, m=1+3*Math.max(0,(DRIVE.solgas.pb-pf)/DRIVE.solgas.pb); if(Math.abs(num(q.choices[q.correct])-g0*m)/(g0*m)>0.03) gor++; } }); } return {wor,con,gor,n}; });
  ok(nf.wor===0 && nf.con===0 && nf.gor===0 && nf.n.every(x=>x>0),'WOR, colonne d\'huile et GOR : réponses recalculées '+JSON.stringify(nf));
  const mw = await pg.evaluate(()=>{ const num=t=>parseFloat(String(t).replace(/\s/g,'').replace(',','.').replace(/[^\d.]/g,'')); let bad=0,n=0; for(let i=0;i<40;i++){ const qs=window.__qz.QUIZ_BANKS.forage.gen().filter(q=>q.kind==='forage-boue'); qs.forEach(q=>{ n++; const [z,gp,sv,gf]=q.facts.map(a=>num(a[1])); const exp=gp+0.54*(sv-gp); const w=num(q.choices[q.correct]); if(Math.abs(gf-exp)>0.012 || w<=gp || w>=gf || Math.abs(w-(gp+0.05))>0.011) bad++; }); } return {bad,n}; });
  ok(mw.bad===0 && mw.n>=30,'fenêtre de boue : fracturation d\'Eaton recalculée, bonne boue dans la fenêtre '+JSON.stringify(mw));
  ok(await pg.evaluate(()=>!!document.querySelector('.mg-card[data-quiz="fluides"]') && !!document.querySelector('#quickTrain button[data-quiz="fluides"]')),'carte et bouton rapide Eau, gaz et pression présents');
  await pg.evaluate(()=>window.__qz.open('fluides')); await pg.waitForTimeout(200);
  ok(await pg.evaluate(()=>document.getElementById('quizModal').classList.contains('open')),'le quiz s\'ouvre');
  ok(await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'pas de débordement horizontal sur téléphone');
  await pg.evaluate(()=>{ document.getElementById('quizModal').classList.remove('open'); window.__qz.open('fluides_tuto'); }); await pg.waitForTimeout(200);
  ok(await pg.evaluate(()=>/Exercice 1\/3/.test(document.getElementById('qzQuestion').textContent)),'exercice du tutoriel ouvert');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
