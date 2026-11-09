// Emprunt (capacité, valeur nette, remboursement), bonus de cible par province, option sans limite de temps, guide (extension, emprunt)
const { chromium } = require('playwright');
const path = require('path');
(async()=>{ const br=await chromium.launch(); const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(300);
const res = await pg.evaluate(()=>{ document.getElementById('tutorialModal').style.display='none';
  ['updateHud','renderBlock','drawSparkline','renderGeoPanel','renderStudiesPanel','renderSection','renderFinancePanel','addLog','toast','showDrillReveal','renderGuide'].forEach(n=>{ window[n]=()=>{}; });
  let ended=null; window.showEnd=(x)=>{ ended=x; };
  const start = (seed, mode, fin)=>{ ended=null; LABOPT=labNormOpt({...LAB_PRESETS.decouverte.o}); menuConfig.seed=seed; menuConfig.mode=mode; menuConfig.basinType='paris'; menuConfig.gridSize=12; menuConfig.offshore=false; menuConfig.financeMode=fin; _doStartGame(); setSpeed(0); };
  const out={};
  // --- emprunt
  start(5,'junior',true);
  out.capaciteDepart = +(loanCapacity()/1e6).toFixed(2);
  const b0=G.budget; takeLoan(10e6); out.pretRefuse = G.loans.length===0 && G.budget===b0;
  takeLoan(3e6); out.pretAccepte = G.loans.length===1 && Math.abs(G.budget-(b0+3e6))<1;
  out.detteApresPret = +(debtTotal()/1e6).toFixed(2);
  G.budget = 42e6; checkEndConditions(); out.victoireAvecDette = ended;   // 42 M$ en caisse, 3 M$ de dette : valeur nette 39 M$, pas de victoire
  G.budget = 44e6; checkEndConditions(); out.victoireNette = ended;       // 44 - 3 = 41 : victoire
  ended=null; G.budget = 20e6; const dette0=debtTotal(); repayLoan(0); out.apresSolde = { prets:G.loans.length, budget:+(G.budget/1e6).toFixed(2), attendu:+((20e6-dette0)/1e6).toFixed(2) };
  // --- capacité qui croît avec un puits producteur (bloc à terre le plus prometteur)
  start(7,'junior',true); const c0=loanCapacity();
  const res0 = b=>{ const r=b.horizons.find(l=>l.role==='reservoir'); return b.inSalt||b.isOffshore||!r ? -1 : b.trueQuality*r.thicknessLocal; };
  const c = [...blocks].sort((x,y)=>res0(y)-res0(x))[0]; G.sectionA=G.sectionB=c.id; performStudy(null,'gravity'); performStudy(c.id,'seismic2d'); performStudy(c.id,'seismic3d');
  drillBlock(c.id,'vertical','standard'); { const rnd=Math.random; while(G.drilling.length){ const d=G.drilling.shift(); Math.random=()=>0.0001; resolveDrilling(d); Math.random=rnd; } }   // tirage forcé uniquement pour le forage, pas pour les accidents du mois
  out.capaciteAvecPuits = { avant:+(c0/1e6).toFixed(2), apres:+(loanCapacity()/1e6).toFixed(2), puitsProductif:!!c.well };
  // --- guide : extension autour de la découverte
  G.budget = 1e9; const g = guideCompute(); out.guideExtension = { texte:g && g.text.slice(0,70), action:g && g.act && g.act.label.slice(0,50), appel:g && g.act && g.act.call.slice(0,16) };
  // --- guide : emprunt quand un forage rentable n'est pas finançable
  out.guideEmprunt = null;
  for(let seed=1; seed<=60 && !out.guideEmprunt; seed++){ start(seed,'junior',true); G.budget=1e9; performStudy(null,'gravity');
    [...blocks].filter(b=>b.estimate?.structPos!==undefined).sort((a2,z)=>z.estimate.structPos-a2.estimate.structPos).slice(0,24).forEach(b=>{ G.sectionA=G.sectionB=b.id; performStudy(b.id,'seismic2d'); performStudy(b.id,'seismic3d'); });
    GUIDE_STUDY_CAP = 1e9; const g0 = guideCompute();
    if(g0 && /guideDo\('drill'/.test(g0.act?.call||'')){ G.budget = 0.05e6; const g1 = guideCompute(); out.guideEmprunt = { graine:seed, avant:g0.act.label.slice(0,30), apresBudgetBas:g1 && g1.act && g1.act.label.slice(0,60), appel:g1 && g1.act && g1.act.call, ok:g1 && g1.act && g1.act.ok }; }
  }
  GUIDE_STUDY_CAP = 0.35;
  // --- bonus de cible : une fois par province
  start(9,'junior',false); G.labPick = STRAT.findIndex(l=>l.role==='reservoir'); const ri=G.labPick;
  const bs = blocks.filter(b=>!b.isOffshore); const b1 = bs[0], b2 = bs.find(x=>x.provinceIdx!==b1.provinceIdx) || null;
  const bud0=G.budget; labResultHtml(b1,false,ri); const g1=G.budget-bud0; const bud1=G.budget; labResultHtml(blocks.find(x=>x!==b1 && x.provinceIdx===b1.provinceIdx),false,ri); const g2=G.budget-bud1;
  out.bonusProvince = { premier:g1, memeProvince:g2 };
  if(b2){ const bud2=G.budget; labResultHtml(b2,false,ri); out.bonusProvince.autreProvince = G.budget-bud2; } else out.bonusProvince.autreProvince = 'une seule province sur cette carte';
  // --- option sans limite de temps
  start(11,'junior',false); G.month = 12*25+1; ended=null; checkEndConditions(); out.finParDefaut = ended;
  ended=null; LABOPT.nolimit = true; checkEndConditions(); out.finSansLimite = ended;
  G.month = 12*60; checkEndConditions(); out.apres60ans = ended;
  return out; });
console.log(JSON.stringify(res,null,1)); console.log('erreurs',errs); await br.close(); })();
