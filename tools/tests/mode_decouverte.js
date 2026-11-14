// Mode Découverte : premier bouton de l'accueil, carte 8×8 du Bassin parisien à terre, règles allégées (finance, marché, informateur, abandon, accidents coupés),
// guide ouvert, leçon après chaque forage, porte vers Junior ; les autres modes ne changent pas.
const { chromium, devices } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const ctx=await br.newContext({...devices['iPhone 13']}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const first = await pg.evaluate(()=>{ const b=[...document.querySelectorAll('#quickModes .q-mode')]; return { order:b.map(x=>x.dataset.mode), h:Math.round(b[0].getBoundingClientRect().height) }; });
  ok(first.order[0]==='decouverte' && first.order[1]==='junior', 'la Découverte est le premier bouton de l\'accueil, devant Junior '+JSON.stringify(first.order));
  const ban0 = await pg.evaluate(()=>({ shown:getComputedStyle(document.getElementById('firstVisit')).display!=='none', btnH:Math.round(document.getElementById('firstVisitGo').getBoundingClientRect().height) }));
  ok(ban0.shown && ban0.btnH>=40, 'premier lancement : le bandeau « Première visite ? » est visible, boutons de 40 px au moins');
  await pg.locator('#firstVisitGo').tap(); await pg.waitForTimeout(200);
  const ban1 = await pg.evaluate(()=>({ hidden:getComputedStyle(document.getElementById('firstVisit')).display==='none', mode:menuConfig.mode, played:localStorage.getItem('geoexplorer_played') }));
  ok(ban1.hidden && ban1.mode==='decouverte' && ban1.played===null, '« Essayer la Découverte » choisit le mode et masque le bandeau sans marquer la visite comme faite');
  await pg.locator('#quickModes .q-mode[data-mode="decouverte"]').tap(); await pg.waitForTimeout(200);
  const cfg = await pg.evaluate(()=>({ mode:menuConfig.mode, gs:menuConfig.gridSize, basin:menuConfig.basinType, off:menuConfig.offshore, fin:menuConfig.financeMode, sel:document.querySelector('#mapSizePicker button.sel')?.dataset.val }));
  ok(cfg.mode==='decouverte' && cfg.gs===8 && cfg.basin==='paris' && cfg.off===false && cfg.fin===false && cfg.sel==='8', 'choisir la Découverte règle 8×8, Bassin parisien, à terre, sans finance '+JSON.stringify(cfg));
  const T = await pg.evaluate(async ()=>{ const o={}; document.getElementById('geoSeed').value='808'; labOptLaunch(); await new Promise(r=>setTimeout(r,900));
    o.start = { gs:G.gridSize, n:blocks.length, simple:G.simple, fin:G.financeMode, budget:G.budget, mode:G.mode, basin:G.basinType, off:G.offshore };
    showMobileScreen('map'); await new Promise(r=>setTimeout(r,400)); { const cr = blocks[7].el.getBoundingClientRect(); o.fits = cr.right <= window.innerWidth + 1 && cr.width >= 30; o.cell = Math.round(cr.width); o.played = localStorage.getItem('geoexplorer_played'); }
    o.inf = getComputedStyle(document.getElementById('btnInformant')).display==='none'; o.guide = document.getElementById('guideBar').style.display!=='none' && guideHidden===false;
    // marché calme : aucun événement planifié, prix proche de 80
    let minP=1e9, maxP=0, planned=0; for(let g=0; g<200; g++){ G.marketEvents=[]; G.price=80; G.priceTrend=0; G.priceTrendTarget=0; for(let m=1;m<=120;m++){ G.month=m; stepPrice(); planned += G.marketEvents.length; minP=Math.min(minP,G.price); maxP=Math.max(maxP,G.price); } }
    o.market = { planned, minP:+minP.toFixed(1), maxP:+maxP.toFixed(1) };
    o.aband = abandonCost({cost:5e6, offshore:false}) === 0 && abandonLiability() === 0;
    // forage avec leçon
    G.month=1; G.price=80; G.budget=12e6; const b = blocks.find(x=>!x.inSalt); b.studyLevel=1; selectedBlock=b.id; ensureEst(b).p = 0.4; const p = drillPlan(b,'vertical');
    drillBlock(b.id,'vertical',p.equip,b.playerEst); for(let i=0;i<30 && G.drilling.some(d=>d.blockId===b.id); i++) monthTick();
    o.estAt = b.estAtDrill; return o; });
  ok(T.start.gs===8 && T.start.n===64 && T.start.simple===true && T.start.fin===false && T.start.budget===12e6 && T.start.basin==='paris' && T.start.off===false, 'la partie démarre en 8×8 (64 blocs), mode simple, sans finance, budget de 12 M$ '+JSON.stringify(T.start));
  ok(T.fits, 'téléphone : la carte de 8×8 tient dans la largeur, huitième colonne comprise (cases de '+T.cell+' px)');
  ok(T.played==='1', 'lancer une partie marque la première visite comme faite');
  ok(T.inf && T.guide, 'l\'informateur est masqué et le guide est ouvert');
  ok(T.market.planned===0 && T.market.minP>50 && T.market.maxP<112, 'marché calme : aucun événement planifié, sur 200 parties de 10 ans le prix reste entre 50 et 112 $ (observé : '+T.market.minP+' à '+T.market.maxP+')');
  ok(T.aband, 'aucun coût d\'abandon');
  await pg.waitForTimeout(2200);
  const les = await pg.evaluate(()=>({ txt:document.getElementById('drillRevealDetail').textContent, shown:document.getElementById('drillRevealModal').classList.contains('open') }));
  ok(les.shown && /Leçon/.test(les.txt) && /annoncé environ 40 %/.test(les.txt) && /Le log de ce puits montre/.test(les.txt) && /porosité/.test(les.txt), 'après le forage, la leçon relie l\'estimation annoncée (40 %) au résultat');
  const fin = await pg.evaluate(()=>{ document.getElementById('drillRevealModal').classList.remove('open'); drillRevealQueue.length=0; drillRevealPlaying=false; G.budget=15e6; try{ showEnd('time'); }catch(e){} const btn=document.getElementById('endJuniorBtn'); return { btn:!!btn, h:btn?Math.round(btn.getBoundingClientRect().height):0, txt:document.getElementById('endStats').textContent.includes('Découverte terminée') }; });
  ok(fin.btn && fin.txt, 'la fin de partie propose de passer à Junior');
  await pg.evaluate(()=>document.getElementById('endJuniorBtn').click()); await pg.waitForTimeout(200);
  const back = await pg.evaluate(()=>({ mode:menuConfig.mode, gs:menuConfig.gridSize, fin:menuConfig.financeMode, menu:!document.getElementById('menu').classList.contains('hidden'), off:menuConfig.offshore }));
  ok(back.mode==='junior' && back.gs===12 && back.fin===true && back.menu && back.off===true, 'Passer à Junior rend la carte de 12×12, la finance et l\'offshore '+JSON.stringify(back));
  // les autres modes sont inchangés
  const J = await pg.evaluate(async ()=>{ document.getElementById('geoSeed').value='909'; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); G.marketEvents=[]; G.month=0; let planned=0; for(let m=1;m<=3000;m++){ G.month=m; stepPrice(); planned+=G.marketEvents.length; }
    return { simple:G.simple, inf:getComputedStyle(document.getElementById('btnInformant')).display!=='none', planned:planned>0, ab:abandonCost({cost:5e6,offshore:false})===600000 }; });
  ok(J.simple===false && J.inf && J.planned && J.ab, 'Junior garde l\'informateur, les événements de marché et le coût d\'abandon');
    // le bandeau ne revient pas après une partie, et « Plus tard » l'écarte
  const pg2 = await ctx.newPage(); await pg2.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1'); localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg2.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg2.waitForTimeout(500);
  ok(await pg2.evaluate(()=>getComputedStyle(document.getElementById('firstVisit')).display==='none'), 'après une première partie, le bandeau ne revient pas'); await pg2.close();
  const ctx3 = await br.newContext({...devices['iPhone 13']}); const pg3 = await ctx3.newPage(); await pg3.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
  await pg3.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg3.waitForTimeout(500); await pg3.locator('#firstVisitLater').tap(); await pg3.waitForTimeout(150);
  ok(await pg3.evaluate(()=>getComputedStyle(document.getElementById('firstVisit')).display==='none' && localStorage.getItem('geoexplorer_played')==='1'), '« Plus tard » écarte le bandeau pour de bon'); await ctx3.close();
  ok(errs.length===0, 'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko? 'ECHECS: '+ko : 'TOUT OK'); process.exit(ko?1:0); })();
