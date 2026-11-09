// Plafond d'études du guide : au-delà d'une part du budget de départ dépensée en prospection (35 % dans le jeu, 12 % ici pour l'atteindre vite), plus de nouvelle étude recommandée
const { chromium } = require('playwright');
const path = require('path');
(async()=>{ const br=await chromium.launch(); const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(300);
const res = await pg.evaluate(()=>{ document.getElementById('tutorialModal').style.display='none';
  ['updateHud','renderBlock','drawSparkline','renderGeoPanel','renderStudiesPanel','renderSection','renderFinancePanel','addLog','toast','renderGuide'].forEach(n=>{ window[n]=()=>{}; });
  const mulberry=(a)=>()=>{ a=(a+0x6D2B79F5)|0; let t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return((t^(t>>>14))>>>0)/4294967296; };
  GUIDE_STUDY_CAP = 0.12; // plafond bas pour l'atteindre vite dans le test (1,8 M$ pour 15 M$)
  const out={ sousPlafond:null, plafondSansRentable:null, plafondAvecRentable:null, vu:{} };
  for(let seed=1; seed<=60 && !(out.plafondSansRentable && out.plafondAvecRentable); seed++){
    Math.random=mulberry(seed*7919+13); LABOPT=labNormOpt({...LAB_PRESETS.decouverte.o}); menuConfig.seed=seed; menuConfig.mode='junior'; menuConfig.basinType='random'; menuConfig.gridSize=12; menuConfig.offshore=true; menuConfig.financeMode=false; _doStartGame(); setSpeed(0); G.budget=1e9;
    performStudy(null,'gravity'); const GS_=G.gridSize; G.sectionA=blocks[0].id; G.sectionB=blocks[GS_-1].id; performStudy(G.sectionA,'seismic2d');
    if(!out.sousPlafond){ const g0=guideCompute(); out.sousPlafond = { spent:+(guideStudySpent()/1e6).toFixed(2), cap:+(GUIDE_STUDY_CAP*MODES[G.mode].budget/1e6).toFixed(2), texte:g0 && g0.text.slice(0,70) }; }
    // dépasser le plafond avec des 3D sur les blocs les plus hauts
    const top=[...blocks].filter(b=>b.estimate?.structPos!==undefined).sort((a,z)=>z.estimate.structPos-a.estimate.structPos);
    for(const b of top){ if(guideStudySpent() >= GUIDE_STUDY_CAP*MODES[G.mode].budget) break; performStudy(b.id,'seismic2d'); performStudy(b.id,'seismic3d'); }
    const g = guideCompute(); const positif = blocks.some(b=>!b.well&&!b.dryHole&&b.estimate?.prob!==undefined&&b.studies.some(s=>s.type==='seismic3d')&&(guideEV(b)||{ev:-1}).ev>0);
    const nouvelleEtude = g && /guideDo\('(seismic2d|seismic3d|section)'/.test(g.act?.call||'');
    if(!positif && !out.plafondSansRentable){ out.plafondSansRentable = { texte:g.text.slice(0,95), action:g.act ? g.act.label : null, nouvelleEtudeRecommandee:nouvelleEtude }; }
    if(positif && !out.plafondAvecRentable){ out.plafondAvecRentable = { texte:g.text.slice(0,60), action:g.act ? g.act.label : null, nouvelleEtudeRecommandee:nouvelleEtude }; }
  }
  // avec un puits producteur : le guide dit de laisser produire (aucune action)
  return out; });
console.log(JSON.stringify(res,null,1)); console.log('erreurs',errs); await br.close(); })();
