// Puits de développement (V5.19) : dans un champ prouvé, réussite de 75 à 90 %, venue ajoutée au puits (60 %, 45 %, 35 % du débit initial), trois au plus, frais fixes en plus, coût 90 %, tirage déterministe.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1300,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  await pg.evaluate(async()=>{ document.getElementById('geoSeed').value='2024'; menuConfig.mode='junior'; menuConfig.basinType='paris'; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); setSpeed(0); G.budget=30e6; performStudy(null,'gravity'); });
  const r = await pg.evaluate(()=>{
    const out={}; const mk=(b,over)=>({ blockId:b.id, status:'producing', method:'vertical', production:10000, comps:[{q0:10000,t0:0}], monthsActive:12, cum:0, offshore:false, cost:3e6, isGas:false, devN:0, ...over });
    const cand=blocks.filter(b=>!b.inSalt && !b.isOffshore && !b.well && !b.dryHole && b.topOfReservoir>600);
    const b=cand[0]; b.well=mk(b); G.wells.push(b.well); const w=b.well;
    // probabilité de réussite : 75 à 90 %
    const ps=cand.slice(0,200).map(devProb); out.pMin=Math.min(...ps); out.pMax=Math.max(...ps); out.pMean=ps.reduce((a,c)=>a+c,0)/ps.length;
    out.state=devState(b); const fr=mk(cand[1],{method:'frac'}); cand[1].well=fr; out.fracRefused=!!devState(cand[1]).why; cand[1].well=null;
    // coût : 90 % d'un puits d'exploration
    const c=devCost(b,'standard'); out.costOk=Math.abs(c.cost-0.9*b.topOfReservoir*EQUIPMENT.standard.costM*METHODS.vertical.costMult*siteCost(b,drillCostFactor()))<1;
    // lancement, résolution, ajout de venue
    const bud=G.budget; launchDevWell(b.id,'renforce'); out.paid=Math.round(bud-G.budget); out.paidExpect=Math.round(devCost(b,'renforce').cost); out.inProg=G.drilling.some(d=>d.devwell); const nd=G.drilling.length; launchDevWell(b.id,'renforce'); out.noDouble=G.drilling.length===nd;
    const e0=wellEconomicsRaw(w);
    for(let i=0;i<30&&G.drilling.some(d=>d.devwell);i++) monthTick(); drillRevealQueue.length=0; drillRevealPlaying=false; document.getElementById('drillRevealModal')?.classList.remove('open');
    out.devN=w.devN; out.comps=w.comps.length; out.added=w.comps[1]?w.comps[1].q0:null; out.costSum=w.cost;
    // sauvegarde de la mécanique de venue : somme des débits
    out.rate=wellRate(w);
    // saturation : trois puits au plus
    w.devN=3; out.sat=!!devState(b).why; w.devN=1;
    // frais fixes : +50 % par puits supplémentaire
    const eA=wellEconomicsRaw(Object.assign({},w,{devN:0})), eB=wellEconomicsRaw(Object.assign({},w,{devN:2})); out.fixedA=eA.fixedOp; out.fixedB=eB.fixedOp;
    // déterminisme
    out.seedA=SR('dev', b.id+'|0')(); out.seedB=SR('dev', b.id+'|0')();
    G.wells.pop(); b.well=null;
    // taux de réussite empirique sur de nombreux blocs
    let n=0, s=0; for(const x of cand.slice(0,150)){ x.well=mk(x); G.wells.push(x.well); const d={ blockId:x.id, method:'vertical', equip:'renforce', cost:1e6, depth:x.topOfReservoir, devwell:true }; const before=x.well.comps.length; try{ resolveDevWell(d); }catch(e){} n++; if(x.well.comps.length>before) s++; G.wells.pop(); x.well=null; }
    out.rate_emp=s/n; out.n=n; return out; });
  ok(r.pMin>=0.75-1e-9 && r.pMax<=0.90+1e-9 && r.pMean>0.77 && r.pMean<0.88,'réussite de développement entre 75 et 90 % (moyenne '+r.pMean.toFixed(3)+')');
  ok(r.state && r.state.ok && Math.abs(r.state.share-0.60)<1e-9 && r.fracRefused,'premier puits : part 60 % ; frac exclu');
  ok(r.costOk,'coût = 90 % d\'un puits d\'exploration à la profondeur connue');
  ok(r.paid===r.paidExpect && r.inProg && r.noDouble,'lancement : coût débité, forage en cours, pas de double lancement');
  ok(r.devN===1 && (r.comps===2 ? Math.abs(r.added-6000)<1e-6 : r.comps===1) && r.costSum>3e6,'résolution : un puits de plus compté ; si réussi, +60 % du débit initial ; coût imputé '+JSON.stringify([r.devN,r.comps,r.added]));
  ok(r.sat,'trois puits de développement au plus par bloc');
  ok(Math.abs(r.fixedB/r.fixedA-2)<1e-9,'frais fixes : +50 % par puits supplémentaire ('+r.fixedA+' → '+r.fixedB+')');
  ok(r.seedA===r.seedB,'tirage déterministe par bloc et rang');
  ok(r.rate_emp>0.70 && r.rate_emp<0.95,'taux de réussite empirique ('+Math.round(r.rate_emp*100)+' % sur '+r.n+' blocs) dans la fourchette industrielle');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
