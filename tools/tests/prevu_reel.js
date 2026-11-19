// Prévu contre réel (V5.29) : avant chaque forage le jeu garde son annonce (toit et qualité, avec intervalle) ; le log du forage donne la vérité ; le joueur voit si l'intervalle était honnête.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1300,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const r = await pg.evaluate(async()=>{ document.getElementById('geoSeed').value='77'; menuConfig.mode='expert'; menuConfig.basinType='paris'; menuConfig.seed='77'; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); setSpeed(0); G.budget=80e6; LABOPT.pick=false; G.labOpt.pick=false; performStudy(null,'gravity');
    const out={}; const n=Math.sqrt(blocks.length)|0, idOf=(x,y)=>blocks.find(b=>b.x===x&&b.y===y).id;
    for(const [a,b2] of [[idOf(1,2),idOf(n-2,2)],[idOf(1,n-3),idOf(n-2,n-3)]]){ G.sectionA=a; G.sectionB=b2; performStudy(null,'seismic2d'); }
    const land=blocks.filter(b=>!b.isOffshore&&!b.inSalt);
    const measured=land.filter(b=>b.estimate?.depth!==undefined&&!b.well&&!b.dryHole)[0];
    const interp=land.find(b=>b.estimate?.depth===undefined && gsKrig(b,'z') && gsKrig(b,'z').n>=2);
    const logs=[]; const orig=window.addLog; window.addLog=(m,ty)=>{ logs.push(String(m)); return orig(m,ty); };
    const run=id=>{ drillBlock(id,'vertical','renforce'); for(let i=0;i<40&&G.drilling.length;i++) monthTick(); drillRevealQueue.length=0; drillRevealPlaying=false; document.getElementById('drillRevealModal')?.classList.remove('open'); document.getElementById('alertModal')?.classList.remove('open'); };
    const snapM = gsPredSnapshot(measured), snapI = gsPredSnapshot(interp); out.snapM=snapM; out.snapIsrc=snapI.z&&snapI.z.src;
    run(measured.id); run(interp.id);
    out.bm=measured.predCheck, out.bi=interp.predCheck; out.hasAt=!!measured.predAtDrill;
    out.stats=G.predStats; window.addLog=orig; out.logs=logs.filter(l=>/Prévu contre réel/.test(l)).length; out.logTxt=(logs.find(l=>/Prévu contre réel/.test(l))||'').slice(0,160);
    selectedBlock=measured.id; renderGeoPanel(measured); const t=document.getElementById('geoContent').textContent; out.panel=/Prévu et réel/.test(t) && /Toit du réservoir/.test(t) && /sur \d+/.test(t);
    // réentrée : l'annonce initiale n'est pas écrasée
    const before=JSON.stringify(measured.predCheck); measured.predAtDrill=measured.predAtDrill; out.keep=before===JSON.stringify(measured.predCheck);
    // sauvegarde et chargement
    saveGame(); const k=measured.id; G.predStats=null; measured.predCheck=null; loadGame(); out.saved = !!blocks[k].predCheck && !!G.predStats && G.predStats.z.n>=1;
    // Découverte : rien
    return out; });
  ok(r.snapM && r.snapM.z && r.snapM.z.src==='mesure' && r.snapM.z.h>=1 && r.snapIsrc==='krigeage','annonce avant forage : intervalle de la mesure, ou 90 % du krigeage pour un bloc interpolé '+JSON.stringify([r.snapM&&r.snapM.z&&r.snapM.z.src, r.snapIsrc]));
  ok(r.hasAt && r.bm && r.bm.z && typeof r.bm.z.real==='number' && typeof r.bm.z.hit==='boolean','forage d\'un bloc mesuré : prévu, réel et verdict enregistrés '+JSON.stringify(r.bm&&r.bm.z));
  ok(r.bi && r.bi.z && r.bi.z.src==='krigeage','forage d\'un bloc interpolé : l\'annonce du krigeage est contrôlée '+JSON.stringify(r.bi&&r.bi.z));
  ok(r.stats && r.stats.z.n>=2 && r.stats.z.h<=r.stats.z.n,'compteur de partie : '+JSON.stringify(r.stats));
  ok(r.logs>=2,'une ligne « Prévu contre réel » au journal par forage ('+r.logs+')');
  ok(r.panel,'fiche du bloc foré : section « Prévu et réel » avec le compteur');
  ok(r.saved,'sauvegarde : le contrôle et le compteur reviennent au chargement');
  const sim = await pg.evaluate(async()=>{ document.getElementById('geoSeed').value='55'; menuConfig.mode='decouverte'; menuConfig.basinType='paris'; menuConfig.seed='55'; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); setSpeed(0); G.budget=20e6; performStudy(null,'gravity'); const b=blocks.find(x=>!x.isOffshore&&!x.inSalt); drillBlock(b.id,'vertical','renforce'); for(let i=0;i<40&&G.drilling.length;i++) monthTick(); drillRevealQueue.length=0; drillRevealPlaying=false; return { has:!!b.predAtDrill, chk:!!b.predCheck, stats:G.predStats||null }; });
  ok(!sim.has && !sim.chk && !sim.stats,'mode Découverte : aucun suivi prévu contre réel');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
