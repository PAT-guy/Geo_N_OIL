// Mini-jeux sur téléphone simulé : log confortable (question et réponses toujours visibles, repère A/B centré dans la fenêtre du log),
// cartes du prospect en colonne, boutons >= 40 px, quiz >= 44 px ; et pas de régression sur ordinateur.
const { chromium, devices } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); const errs=[]; let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const open = async (pg, sel)=>{ await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(250); const c=pg.locator('#menuCustomBtn'); if(await c.isVisible()) await c.tap(); await pg.locator('.menu-tab[data-tab="minigames"]').tap(); await pg.locator(sel).first().tap(); await pg.waitForTimeout(500); };
  for(const [w,h] of [[390,844],[360,740],[320,640]]){
    const ctx=await br.newContext({...devices['iPhone 13'],viewport:{width:w,height:h}}); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.message));
    await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
    await open(pg, '.mg-card#logGameOpenBtn');
    for(let q=0;q<2;q++){
      await pg.waitForTimeout(150);
      const r = await pg.evaluate(()=>{ const R=e=>document.querySelector(e).getBoundingClientRect(); const pane=R('#lgmLog'), qb=R('#lgmQuestion'), ch=[...document.querySelectorAll('#lgmChoices .qz-choice')].map(e=>e.getBoundingClientRect()), cl=R('#lgmClose');
        const marks=[...document.querySelectorAll('#lgmLog .wl-svg line[stroke="#d4380d"]')].map(l=>{const b=l.getBoundingClientRect(); return {y:b.y+b.height/2}});
        return { paneH:Math.round(pane.height), paneW:Math.round(pane.width), choixDansEcran: ch.every(c=>c.bottom<=innerHeight+0.5&&c.top>=0), minChoix:Math.min(...ch.map(c=>c.height)), close:cl.height, scrollPage: document.documentElement.scrollHeight>innerHeight+1, scrollX: document.documentElement.scrollWidth>innerWidth,
          marqueDansFenetre: marks.some(m=>m.y>pane.top+22 && m.y<pane.bottom), nMarks:marks.length, paneScrollable: document.getElementById('lgmLog').scrollHeight>document.getElementById('lgmLog').clientHeight+5, cols: !!document.querySelector('.lgm-cols') }; });
      console.log(w+'x'+h,'question',q+1,JSON.stringify(r));
      ok(r.choixDansEcran, w+' q'+(q+1)+' : question et toutes les réponses visibles sans défiler la page');
      ok(r.minChoix>=43.5, w+' q'+(q+1)+' : réponses >= 44 px ('+Math.round(r.minChoix)+')'); ok(r.close>=39.5, w+' : Fermer >= 40 px');
      ok(r.paneH>=220, w+' q'+(q+1)+' : fenêtre du log >= 220 px ('+r.paneH+')'); ok(r.marqueDansFenetre, w+' q'+(q+1)+' : repère de la question visible dans la fenêtre du log'); ok(r.cols && !r.scrollX, w+' : titres de colonnes collés, pas de débordement');
      // répondre (bonne réponse au hasard) et vérifier que « Suite » reste atteignable
      await pg.locator('#lgmChoices .qz-choice').first().tap(); await pg.waitForTimeout(150);
      const s = await pg.evaluate(()=>{ const b=document.getElementById('lgmNext').getBoundingClientRect(), p=document.getElementById('lgmFeedback').getBoundingClientRect(); return { suite:[b.top>=0&&b.bottom<=innerHeight+0.5, b.height], fb:p.height }; });
      ok(s.suite[0] && s.suite[1]>=39.5, w+' q'+(q+1)+' : bouton Suite visible et >= 40 px après la réponse ('+Math.round(s.suite[1])+')');
      await pg.locator('#lgmNext').tap();
    }
    await pg.waitForTimeout(300); if(w===390){ await pg.screenshot({path:'/tmp/mj_log_q3.png'}); }
    // prospect
    await open(pg, '.mg-card#cardGameOpenBtn');
    const c = await pg.evaluate(()=>{ const cs=[...document.querySelectorAll('.cg-card')].map(e=>e.getBoundingClientRect()); const nm=document.getElementById('cgNewHandBtn').getBoundingClientRect(); return { colonne: new Set(cs.map(r=>Math.round(r.left))).size===1, largeur: Math.round(cs[0].width), nm:nm.height, scrollX: document.documentElement.scrollWidth>innerWidth }; });
    ok(c.colonne && !c.scrollX, w+' : cartes du prospect en colonne, sans débordement ('+c.largeur+' px)'); ok(c.nm>=39.5, w+' : Nouvelle main >= 40 px ('+Math.round(c.nm)+')');
    // quiz
    for(const k of ['lithofacies','maturation','rockeval','seismic']){ await open(pg, '.mg-card[data-quiz="'+k+'"]'); const q = await pg.evaluate(()=>[...document.querySelectorAll('#quizModal .qz-choice')].map(e=>e.getBoundingClientRect().height)); ok(q.length>=2 && Math.min(...q)>=43.5, w+' : quiz '+k+' réponses >= 44 px ('+Math.round(Math.min(...q))+')'); }
    await ctx.close(); }
  // ordinateur : log côte à côte, légende ouverte, pas de colonne collante
  { const pg=await br.newPage({viewport:{width:1400,height:900}}); pg.on('pageerror',e=>errs.push(e.message)); await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_menu','full')}catch(e){}});
    await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(250); await pg.click('.menu-tab[data-tab="minigames"]'); await pg.click('#logGameOpenBtn'); await pg.waitForTimeout(500);
    const d = await pg.evaluate(()=>({ cote: document.getElementById('lgmQuestion').getBoundingClientRect().left > document.getElementById('lgmLog').getBoundingClientRect().right-5, legende: document.getElementById('lgmDet').open, cols: !!document.querySelector('.lgm-cols') }));
    ok(d.cote && d.legende && !d.cols, 'ordinateur : log et question côte à côte, légende ouverte, aucune colonne collante'); await pg.close(); }
  console.log('erreurs JS', errs); console.log(ko?'ECHECS: '+ko:'TOUT OK'); await br.close(); process.exit(ko||errs.length?1:0); })();
