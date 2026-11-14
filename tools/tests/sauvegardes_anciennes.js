// Compatibilité des sauvegardes : de vraies parties sauvegardées par d'anciennes versions du jeu (tirées de l'historique git) se chargent dans la version actuelle,
// se poursuivent sans erreur et ouvrent tous les panneaux (étude, finance, glossaire, informateur, récap), avec des valeurs par défaut pour les champs ajoutés depuis.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const { execSync } = require('child_process');
const REPO = path.resolve(__dirname,'../..');
const OLD = [ ['c7f9133','V4.45'], ['76c9ad4','V4.56'], ['5ba1c66','V4.63'], ['264822a','V4.71'] ];
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const stub = "try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}";
  for(const [sha,label] of OLD){
    let html; try { html = execSync(`git -C ${REPO} show ${sha}:index.html`, {maxBuffer:64*1024*1024}).toString('utf8'); } catch(e){ console.log('(commit '+sha+' absent de l\'historique, ignoré)'); continue; }
    const f = '/tmp/old_'+sha+'.html'; fs.writeFileSync(f, html);
    // 1. fabriquer la sauvegarde avec l'ancienne version
    const p1 = await br.newPage(); const e1=[]; p1.on('pageerror',e=>e1.push(e.message)); await p1.addInitScript(stub); await p1.goto('file://'+f); await p1.waitForTimeout(500);
    const saved = await p1.evaluate(async ()=>{ document.querySelector('#basinPicker button[data-val="paris"]')?.click(); document.getElementById('geoSeed').value='4321'; labOptLaunch(); await new Promise(r=>setTimeout(r,900));
      try { performStudy(null,'gravity'); } catch(e){}
      G.budget = 40e6; const cands = blocks.filter(x=>!x.inSalt).sort((x,z)=>x.topOfReservoir-z.topOfReservoir).slice(0,25).sort((x,z)=>z.trueProbability-x.trueProbability);
      for(const b of cands){ if(G.wells.length>=1) break; b.studyLevel = Math.max(b.studyLevel,1); try { drillBlock(b.id,'vertical','standard', null); } catch(e){}
        for(let i=0;i<12;i++){ try { monthTick(); } catch(e){ break; } } drillRevealQueue.length=0; drillRevealPlaying=false; }
      for(let i=0;i<18;i++){ try { monthTick(); } catch(e){ break; } } drillRevealQueue.length=0; drillRevealPlaying=false;
      saveGame(); return { raw: localStorage.getItem('geoexplorer_save'), month:G.month, budget:Math.round(G.budget), wells:G.wells.length, dry:blocks.filter(x=>x.dryHole).length, n:blocks.length, p0:blocks[0].trueProbability, price:G.price }; });
    await p1.close();
    if(!saved.raw){ ok(false, label+' : l\'ancienne version n\'a pas produit de sauvegarde '+e1.slice(0,1)); continue; }
    // 2. charger dans la version actuelle
    const p2 = await br.newPage(); const e2=[]; p2.on('pageerror',e=>e2.push(e.message)); await p2.addInitScript(stub); await p2.addInitScript(raw=>{ try{ localStorage.setItem('geoexplorer_save', raw); }catch(e){} }, saved.raw);
    await p2.goto('file://'+path.resolve(REPO,'index.html')); await p2.waitForTimeout(600);
    const R = await p2.evaluate(async (exp)=>{ const o={}; try { loadGame(); } catch(e){ o.loadErr = e.message; return o; } await new Promise(r=>setTimeout(r,600));
      o.same = G.month===exp.month && Math.round(G.budget)===exp.budget && G.wells.length===exp.wells && blocks.filter(x=>x.dryHole).length===exp.dry && blocks.length===exp.n && blocks[0].trueProbability===exp.p0;
      o.defaults = { simple:!!G.simple, pcalW:PCAL_W, pcalE:PCAL_E, hist:Array.isArray(G.sectionsHistory)||G.sectionsHistory===undefined, inf:getComputedStyle(document.getElementById('btnInformant')).display!=='none' };
      const errs=[]; const t = (n,fn)=>{ try{ fn(); }catch(e){ errs.push(n+' : '+e.message); } };
      t('mois', ()=>{ for(let i=0;i<36;i++) monthTick(); }); t('coupe', ()=>{ setTool('section'); onBlockClick(0); onBlockClick(Math.min(5,blocks.length-1)); renderSection(); labDrawSecLine(); });
      t('panneau bloc', ()=>{ const b=blocks.find(x=>x.well||x.dryHole)||blocks[0]; selectedBlock=b.id; renderGeoPanel(b); renderStudiesPanel(b); secActionsRender(); });
      t('guide', ()=>{ renderGuide(); guideCompute(); }); t('finance', ()=>{ if(G.financeMode) renderFinancePanel(); }); t('gisements', ()=>{ renderGisementsPanel(); });
      t('informateur', ()=>{ informantOpen(); informantRender(); informantClose(); }); t('glossaire', ()=>{ showPauseView('glossary'); });
      t('prix', ()=>{ for(let i=0;i<24;i++) stepPrice(); }); t('abandon', ()=>{ abandonLiability(); });
      { const w = G.wells.find(x=>x.status==='producing'); o.hadWell = !!w; if(w){ const b0=G.budget, c=abandonCost(w), liab=abandonLiability(); t('fermeture', ()=>{ closeWell(w.blockId); }); o.closeInfo = { st:w.status, paid:w.abandonPaid, d:Math.round(b0-G.budget), c:Math.round(c), liab:Math.round(liab) }; o.close = w.status==='closed' && w.abandonPaid===true && Math.round(b0-G.budget)===Math.round(c) && c>0 && liab>=c; } }
      t('sauvegarde', ()=>{ saveGame(); }); t('recap', ()=>{ G.budget = Math.max(G.budget, 1e6); showEnd('quit'); });
      o.errs = errs; o.monthAfter = G.month; o.recap = document.getElementById('endStats').textContent.length>0; return o; }, saved);
    ok(!R.loadErr, label+' : la sauvegarde se charge '+(R.loadErr||''));
    if(R.loadErr){ await p2.close(); continue; }
    ok(R.same, label+' : mois, budget, puits, puits secs, blocs et probabilités sont ceux de la sauvegarde ('+saved.month+' mois, '+saved.wells+' productif(s), '+saved.dry+' sec(s))');
    ok(R.defaults.simple===false && R.defaults.pcalW===0 && R.defaults.pcalE===3 && R.defaults.inf, label+' : champs ajoutés depuis par défaut : mode simple coupé, étalonnage par rang seul, informateur visible '+JSON.stringify(R.defaults));
    ok(R.errs.length===0 && R.monthAfter>=saved.month+36 && R.recap, label+' : 36 mois de plus, coupe, panneaux, informateur, glossaire, prix, sauvegarde et récap sans erreur '+JSON.stringify(R.errs.slice(0,2)));
    ok(R.hadWell && R.close, label+' : un puits productif de l\'ancienne version produit, ressort au passif d\'abandon et se ferme en payant son abandon (puits : '+saved.wells+') '+JSON.stringify(R.closeInfo||null));
    ok(e2.length===0, label+' : aucune erreur JS à la page '+e2.slice(0,2).join('|'));
    await p2.close();
  }
  await br.close(); console.log(ko? 'ECHECS: '+ko : 'TOUT OK'); process.exit(ko?1:0); })();
