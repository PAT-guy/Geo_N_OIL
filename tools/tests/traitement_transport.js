// Traitement et transport (V4.97) : capacité de traitement (huile + eau) et d'export (camion, pipeline) partagées par les puits à terre hors gaz, bridage proportionnel,
// coût de transport par baril, agrandissements, anciennes sauvegardes et Découverte sans capacité.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1280,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const R = await pg.evaluate(async()=>{ const o={}; document.getElementById('geoSeed').value='2468'; menuConfig.mode='junior'; menuConfig.basinType='aquitaine'; menuConfig.gridSize=12; menuConfig.offshore=false; labOptLaunch(); await new Promise(r=>setTimeout(r,1000)); setSpeed(0); LABOPT.pick=false;
    G.budget=1e9; G.price=80; checkEndConditions=function(){}; const land=blocks.filter(b=>!b.inSalt&&!b.isOffshore);
    o.on = G.infraOn===true && !!infraState() && infraState().proc===0 && infraState().pipe===-1;
    const mk=(b,q,extra)=>({blockId:b.id,cost:5e6,offshore:false,production:q,comps:[{q0:q,t0:0}],monthsActive:10,status:'producing',isGas:false,eorActive:false,eorMonthsLeft:0,wp:null,fp:null,...extra});
    // 1. sous la capacité : pas de bridage, transport par camion
    G.wells=[mk(land[1],2000)]; let e=wellEconomics(G.wells[0]), raw=wellEconomicsRaw(G.wells[0]); o.under = e.curt===1 && Math.abs(e.transport-2000*INFRA.truckCost)<1e-6 && Math.abs(e.opex-(raw.opex+e.transport))<1e-6 && Math.abs(e.revenue-raw.revenue)<1e-6;
    // 2. saturation du traitement : 5 puits de 8 000 barils (40 000 > 25 000)
    G.wells=[1,2,3,4,5].map(i=>mk(land[i],8000)); const L=infraLoad(); const s=infraFactor(); o.sat = Math.abs(L.liquid-40000)<1e-6 && Math.abs(s-25000/40000)<1e-9;
    e=wellEconomics(G.wells[0]); raw=wellEconomicsRaw(G.wells[0]); o.scale = Math.abs(e.revenue-raw.revenue*s)<1e-6 && e.fixedOp===raw.fixedOp && Math.abs(e.prodEffective-8000*s)<1e-9 && e.curt===s && Math.abs(e.opex-(raw.fixedOp + raw.prodEffective*raw.varOp*s + e.transport))<1e-6;
    // l'eau compte dans la charge de traitement
    G.wells=[mk(land[1],20000,{wp:{kind:'conv',b0:0.5,tb:5,bmax:0.5}})]; const Lw=infraLoad(); o.water = Lw.liquid>Lw.oil+19999 && infraFactor()<25000/Lw.liquid+1e-9+0.0;
    // 3. saturation de la route : traitement agrandi, huile > 30 000 (camion)
    G.infra.proc=3; G.wells=[1,2,3,4].map(i=>mk(land[i],9000)); o.route = Math.abs(infraFactor()-30000/36000)<1e-9;
    // 4. agrandissements
    G.infra.proc=0; G.infra.pipe=-1; let bud=G.budget; infraUpgradeProc(); o.up = G.infra.proc===1 && Math.abs((bud-G.budget)-INFRA.procCapex[1])<1; bud=G.budget; infraBuildPipe(); o.pipe = G.infra.pipe===0 && Math.abs((bud-G.budget)-INFRA.pipeCapex[0])<1 && infraRoute(G.infra).cost===INFRA.pipeCost;
    infraUpgradeProc(); infraUpgradeProc(); infraUpgradeProc(); infraBuildPipe(); infraBuildPipe(); o.max = G.infra.proc===3 && G.infra.pipe===1;
    // 5. gaz et mer exclus
    G.infra.proc=0; G.infra.pipe=-1; G.wells=[mk(land[1],90000,{isGas:true}), mk(land[2],90000,{offshore:true})]; o.excl = infraFactor()===1 && wellEconomics(G.wells[0]).transport===0 && wellEconomics(G.wells[1]).transport===0;
    // 6. le tour de mois encaisse les revenus bridés
    G.wells=[1,2,3,4,5].map(i=>mk(land[i],8000)); G.sellMode='immediate'; G.financeMode=false; G.marketEvents=[]; const sFac=infraFactor(); const expRev = G.wells.reduce((a,w)=>a+wellEconomics(w).revenue,0); const cur=G.budget; monthTick(); o.tick = G.lastRevenue>0 && Math.abs(G.lastRevenue-expRev)/expRev<0.2 && G.lastRevenue < G.wells.reduce((a,w)=>a+wellEconomicsRaw(w).revenue,0)*0.9;
    // 7. panneau
    G.wells=[1,2,3,4,5].map(i=>{ const w=mk(land[i],8000); w.fp={kind:'oil',api:30,sulfur:0.7,gor:500}; w.wp={kind:'conv',b0:.05,tb:40,bmax:.8}; blocks[w.blockId].well=w; return w; }); renderGisementsPanel(); const gp=document.getElementById('gisementsContent').textContent; o.card=/Traitement et transport/.test(gp)&&/Production bridée/.test(gp)&&/Construire un pipeline/.test(gp)&&/Agrandir le traitement/.test(gp);
    // 8. prévision : le transport entre dans la projection et le résumé parle de capacité
    const bT=land[30]; bT.studyLevel=3; bT.estimate={structPos:0,prob:.3,quality:50,qualErr:5,depth:2000,isGas:false}; const cfg=fluidCfg(bT,false); o.cfg = cfg.gasPerBbl <= -INFRA.truckCost+1e-9; selectedBlock=bT.id; renderStudiesPanel(bT); document.getElementById('drillMethod').value='vertical'; updateDrillSummary(bT.id); o.sum=/Traitement et export/.test(document.getElementById('drillSummary').textContent) && /saturé/.test(document.getElementById('drillSummary').textContent);
    // 9. ancienne sauvegarde : pas de capacité
    G.infraOn=false; G.infra=null; G.wells=[1,2,3,4,5].map(i=>mk(land[i],8000)); const eo=wellEconomics(G.wells[0]), ro=wellEconomicsRaw(G.wells[0]); o.old = infraFactor()===1 && eo.transport===0 && Math.abs(eo.net-ro.net)<1e-6 && infraState()===null;
    return o; });
  ok(R.on, 'partie Junior : capacité d\'origine (traitement niveau 0, camion)');
  ok(R.under, 'sous la capacité : pas de bridage, le transport par camion s\'ajoute aux coûts');
  ok(R.sat && R.scale, 'saturation du traitement : bridage proportionnel du revenu et des coûts variables, coûts fixes inchangés');
  ok(R.water, 'l\'eau produite compte dans la charge de traitement');
  ok(R.route, 'saturation de la route d\'export (camion 30 000 bbl/mois)');
  ok(R.up && R.pipe && R.max, 'agrandissements payés, pipeline moins cher au baril, niveaux maximums respectés');
  ok(R.excl, 'les puits à gaz et en mer ne sont ni bridés ni facturés');
  ok(R.tick, 'le tour de mois encaisse le revenu bridé');
  ok(R.card, 'carte « Traitement et transport » avec alerte de bridage et boutons d\'agrandissement');
  ok(R.cfg && R.sum, 'prévision : transport dans la projection, saturation annoncée dans le résumé de forage');
  ok(R.old, 'ancienne sauvegarde : aucune capacité, économie inchangée');
  const D = await pg.evaluate(async()=>{ menuConfig.mode='decouverte'; document.getElementById('geoSeed').value='808'; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); setSpeed(0); return { off: G.infraOn===false, st: infraState(), f: infraFactor() }; });
  ok(D.off && D.st===null && D.f===1, 'Découverte : aucune capacité de traitement ni de transport');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
