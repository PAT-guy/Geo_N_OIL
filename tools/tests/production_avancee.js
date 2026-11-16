// Production avancée (V5.1) : une option unique regroupe eau et BSW, qualité du brut et du gaz, capacité de traitement et d'export, pression de réservoir. Désactivée par défaut en Découverte et en Junior,
// activée en Senior et en Grande exploration. Le bridage est différé (stock plafonné) et non perdu ; le facteur de bridage est mis en cache.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1280,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const R = await pg.evaluate(async()=>{ const o={};
    // 1. valeur par défaut selon le mode, option visible et verrouillée en cours de partie
    const def = {}; for(const m of ['decouverte','junior','expert','expedition','tp','sandbox']){ menuConfig.mode=m; labOptOpen('start'); def[m]=labOptDraft.advfluids; labOptClose(); } o.def=def;
    o.rowStart = (labOptOpen('start'), /Production avancée/.test(document.getElementById('labOptModal').textContent)); labOptClose();
    // 2. partie Junior par défaut : aucune règle avancée
    document.getElementById('geoSeed').value='2468'; menuConfig.mode='junior'; menuConfig.basinType='aquitaine'; menuConfig.gridSize=12; menuConfig.offshore=false; LABOPT.advfluids=false; labOptLaunch(); await new Promise(r=>setTimeout(r,1000)); setSpeed(0); LABOPT.pick=false; G.budget=1e9; G.price=80; checkEndConditions=function(){};
    o.junior = { adv:G.advOn, infra:infraState(), f:infraFactor() };
    const land=blocks.filter(b=>!b.inSalt&&!b.isOffshore); const flush=()=>{ [drillRevealCur, ...drillRevealQueue].forEach(it=>{ try{ drillRevealFlush(it); }catch(e){} }); drillRevealQueue.length=0; drillRevealPlaying=false; drillRevealBatch=[]; drillRevealRecapOpen=false; document.getElementById('drillRevealModal')?.classList.remove('open'); };
    let w0=null; for(const c of land.slice(0,60)){ c.studyLevel=3; if(!c.estimate) c.estimate={structPos:0}; const p=drillPlan(c,'vertical'); if(!p||!p.equip) continue; drillBlock(c.id,'vertical',p.equip,null); for(let i=0;i<24 && G.drilling.some(d=>d.blockId===c.id); i++) monthTick(); flush(); if(c.well){ w0=c.well; break; } }
    o.jw = w0 ? [w0.wp, w0.fp, w0.rd] : 'nowell'; if(w0){ const e=wellEconomics(w0), r=wellEconomicsRaw(w0); o.jEco = e.waterBbl===0 && e.fluidCost===0 && e.transport===0 && e.pf===1 && Math.abs(e.net-r.net)<1e-6; }
    o.fw = fracWater(2000).cost===0;
    const c1=land.find(z=>!z.well&&!z.dryHole&&shaleTrue(z).ok); c1.studyLevel=3; if(!c1.estimate) c1.estimate={structPos:0}; selectedBlock=c1.id; renderStudiesPanel(c1); document.getElementById('drillMethod').value='frac'; updateDrillSummary(c1.id); o.noWaterRows = !/Eau de frac|Frac water|BSW attendu/.test(document.getElementById('drillSummary').textContent);
    const cv=land.find(z=>!z.well&&!z.dryHole&&z!==c1); cv.studyLevel=3; cv.estimate={structPos:0,prob:.3,quality:50,qualErr:5,depth:2000,isGas:false}; selectedBlock=cv.id; renderStudiesPanel(cv); document.getElementById('drillMethod').value='vertical'; updateDrillSummary(cv.id); o.noBsw = !/BSW attendu|Huile attendue|Traitement et export/.test(document.getElementById('drillSummary').textContent);
    // 3. partie avec l'option : règles actives
    LABOPT.advfluids=true; document.getElementById('geoSeed').value='2468'; labOptLaunch(); await new Promise(r=>setTimeout(r,1000)); setSpeed(0); LABOPT.pick=false; G.budget=1e9; G.price=80; checkEndConditions=function(){};
    o.adv = { on:G.advOn, infra:!!infraState() };
    const land2=blocks.filter(b=>!b.inSalt&&!b.isOffshore); let w1=null; for(const c of land2.slice(0,60)){ c.studyLevel=3; if(!c.estimate) c.estimate={structPos:0}; const p=drillPlan(c,'vertical'); if(!p||!p.equip) continue; drillBlock(c.id,'vertical',p.equip,null); for(let i=0;i<24 && G.drilling.some(d=>d.blockId===c.id); i++) monthTick(); flush(); if(c.well){ w1=c.well; break; } }
    o.aw = !!(w1 && w1.wp && w1.fp && w1.rd); o.fw2 = fracWater(2000).cost>0;
    // 4. migration d'anciennes sauvegardes
    o.mig = [advMigrate({wells:[{wp:{}}]}), advMigrate({wells:[{}]}), advMigrate({infraOn:true,wells:[]}), advMigrate({advOn:false,wells:[{wp:{}}]})];
    // 5. report : la production bridée est différée, vendue quand la capacité se libère, plafonnée
    G.wells=[]; G.drilling=[]; G.wells=[1,2,3,4,5].map(i=>({blockId:land2[i].id,cost:5e6,offshore:false,production:8000,comps:[{q0:8000,t0:-30}],monthsActive:30,status:'producing',isGas:false,eorActive:false,eorMonthsLeft:0,wp:null,fp:null})); G.sellMode='immediate'; G.financeMode=false; G.marketEvents=[];
    const ist=infraState(); ist.backlog=0; ist.lostBbl=0; ist.releasedBbl=0; const sNow=infraFactor(); const raw=G.wells.reduce((a,w)=>a+wellEconomicsRaw(w).prodEffective,0); monthTick();
    o.def1 = Math.abs(ist.backlog - raw*(1-sNow))/ (raw*(1-sNow)) < 0.2 && ist.backlog>0;   // l'écart vient du déclin du tour
    const b1=ist.backlog; infraBuildPipe(); infraUpgradeProc(); infraUpgradeProc(); G.wells.forEach(w=>{ w.production=8000; w.comps=[{q0:8000,t0:w.monthsActive}]; }); const cashBefore=G.budget; monthTick(); o.rel = ist.backlog < b1 && ist.releasedBbl>0;
    // plafond
    ist.proc=0; ist.pipe=-1; ist.backlog=0; ist.lostBbl=0; G.wells.forEach(w=>{ w.production=40000; w.comps=[{q0:40000,t0:w.monthsActive}]; }); monthTick(); o.cap = ist.backlog<=INFRA.backlogMonths*INFRA.truckCap+1e-6 && ist.lostBbl>0;
    // coût de stockage dans les coûts
    G.wells.forEach(w=>{ w.production=100; w.comps=[{q0:100,t0:w.monthsActive}]; }); ist.proc=3; ist.pipe=1; ist.backlog=1000; const opex0=null; monthTick(); o.hold = G.lastOpex>0;
    // 6. cache : le calcul complet n'est pas refait pour chaque puits
    G.wells=[]; for(let i=0;i<60;i++) G.wells.push({blockId:land2[i%land2.length].id,cost:5e6,offshore:false,production:500,comps:[{q0:500,t0:0}],monthsActive:10,status:'producing',isGas:false,eorActive:false,eorMonthsLeft:0,wp:null,fp:null});
    ist.proc=0; ist.pipe=-1; G._infraF=null; const orig=wellEconomicsRaw; let calls=0; wellEconomicsRaw = function(w){ calls++; return orig(w); }; G.wells.forEach(w=>wellEconomics(w)); const first=calls; calls=0; G.wells.forEach(w=>wellEconomics(w)); const second=calls; wellEconomicsRaw = orig;
    o.cache=[first,second]; o.cacheOk = first<=60+60 && second===60;
    return o; });
  ok(R.def.decouverte===false && R.def.junior===false && R.def.expert===true && R.def.expedition===true && R.def.tp===false && R.def.sandbox===false, 'valeur par défaut : désactivée en Découverte, Junior, Practice et Sandbox, activée en Senior et Grande exploration '+JSON.stringify(R.def));
  ok(R.rowStart, 'la case « Production avancée » est dans les options de lancement');
  ok(R.junior.adv===false && R.junior.infra===null && R.junior.f===1, 'Junior par défaut : aucune règle avancée');
  ok(R.jw==='nowell' || (R.jw[0]===null && R.jw[1]===null && R.jw[2]===null), 'les puits de Junior ne portent ni eau, ni fluides, ni mécanisme de drainage');
  ok(R.jEco, 'l\'économie d\'un puits Junior est celle d\'avant la V4.95 (aucun coût d\'eau, de fluide ni de transport)');
  ok(R.fw && R.noWaterRows && R.noBsw, 'sans l\'option : pas d\'eau de frac, pas de ligne BSW, huile attendue ni capacité dans les résumés de forage');
  ok(R.adv.on && R.adv.infra && R.aw && R.fw2, 'avec l\'option : règles actives, capacités, puits dotés d\'eau, de fluides et de mécanisme, eau de frac facturée');
  ok(R.mig[0]===true && R.mig[1]===false && R.mig[2]===true && R.mig[3]===false, 'sauvegardes anciennes : les puits déjà dotés gardent leurs règles, les autres non, un choix explicite est respecté '+JSON.stringify(R.mig));
  ok(R.def1, 'le bridage différé : le stock reçoit la production non vendue');
  ok(R.rel, 'quand la capacité se libère, le stock est vendu');
  ok(R.cap, 'le stock est plafonné à '+'2 mois de capacité d\'export ; l\'excès est perdu');
  ok(R.hold, 'le stock coûte au baril et par mois');
  ok(R.cacheOk, 'le facteur de bridage est mis en cache : '+R.cache[0]+' calculs de puits au premier passage, '+R.cache[1]+' au second pour 60 puits');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
