// Effet de voisinage : un puits productif relève la probabilité estimée et réelle des blocs voisins, un puits sec utile l'abaisse
const { chromium } = require('playwright');
const path = require('path');
(async()=>{ const br=await chromium.launch(); const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(300);
const res = await pg.evaluate(()=>{ document.getElementById('tutorialModal').style.display='none';
  ['updateHud','renderBlock','drawSparkline','renderGeoPanel','renderStudiesPanel','renderSection','renderFinancePanel','addLog','toast','showDrillReveal','renderGuide'].forEach(n=>{ window[n]=()=>{}; });
  LABOPT=labNormOpt({...LAB_PRESETS.decouverte.o}); menuConfig.seed=7; menuConfig.mode='junior'; menuConfig.basinType='paris'; menuConfig.gridSize=12; menuConfig.offshore=false; menuConfig.financeMode=false; _doStartGame(); setSpeed(0); G.budget=1e9;
  performStudy(null,'gravity'); const c=blocks.find(b=>b.x===5&&b.y===5); const n1=blocks.find(b=>b.x===6&&b.y===5), n2=blocks.find(b=>b.x===7&&b.y===5), n3=blocks.find(b=>b.x===9&&b.y===5), far=blocks.find(b=>b.x===11&&b.y===11);
  [c,n1,n2,n3,far].forEach(b=>{ G.sectionA=G.sectionB=b.id; performStudy(b.id,'seismic2d'); performStudy(b.id,'seismic3d'); });
  const before = [n1,n2,n3,far].map(b=>b.estimate.prob), bBoost=[n1,n2,n3,far].map(b=>discoveryBoost(b));
  // forcer un puits productif au centre
  const rnd = Math.random; Math.random = ()=>0.0001; drillBlock(c.id,'vertical','standard'); for(let i=0;i<30&&G.drilling.length;i++) monthTick(); Math.random = rnd;
  const productif = !!c.well;
  const after = [n1,n2,n3,far].map(b=>b.estimate.prob), aBoost=[n1,n2,n3,far].map(b=>+discoveryBoost(b).toFixed(2));
  return { productif, avant:before.map(x=>+x.toFixed(3)), apres:after.map(x=>+x.toFixed(3)), boostApres:aBoost, boostAvant:bBoost, ratios:after.map((x,i)=>+(x/before[i]).toFixed(2)) }; });
console.log(JSON.stringify(res,null,1)); console.log('erreurs',errs); await br.close(); })();
