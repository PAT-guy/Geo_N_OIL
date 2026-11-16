// Eau et BSW (V4.95) : courbes de BSW conventionnel (percée) et de frac (reflux), coût de l'eau dans l'économie des puits, gestion (camion, injection, recyclage), eau de frac,
// prévisions du résumé de forage, absence en Découverte, anciens puits inchangés.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1280,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const R = await pg.evaluate(async()=>{ const o={}; document.getElementById('geoSeed').value='2468'; menuConfig.mode='junior'; menuConfig.basinType='aquitaine'; menuConfig.gridSize=12; menuConfig.offshore=false; LABOPT.advfluids=true; labOptLaunch(); await new Promise(r=>setTimeout(r,1000)); setSpeed(0); LABOPT.pick=false;
    const flush=()=>{ [drillRevealCur, ...drillRevealQueue].forEach(it=>{ try{ drillRevealFlush(it); }catch(e){} }); drillRevealQueue.length=0; drillRevealPlaying=false; drillRevealBatch=[]; drillRevealRecapOpen=false; document.getElementById('drillRevealModal')?.classList.remove('open'); };
    G.budget=1e9; G.price=80; checkEndConditions = function(){}; const land=blocks.filter(b=>!b.inSalt && !b.isOffshore);
    // 1. courbes
    let cv=true, bnd=true, det=true; land.slice(0,60).forEach(b=>{ const p=waterParams(b,false), p2=waterParams(b,false); if(JSON.stringify(p)!==JSON.stringify(p2)) det=false; let prev=-1; for(let t=0;t<=130;t+=5){ const v=bswAt(p,t); if(v<prev-1e-9) cv=false; if(v<0||v>0.95) bnd=false; prev=v; } });
    o.cv=cv; o.bnd=bnd; o.det=det; const pc=waterParams(land[5],false); o.conv=[+bswAt(pc,0).toFixed(3), +bswAt(pc,pc.tb).toFixed(2), +bswAt(pc,130).toFixed(2), pc.tb];
    const pf=waterParams(land[5],true); o.frac=[+bswAt(pf,0).toFixed(2), +bswAt(pf,12).toFixed(2), +bswAt(pf,60).toFixed(2)]; o.fracShape = bswAt(pf,0)<bswAt(pf,12) && bswAt(pf,12)<bswAt(pf,60) && bswAt(pf,0)>=0.55 && bswAt(pf,0)<=0.78 && bswAt(pf,60)>=0.7 && bswAt(pf,60)<=0.9;
    // 2. économie : le coût de l'eau s'ajoute aux coûts, pas au revenu
    const mk=(b,wp)=>({blockId:b.id,cost:5e6,offshore:false,production:2000,comps:[{q0:2000,t0:0}],monthsActive:60,status:'producing',isGas:false,eorActive:false,eorMonthsLeft:0,wp});
    const wNo=mk(land[1],null), wYes=mk(land[1],{kind:'conv',b0:0.05,tb:30,bmax:0.8}); const eN=wellEconomics(wNo), eY=wellEconomics(wYes); const st=waterState(); st.mode='truck';
    o.eco = eN.waterBbl===0 && eN.bsw===0 && eY.waterBbl>0 && Math.abs(eY.revenue-eN.revenue)<1e-6 && Math.abs((eY.opex-eN.opex)-eY.waterBbl*WATER.truck)<1e-3;
    o.wor = Math.abs(eY.waterBbl - 2000*eY.bsw/(1-eY.bsw))<1e-6;
    // 3. modes
    waterSetMode('swd'); o.noSwd = waterState().mode==='truck'; const bud=G.budget; waterBuild('swd'); o.swd = Math.abs((bud-G.budget)-WATER.swdCapex)<1 && waterState().swd && waterState().mode==='swd';
    const eS=wellEconomics(wYes); o.swdCheaper = eS.waterCost < eY.waterCost && Math.abs(eS.waterCost-eS.waterBbl*WATER.swd)<1e-3;
    waterBuild('plant'.replace('plant','recycle')); o.plant = waterState().plant && waterState().mode==='recycle';
    const wOff={...wYes, offshore:true}; o.offUnit = Math.abs(wellEconomics(wOff).waterCost - wellEconomics(wOff).waterBbl*WATER.offshore)<1e-3;
    // 4. recyclage : le stock se remplit au tour de mois, plafonné, l'excès part au camion
    G.wells=[]; const wr=mk(land[2],{kind:'conv',b0:0.4,tb:10,bmax:0.9}); wr.monthsActive=50; wr.production=5000; wr.comps=[{q0:5000,t0:-50}]; G.wells=[wr]; waterState().pool=0; const before=waterState().total; monthTick();
    o.pool = waterState().pool>0 && waterState().total>before;
    waterState().pool = WATER.poolCap - 1000; const b2=G.budget; monthTick(); o.cap = waterState().pool===WATER.poolCap;
    // 5. eau de frac : du stock à 0,2 $/bbl, sinon neuve à 1,5 $/bbl
    waterState().pool=0; const f0=fracWater(2000); waterState().pool=100000; const f1=fracWater(2000); o.fw = Math.abs(f0.cost-WATER.fracBbl*WATER.freshFrac)<1 && f1.fromPool===100000 && f1.cost < f0.cost && Math.abs(f1.cost-(100000*WATER.poolFrac+(WATER.fracBbl-100000)*WATER.freshFrac))<1;
    o.fracCost = fracCompletion(2000) > fracStages(2000)*FRAC_STAGE_COST*drillCostFactor();
    // 6. frac de bout en bout : conso du stock, BSW de reflux
    G.wells=[]; G.drilling=[]; const good=land.filter(b=>shaleTrue(b).ok); const g0=good[0]; g0.studyLevel=3; if(!g0.estimate) g0.estimate={structPos:0}; waterState().mode='recycle'; waterState().pool=200000;
    const pl=drillPlan(g0,'frac'); const bd=G.budget, pool0=waterState().pool; drillBlock(g0.id,'frac',pl.equip||'renforce',null); const paid=bd-G.budget; const fwx=fracWater(2000); 
    o.poolUsed = Math.abs(pool0-waterState().pool-200000)<1 || waterState().pool<pool0;
    for(let i=0;i<24 && G.drilling.some(d=>d.blockId===g0.id); i++) monthTick(); flush(); o.fracWell = !!g0.well && g0.well.wp && g0.well.wp.kind==='frac';
    // 7. prévisions : le résumé de forage parle de BSW, le projet de puits intègre l'eau
    const qa=projectWell(3000,80,false,false,0,120).cum, qb=projectWell(3000,80,false,false,0,120,undefined,{fn:t=>bswAt(pc,t),unit:WATER.truck,gas:false}).cum; o.projLower = qb<qa;
    const bC=land[20]; bC.studyLevel=3; bC.estimate={structPos:0,prob:0.3,quality:50,qualErr:5,depth:2000,isGas:false}; selectedBlock=bC.id; renderStudiesPanel(bC); document.getElementById('drillMethod').value='vertical'; updateDrillSummary(bC.id); o.sumBsw=/BSW attendu|Expected BSW/.test(document.getElementById('drillSummary').textContent);
    if(!g0.well) {} 
    const g1=good[1]; g1.studyLevel=3; if(!g1.estimate) g1.estimate={structPos:0}; selectedBlock=g1.id; renderStudiesPanel(g1); document.getElementById('drillMethod').value='frac'; updateDrillSummary(g1.id); o.sumFrac=/Eau de frac|Frac water/.test(document.getElementById('drillSummary').textContent);
    // 8. panneaux
    G.wells=[wr]; blocks[wr.blockId].well=wr; renderGisementsPanel(); const gp=document.getElementById('gisementsContent').textContent; o.card=/Eau et BSW/.test(gp) && /Camion/.test(gp) && /Recyclage/.test(gp); o.cardParts=[/Eau et BSW/.test(gp), /Camion/.test(gp), /Recyclage/.test(gp), gp.length];
    selectedBlock=wr.blockId; renderStudiesPanel(blocks[wr.blockId]); o.rows=/BSW/.test(document.getElementById('studiesContent').textContent) && /Eau produite/.test(document.getElementById('studiesContent').textContent);
    // 9. anciens puits sans wp : inchangés
    o.old = wellEconomics(wNo).waterCost===0 && wellBsw(wNo)===0;
    return o; });
  ok(R.cv && R.bnd && R.det, 'BSW conventionnel : croissant, borné, déterministe par bloc');
  ok(R.conv[0]<0.25 && R.conv[2]>R.conv[0] && R.conv[3]>=10, 'BSW conventionnel : faible au départ ('+R.conv[0]+'), plus fort après la percée ('+R.conv[2]+' à 130 mois, percée au mois '+R.conv[3]+')');
  ok(R.fracShape, 'BSW de frac : 55 à 78 % au départ, qui monte vers 70 à 90 % en cinq ans (rapport eau-huile de 2 à 5 environ) '+JSON.stringify(R.frac));
  ok(R.eco && R.wor, 'l\'eau coûte (levage, traitement) sans réduire le revenu ; WOR = BSW / (1 − BSW)');
  ok(R.noSwd && R.swd && R.swdCheaper, 'l\'injection n\'est choisissable qu\'une fois le puits SWD construit (2 M$), et l\'eau coûte alors moins cher');
  ok(R.plant && R.offUnit, 'usine de recyclage construite ; en mer, tarif unique');
  ok(R.pool && R.cap, 'recyclage : le stock se remplit chaque mois et reste plafonné');
  ok(R.fw && R.fracCost, 'eau de frac : stock à 0,2 $/bbl puis eau neuve à 1,5 $/bbl, comptée dans le coût de la frac');
  ok(R.poolUsed && R.fracWell, 'frac de bout en bout : le stock est consommé, le puits porte un profil de BSW de frac');
  ok(R.projLower, 'la projection d\'un puits intègre le coût de l\'eau');
  ok(R.sumBsw && R.sumFrac, 'le résumé de forage annonce le BSW attendu, et l\'eau de frac pour une frac');
  ok(R.card && R.rows, JSON.stringify([R.cardParts,R.rows])+' panneaux : carte « Eau et BSW » dans les gisements, BSW dans le puits actif');
  ok(R.old, 'un puits sans paramètres d\'eau (ancienne sauvegarde) garde son économie');
  const D = await pg.evaluate(async()=>{ menuConfig.mode='decouverte'; document.getElementById('geoSeed').value='808'; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); setSpeed(0); G.budget=1e9; const b=blocks.filter(x=>!x.inSalt)[10]; b.studyLevel=3; if(!b.estimate) b.estimate={structPos:0}; const pl=drillPlan(b,'vertical'); drillBlock(b.id,'vertical',pl.equip||'renforce',null); for(let i=0;i<30 && G.drilling.some(d=>d.blockId===b.id); i++) monthTick(); renderGisementsPanel(); const w=b.well; return { wp: w ? w.wp : 'nowell', card: /Eau et BSW/.test(document.getElementById('gisementsContent').textContent) }; });
  ok(D.wp===null || D.wp==='nowell', 'Découverte : aucun profil d\'eau sur les puits');
  ok(!D.card, 'Découverte : pas de carte eau');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
