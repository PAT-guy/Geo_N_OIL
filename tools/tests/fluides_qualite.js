// Qualité du brut et du gaz (V4.96) : densité API, soufre, GOR, condensat et gaz acide par gisement ; prix réalisé selon la qualité ; gaz associé brûlé ou vendu ; prévisions du résumé de forage ;
// absence en Découverte ; anciens puits inchangés.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1280,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const R = await pg.evaluate(async()=>{ const o={}; document.getElementById('geoSeed').value='2468'; menuConfig.mode='junior'; menuConfig.basinType='aquitaine'; menuConfig.gridSize=12; menuConfig.offshore=false; labOptLaunch(); await new Promise(r=>setTimeout(r,1000)); setSpeed(0); LABOPT.pick=false;
    G.budget=1e9; G.price=80; checkEndConditions=function(){};
    // 1. paramètres : déterminisme, bornes, biodégradation des réservoirs froids
    const cold=[], warm=[]; let det=true, bnd=true; for(let k=0;k<4;k++){ generateGeology(12,['aquitaine','rift','paris','passive'][k],false,k*131+7); G.seedNum=k; blocks.forEach(b=>{ if(b.inSalt||b.isOffshore) return; const f=fluidParams(b,false), f2=fluidParams(b,false); if(JSON.stringify(f)!==JSON.stringify(f2)) det=false;
      if(f.kind==='oil'){ if(f.api<10||f.api>50||f.sulfur<0.05||f.sulfur>3.5||f.gor<60||f.gor>3500) bnd=false; (b.tempAtRes<50?cold:b.tempAtRes>85?warm:[]).push(f); } else if(f.cgr<1||f.cgr>50) bnd=false; }); }
    const mean=(a,k)=>a.reduce((s,x)=>s+x[k],0)/a.length; o.det=det; o.bnd=bnd; o.nc=cold.length; o.nw=warm.length; o.bio = cold.length>20 && warm.length>20 && mean(cold,'api')<mean(warm,'api')-3 && mean(cold,'sulfur')>mean(warm,'sulfur')+0.3; o.bioV=[+mean(cold,'api').toFixed(1), +mean(warm,'api').toFixed(1), +mean(cold,'sulfur').toFixed(2), +mean(warm,'sulfur').toFixed(2)];
    // 2. prix selon la qualité
    const pfRef=fluidPf({kind:'oil',api:30,sulfur:0.7}), pfHeavy=fluidPf({kind:'oil',api:15,sulfur:2.5}), pfLight=fluidPf({kind:'oil',api:45,sulfur:0.1}); o.pf=[pfRef, +pfHeavy.toFixed(3), +pfLight.toFixed(3)]; o.pfOk = Math.abs(pfRef-1)<1e-9 && pfHeavy<0.85 && pfLight>1.1-1e-9 && pfLight<=1.12 && pfHeavy>=0.6 && fluidPf(null)===1;
    // 3. économie d'un puits à huile : torchère puis vente
    const land=blocks.filter(b=>!b.inSalt&&!b.isOffshore), mk=(b,fp)=>({blockId:b.id,cost:5e6,offshore:false,production:2000,comps:[{q0:2000,t0:0}],monthsActive:10,status:'producing',isGas:fp&&fp.kind==='gas',eorActive:false,eorMonthsLeft:0,wp:null,fp});
    const fpO={kind:'oil',api:20,sulfur:1.7,gor:1000}, wNo=mk(land[1],null), wO=mk(land[1],fpO); const eN=wellEconomics(wNo), eF=wellEconomics(wO), pf=fluidPf(fpO);
    o.noFp = eN.pf===1 && eN.gasRev===0 && eN.fluidCost===0 && Math.abs(eN.revenue-2000*80)<1e-6;
    o.flare = Math.abs(eF.oilRev-2000*80*pf)<1e-6 && Math.abs(eF.assocMcf-2000)<1e-9 && Math.abs(eF.fluidCost-2000*FLUID.flareFee)<1e-9 && eF.gasRev===0;
    gasSetMode('sell'); o.noPlant = gasState().mode==='flare'; const bud=G.budget; gasBuild(); o.plant = Math.abs((bud-G.budget)-FLUID.gasPlantCapex)<1 && gasState().plant && gasState().mode==='sell';
    const eS=wellEconomics(wO); o.sell = Math.abs(eS.gasRev-2000*gasNetPrice())<1e-6 && eS.fluidCost===0 && eS.net>eF.net;
    // 4. puits à gaz : condensat, gaz acide
    const fpG={kind:'gas',cgr:30,sour:true}, wG=mk(land[2],fpG); wG.production=3000; const eG=wellEconomics(wG); o.gas = Math.abs(eG.gasRev-3000/1000*30*80*FLUID.condPremium)<1e-6 && Math.abs(eG.fluidCost-3000*FLUID.sweeten)<1e-9 && eG.pf===1;
    const wG2=mk(land[2],{kind:'gas',cgr:30,sour:false}); wG2.production=3000; o.sweet = wellEconomics(wG2).fluidCost===0 && wellEconomics(wG2).net > eG.net;
    // 5. projection
    const base=projectWell(3000,80,false,false,0,120).cum, heavy=projectWell(3000,80,false,false,0,120,undefined,undefined,{pf:fluidPf(fpO),gasPerBbl:0}).cum, withGas=projectWell(3000,80,false,false,0,120,undefined,undefined,{pf:1,gasPerBbl:gasNetPrice()}).cum; o.proj = heavy<base && withGas>base;
    // 6. stock : le prix de vente suit la qualité du stock
    G.financeMode=true; G.sellMode='stock'; G.stockMax=1e9; G.stock=0; G.stockPf=1; G.wells=[wO]; wO.monthsActive=0; const before=G.budget; monthTick(); const stk=G.stock, pfs=G.stockPf; G.budget=0; sellStock(); o.stock = stk>0 && Math.abs(pfs-pf)<1e-6 && Math.abs(G.budget-stk*G.price*pf)<1; G.financeMode=false; G.sellMode='immediate';
    // 7. panneaux et prévisions
    const b1=land[5]; const w1=mk(b1,{kind:'oil',api:33,sulfur:0.4,gor:800}); w1.wp={kind:'conv',b0:.05,tb:40,bmax:.8}; G.wells=[w1]; b1.well=w1; renderGisementsPanel(); const gp=document.getElementById('gisementsContent').textContent; o.card=/Qualité et gaz associé/.test(gp)&&/Brûler/.test(gp)&&/Vendre/.test(gp);
    selectedBlock=b1.id; renderStudiesPanel(b1); const sp=document.getElementById('studiesContent').textContent; o.rows=/°API/.test(sp)&&/Prix réalisé/.test(sp)&&/GOR/.test(sp);
    const nb=land.find(z=>z.id!==b1.id && Math.hypot(z.x-b1.x,z.y-b1.y)>0.9 && Math.hypot(z.x-b1.x,z.y-b1.y)<1.1 && !z.well); nb.studyLevel=3; nb.estimate={structPos:0,prob:.3,quality:50,qualErr:5,depth:2000,isGas:false}; selectedBlock=nb.id; renderStudiesPanel(nb); document.getElementById('drillMethod').value='vertical'; updateDrillSummary(nb.id); const ds=document.getElementById('drillSummary').textContent; o.sum=/Huile attendue/.test(ds)&&/33 °API/.test(ds)&&/puits voisin/.test(ds);
    const far=land.find(z=>Math.hypot(z.x-b1.x,z.y-b1.y)>6); far.studyLevel=3; far.estimate={structPos:0,prob:.3,quality:50,qualErr:5,depth:2000,isGas:false}; selectedBlock=far.id; renderStudiesPanel(far); document.getElementById('drillMethod').value='vertical'; updateDrillSummary(far.id); o.sumPrior=/a priori régional/.test(document.getElementById('drillSummary').textContent);
    // 8. un puits créé au forage porte ses fluides
    G.wells=[]; const t=land.find(z=>!z.well && z.id!==nb.id && z.id!==far.id && z.studyLevel===0); t.studyLevel=3; if(!t.estimate) t.estimate={structPos:0}; const pl=drillPlan(t,'vertical'); G.budget=1e9; const flush=()=>{ [drillRevealCur, ...drillRevealQueue].forEach(it=>{ try{ drillRevealFlush(it); }catch(e){} }); drillRevealQueue.length=0; drillRevealPlaying=false; drillRevealBatch=[]; drillRevealRecapOpen=false; document.getElementById('drillRevealModal')?.classList.remove('open'); };
    let made=null; for(const c of land.filter(z=>!z.well&&!z.dryHole).slice(0,40)){ c.studyLevel=3; if(!c.estimate) c.estimate={structPos:0}; const p=drillPlan(c,'vertical'); if(!p||!p.equip) continue; drillBlock(c.id,'vertical',p.equip,null); for(let i=0;i<24 && G.drilling.some(d=>d.blockId===c.id); i++) monthTick(); flush(); if(c.well){ made=c.well; break; } }
    o.made = !!made && !!made.fp && !!made.wp && (made.fp.kind==='oil'||made.fp.kind==='gas');
    return o; });
  ok(R.det && R.bnd, 'paramètres de fluides : déterministes par bloc et bornés');
  ok(R.bio, 'réservoirs froids (< 50 °C, '+R.nc+' blocs) : huile plus lourde et plus soufrée que les chauds (> 85 °C, '+R.nw+' blocs) '+JSON.stringify(R.bioV));
  ok(R.pfOk, 'prix réalisé : 100 % à 30 °API / 0,7 % S, moins pour une huile lourde et soufrée, plus pour une légère, borné à 60-112 % '+JSON.stringify(R.pf));
  ok(R.noFp, 'un puits sans fluides (ancienne sauvegarde) garde son économie');
  ok(R.flare, 'gaz associé brûlé : GOR × production en Mcf, taxe de torchage, aucun revenu de gaz');
  ok(R.noPlant && R.plant, 'la vente n\'est choisissable qu\'après construction de l\'unité (1,5 M$)');
  ok(R.sell, 'gaz associé vendu au prix net de traitement, sans taxe, net du puits meilleur');
  ok(R.gas && R.sweet, 'puits à gaz : revenu de condensat, coût d\'épuration du gaz acide seulement s\'il est acide');
  ok(R.proj, 'la projection intègre la décote de qualité et la vente de gaz');
  ok(R.stock, 'en mode stock, le prix de vente suit la qualité moyenne du stock');
  ok(R.card && R.rows, 'panneaux : carte « Qualité et gaz associé », huile et prix réalisé dans le puits actif');
  ok(R.sum && R.sumPrior, 'résumé de forage : huile attendue d\'après le puits voisin, sinon a priori régional');
  ok(R.made, 'un puits créé au forage porte ses fluides et son profil d\'eau');
  const D = await pg.evaluate(async()=>{ menuConfig.mode='decouverte'; document.getElementById('geoSeed').value='808'; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); setSpeed(0); G.budget=1e9; let w=null; const land=blocks.filter(x=>!x.inSalt); for(const c of land.slice(0,40)){ c.studyLevel=3; if(!c.estimate) c.estimate={structPos:0}; const p=drillPlan(c,'vertical'); if(!p||!p.equip) continue; drillBlock(c.id,'vertical',p.equip,null); for(let i=0;i<30 && G.drilling.some(d=>d.blockId===c.id); i++) monthTick(); if(c.well){ w=c.well; break; } } renderGisementsPanel(); return { fp: w ? w.fp : 'nowell', card: /Qualité et gaz associé/.test(document.getElementById('gisementsContent').textContent) }; });
  ok(D.fp===null || D.fp==='nowell', 'Découverte : aucun profil de fluides sur les puits');
  ok(!D.card, 'Découverte : pas de carte de fluides');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
