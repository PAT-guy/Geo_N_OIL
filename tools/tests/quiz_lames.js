// Mini-jeu « Lire une lame mince » (V5.40) : six questions générées sur de vraies lames (porosité, fluide, connexion, ciment, saturation, comparaison) et trois fixes ; réponses recalculées depuis les statistiques de la lame.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1100,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const r = await pg.evaluate(async()=>{ const out={ rounds:8, n:0, kinds:{}, bad:[], imgs:0, imgNeed:0, ms:0 };
    const t0=performance.now();
    for(let i=0;i<out.rounds;i++){ const L=window.__qz.qzGenLames(); out.n+=L.length; if(L.length!==6) out.bad.push('manche:'+L.length);
      for(const q of L){ out.kinds[q.kind]=(out.kinds[q.kind]||0)+1;
        if(new Set(q.choices).size!==q.choices.length || q.correct<0 || q.correct>=q.choices.length) out.bad.push(q.kind+':choix');
        const m=q.meta; if(q.kind==='comparaison' && (!(m.kc>=1.4*m.kf) || q.correct!==(m.swap?1:0))) out.bad.push('comparaison');
        if(q.kind==='connexion' && q.correct!==(m.c>=0.85&&m.k>=0.05?0:m.c>=0.2?1:2)) out.bad.push('connexion');
        if(q.kind==='porosite' && q.choices[q.correct]!==Math.round(m.phi*100/5)*5+' %') out.bad.push('porosite');
        out.imgNeed++; if(/<img[^>]+src="data:image/.test(q.fig||'')) out.imgs++; } }
    out.ms=(performance.now()-t0)/out.rounds;
    out.btn=!!document.querySelector('#quickTrain button[data-quiz="lames"]'); out.card=!!document.querySelector('.mg-card[data-quiz="lames"]'); out.chip=document.getElementById('quickMiniCount').textContent;
    document.querySelector('.mg-card[data-quiz="lames"]').click(); await new Promise(r=>setTimeout(r,300)); out.open=document.getElementById('quizModal').classList.contains('open'); out.title=document.getElementById('qzTitle').textContent; out.score=document.getElementById('qzScore').textContent;
    return out; });
  ok(r.n===r.rounds*6 && r.bad.length===0,'six questions générées par manche sur '+r.rounds+' manches '+JSON.stringify(r.bad.slice(0,6)));
  ok(Object.keys(r.kinds).length===6 && Object.values(r.kinds).every(v=>v>=r.rounds),'les six gabarits sortent '+JSON.stringify(r.kinds));
  ok(r.imgs===r.imgNeed,'une lame est jointe à chaque question ('+r.imgs+'/'+r.imgNeed+')');
  ok(r.ms<2500,'génération d\'une manche : '+Math.round(r.ms)+' ms');
  ok(r.btn && r.card && /14 jeux/.test(r.chip),'accueil : bouton et carte, pastille « '+r.chip+' »');
  ok(r.open && /lame mince/i.test(r.title) && /Question 1\/8/.test(r.score),'le mini-jeu s\'ouvre : « '+r.title+' », '+r.score);
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
