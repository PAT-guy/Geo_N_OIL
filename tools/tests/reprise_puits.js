// Reprise de puits (V5.18) : un puits perdu par panne technique ou par mauvais horizon se reprend une fois (55 % d'un puits neuf) ; un vrai sec non ; tirage propre à la reprise ; coût du premier forage conservé ; boutons et refus.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1300,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  await pg.evaluate(async()=>{ document.getElementById('geoSeed').value='2024'; menuConfig.mode='junior'; menuConfig.basinType='paris'; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); setSpeed(0); G.budget=80e6; LABOPT.pick=false; G.labOpt.pick=false; G.labPick=null; performStudy(null,'gravity'); });
  const r = await pg.evaluate(()=>{
    const out={}; const pool=blocks.filter(x=>!x.inSalt && !x.isOffshore && !x.well && !x.dryHole);
    const mkDry=(b,info,wrong)=>{ b.dryHole=true; b.wrongTarget=!!wrong; b.dryHoleInfo=Object.assign({method:'vertical',cost:3e6,techFail:false,pick:null,month:0,limitingFactor:'piège',factors:{piège:.5,réservoir:.5,couverture:.5,charge:.5}},info); };
    // 1. états
    const a=pool[0], bT=pool[1], cW=pool[2], dF=pool[3];
    mkDry(a,{techFail:false},false); out.sGeo=reentryState(a);
    mkDry(bT,{techFail:true},false); out.sTech=reentryState(bT);
    mkDry(cW,{techFail:false},true); out.sWrong=reentryState(cW);
    mkDry(dF,{techFail:true,method:'frac'},false); out.sFrac=reentryState(dF);
    // 2. coût : 55 % d'un puits neuf
    const eq='standard'; const full=drillDepthEstimate(bT)*EQUIPMENT[eq].costM*METHODS.vertical.costMult*siteCost(bT,drillCostFactor()); const c=reentryCost(bT,eq); out.ratio=c.cost/full;
    // 3. reprise après panne : géologie acquise, le tirage de reprise est propre
    const bud=G.budget; launchReentry(bT.id,'renforce'); out.paid=bud-G.budget; out.queued=G.drilling.some(d=>d.blockId===bT.id && d.reentry); out.priorTech=G.drilling.find(d=>d.blockId===bT.id).priorTechFail;
    out.double=(()=>{ const n=G.drilling.length; launchReentry(bT.id,'renforce'); return G.drilling.length-n; })();
    for(let i=0;i<40&&G.drilling.length;i++) monthTick(); drillRevealQueue.length=0; drillRevealPlaying=false; document.getElementById('drillRevealModal')?.classList.remove('open');
    out.done=bT.reentryDone; out.isWell=!!bT.well; out.dryAfter=bT.dryHole; out.costKept=bT.well ? bT.well.cost>=3e6+c.cost*0.5 : null; out.techAfter=bT.dryHoleInfo ? bT.dryHoleInfo.techFail : null;
    out.again=reentryState(bT);
    // 4. vrai sec refusé
    const n0=G.drilling.length; launchReentry(a.id,'standard'); out.geoRefused=G.drilling.length===n0;
    // 5. mauvais horizon : il faut changer d'horizon quand l'option de visée est active
    LABOPT.pick=true; G.labOpt.pick=true; cW.dryHoleInfo.pick=2; G.labPick=2; const n1=G.drilling.length; launchReentry(cW.id,'renforce'); out.samePickRefused=G.drilling.length===n1;
    G.labPick=STRAT.findIndex(l=>l.role==='reservoir'); launchReentry(cW.id,'renforce'); out.newPickAccepted=G.drilling.length===n1+1; G.drilling.length=0; cW.el?.classList.remove('drilling'); LABOPT.pick=false; G.labOpt.pick=false; G.labPick=null;
    // 6. matériel trop faible refusé
    const e1=pool[4]; mkDry(e1,{techFail:true},false); const eqL=EQUIPMENT.leger; const cl=reentryCost(e1,'leger'); out.tooDeepFlag=cl.tooDeep===(cl.depth>eqL.maxDepth);
    // 7. panneau : boutons visibles pour une panne, note pour un vrai sec
    selectedBlock=e1.id; renderGeoPanel(e1); out.btn=(document.getElementById('geoContent').innerHTML.match(/reentryTap\(/g)||[]).length;
    renderGeoPanel(a); out.geoNote=/ne se reprend pas/.test(document.getElementById('geoContent').innerHTML) && !/reentryTap\(/.test(document.getElementById('geoContent').innerHTML);
    // 8. déterminisme : même graine, même résultat pour la reprise
    const rd1=SR('drill',`${e1.id}|vertical|re`)(), rd2=SR('drill',`${e1.id}|vertical|re`)(), rd0=SR('drill',`${e1.id}|vertical`)(); out.det=rd1===rd2; out.distinct=rd1!==rd0;
    return out; });
  ok(r.sGeo && !r.sGeo.ok && /géologie/.test(r.sGeo.why),'vrai sec : pas de reprise '+JSON.stringify(r.sGeo));
  ok(r.sTech && r.sTech.ok && r.sTech.kind==='tech','panne technique : reprise possible');
  ok(r.sWrong && r.sWrong.ok && r.sWrong.kind==='target','mauvais horizon : reprise possible');
  ok(r.sFrac===null,'puits fracturé : pas de reprise');
  ok(Math.abs(r.ratio-0.55)<1e-6,'coût = 55 % d\'un puits neuf '+r.ratio.toFixed(3));
  ok(r.paid>0 && r.queued && r.priorTech===true && r.double===0,'lancement payé, une seule reprise en cours à la fois');
  ok(r.done===true && (!r.again || !r.again.ok),'une seule tentative par bloc');
  ok((r.isWell && r.dryAfter===false && r.costKept) || (!r.isWell && r.dryAfter===true),'résultat cohérent : puits productif (coût du premier forage conservé) ou à nouveau perdu '+JSON.stringify([r.isWell,r.dryAfter,r.costKept]));
  ok(r.isWell===true || r.techAfter!==null,'après panne, la géologie est acquise : la reprise ne rate que par la technique');
  ok(r.geoRefused,'vrai sec : lancement refusé');
  ok(r.samePickRefused && r.newPickAccepted,'mauvais horizon : même horizon refusé, un autre accepté');
  ok(r.tooDeepFlag,'matériel trop faible signalé');
  ok(r.btn===3 && r.geoNote,'panneau Bloc : trois matériels pour une panne, note pour un vrai sec '+r.btn);
  ok(r.det && r.distinct,'tirage de reprise déterministe et distinct du premier');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
