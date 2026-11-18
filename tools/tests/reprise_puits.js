// Reprise de puits (V5.18) : un puits perdu par panne technique ou mauvais horizon se reprend une fois à 55 % du coût ; un vrai puits sec ne se reprend pas ; tirage propre, historique conservé, aucun double comptage.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1300,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  await pg.evaluate(async()=>{ document.getElementById('geoSeed').value='2024'; menuConfig.mode='junior'; menuConfig.basinType='paris'; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); setSpeed(0); G.budget=30e6; LABOPT.pick=false; G.labOpt.pick=false; performStudy(null,'gravity'); });
  const r = await pg.evaluate(()=>{
    const out={}; const cand=blocks.filter(b=>!b.inSalt && !b.isOffshore && !b.well && !b.dryHole);
    const fake=(b,info,wrong)=>{ b.dryHole=true; b.wrongTarget=!!wrong; b.dryHoleInfo={ method:'vertical', cost:3e6, techFail:!!info.techFail, pick:info.pick??null, month:G.month, limitingFactor:'piège', factors:{piège:0.5,réservoir:0.5,couverture:0.5,charge:0.5}, studyLevelAtDrill:1 }; };
    // états : vrai sec, panne, mauvais horizon, frac
    const [bDry,bTech,bWrong,bFrac]=cand; fake(bDry,{techFail:false}); fake(bTech,{techFail:true}); fake(bWrong,{techFail:false},true); fake(bFrac,{techFail:true}); bFrac.dryHoleInfo.method='frac';
    out.sDry=reentryState(bDry); out.sTech=reentryState(bTech); out.sWrong=reentryState(bWrong); out.sFrac=reentryState(bFrac);
    out.htmlDry=/Puits sec par la géologie/.test(reentryHtml(bDry)); out.htmlTech=(reentryHtml(bTech).match(/reentryTap/g)||[]).length;
    // coût : 55 % d'un puits neuf
    const c=reentryCost(bTech,'standard'); const eq=EQUIPMENT.standard; out.costOk=Math.abs(c.cost-0.55*c.depth*eq.costM*METHODS.vertical.costMult*siteCost(bTech,drillCostFactor()))<1;
    // lancement : budget débité, forage en cours, bloc non rouvert deux fois
    const b0=G.budget; launchReentry(bTech.id,'renforce'); out.paid=Math.round(b0-G.budget); out.paidExpect=Math.round(reentryCost(bTech,'renforce').cost); out.inProg=G.drilling.some(d=>d.blockId===bTech.id && d.reentry); out.priorTech=G.drilling.find(d=>d.reentry)?.priorTechFail;
    const n=G.drilling.length; launchReentry(bTech.id,'renforce'); out.noDouble=G.drilling.length===n;
    // résolution : on avance le temps
    for(let i=0;i<30 && G.drilling.some(d=>d.reentry);i++) monthTick(); drillRevealQueue.length=0; drillRevealPlaying=false; document.getElementById('drillRevealModal')?.classList.remove('open');
    out.resolvedWell=!!bTech.well; out.stillDry=!!bTech.dryHole; out.done=bTech.reentryDone; out.wellCostIncludesFirst=bTech.well ? bTech.well.cost>=3e6+reentryCost(bTech,'renforce').cost*0.9 : null; out.flag=bTech.well?bTech.well.reentry:null; out.from=!!bTech.reentryFrom;
    out.noSecond=!reentryState(bTech) || !!reentryState(bTech).why;
    // vrai sec : lancement refusé, rien débité
    const b1=G.budget; launchReentry(bDry.id,'standard'); out.dryRefused=G.budget===b1;
    // mauvais horizon avec option de ciblage : même horizon refusé, autre horizon accepté
    LABOPT.pick=true; G.labOpt.pick=true; bWrong.dryHoleInfo.pick=2; G.labPick=2; const b2=G.budget; launchReentry(bWrong.id,'renforce'); out.samePickRefused=G.budget===b2; G.labPick=null; launchReentry(bWrong.id,'renforce'); out.noPickRefused=G.budget===b2; G.labPick=3; launchReentry(bWrong.id,'renforce'); out.otherPickOk=G.budget<b2;
    // déterminisme : même graine, même résultat
    out.seedA=SR('drill', bTech.id+'|vertical|re')(); out.seedB=SR('drill', bTech.id+'|vertical|re')(); out.seedOrig=SR('drill', bTech.id+'|vertical')();
    return out; });
  ok(r.sDry && !r.sDry.ok && r.sTech && r.sTech.ok && r.sTech.kind==='tech' && r.sWrong && r.sWrong.ok && r.sWrong.kind==='target' && r.sFrac===null,'états : vrai sec refusé, panne et mauvais horizon proposés, frac exclu');
  ok(r.htmlDry && r.htmlTech===3,'panneau Bloc : note pour le vrai sec, trois matériels pour une panne');
  ok(r.costOk,'coût de reprise = 55 % d\'un puits neuf');
  ok(r.paid===r.paidExpect && r.inProg && r.priorTech===true && r.noDouble,'lancement : coût débité, forage de reprise en cours, pas de double lancement');
  ok(r.dryRefused,'un vrai puits sec ne se reprend pas (rien débité)');
  ok(r.samePickRefused && r.noPickRefused && r.otherPickOk,'mauvais horizon : même horizon ou aucun refusé, un autre accepté');
  // après panne, la géologie est acquise : la reprise réussit si le matériel tient (renforcé), sinon le bloc reste marqué reprise tentée
  ok(r.done===true && (r.resolvedWell ? (r.stillDry===false && r.flag===true && r.from && r.wellCostIncludesFirst) : r.stillDry===true),'résolution : bloc redevenu producteur avec historique et coût du premier forage, ou sec avec reprise marquée faite '+JSON.stringify([r.resolvedWell,r.stillDry,r.done]));
  ok(r.noSecond,'une seule reprise par bloc');
  ok(r.seedA===r.seedB && r.seedA!==r.seedOrig,'tirage de reprise déterministe et distinct du premier');
  // sur plusieurs graines : la reprise après panne ne rate jamais par la géologie
  const stat = await pg.evaluate(()=>{ let n=0, geoFail=0; for(let sd=1; sd<=30; sd++){ for(const b of blocks.filter(x=>!x.inSalt && !x.well && !x.dryHole).slice(0,6)){ b.dryHole=true; b.wrongTarget=false; b.dryHoleInfo={ method:'vertical', cost:1e6, techFail:true, limitingFactor:'piège', factors:{piège:0.5,réservoir:0.5,couverture:0.5,charge:0.5}, studyLevelAtDrill:1, month:0 }; b.reentryDone=false; G.labPick=null; LABOPT.pick=false; const eq='renforce'; const c=reentryCost(b,eq); if(c.tooDeep){ b.dryHole=false; b.dryHoleInfo=null; continue; } const d={ blockId:b.id, method:'vertical', equip:eq, cost:c.cost, depth:c.depth, cf:1, lat:0, prog:null, startMonth:0, endMonth:1, est:null, reentry:true, priorTechFail:true }; G.drilling.push(d); n++; b.__x=1; try{ resolveDrillingCore(d); }catch(e){} G.drilling=G.drilling.filter(x=>x!==d); if(b.dryHole && b.dryHoleInfo && !b.dryHoleInfo.techFail) geoFail++; if(b.well){ G.wells=G.wells.filter(w=>w!==b.well); b.well=null; } b.dryHole=false; b.dryHoleInfo=null; b.reentryDone=false; } } return {n,geoFail}; });
  ok(stat.n>0 && stat.geoFail===0,'après une panne, jamais d\'échec par la géologie à la reprise '+JSON.stringify(stat));
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
