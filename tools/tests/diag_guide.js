// Diagnostic : le guide est-il bien calibré ? Compare, sur les 24 blocs les plus hauts étudiés en 3D, l'espérance de gain du guide à l'espérance vraie.
const { chromium } = require('playwright'); const path='file://'+require('path').resolve(__dirname,'../../index.html');
(async()=>{ const br=await chromium.launch(); const pg=await br.newPage(); await pg.goto(path); await pg.waitForTimeout(300);
const res = await pg.evaluate(()=>{ document.getElementById('tutorialModal').style.display='none';
 ['updateHud','renderBlock','drawSparkline','renderGeoPanel','renderStudiesPanel','renderSection','renderFinancePanel','addLog','toast','showDrillReveal','renderGuide'].forEach(n=>{ window[n]=()=>{}; });
 const mulberry=(a)=>()=>{ a=(a+0x6D2B79F5)|0; let t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return((t^(t>>>14))>>>0)/4294967296; };
 const out=[]; let est=[], tru=[], gev=[], tev=[];
 for(let seed=1;seed<=40;seed++){ Math.random=mulberry(seed*101*7919+13); LABOPT=labNormOpt({...LAB_PRESETS.decouverte.o}); menuConfig.seed=seed*101; menuConfig.mode='junior'; menuConfig.basinType='random'; menuConfig.gridSize=12; menuConfig.offshore=true; menuConfig.financeMode=false; _doStartGame(); setSpeed(0); G.budget=1e9;
   performStudy(null,'gravity'); const GSZ=G.gridSize;
   // 3D sur les 24 blocs les plus hauts d'après la gravimétrie (coupe fictive : on force 2D puis 3D)
   const top=[...blocks].filter(b=>b.estimate?.structPos!==undefined).sort((a,z)=>z.estimate.structPos-a.estimate.structPos).slice(0,24);
   top.forEach(b=>{ G.sectionA=G.sectionB=b.id; performStudy(b.id,'seismic2d'); performStudy(b.id,'seismic3d'); });
   top.forEach(b=>{ if(b.estimate?.prob===undefined) return; const e=guideEV(b); est.push(b.estimate.prob); tru.push(b.trueProbability); if(e) gev.push(e.ev);
     // espérance « vraie » : probabilité vraie, qualité et épaisseur vraies
     const depth=drillDepthEstimate(b); const res=b.horizons.find(l=>l.role==='reservoir'); const prod0=(b.trueQuality/100)*(res?.thicknessLocal||0)*PROD_BASE;
     let v=0; const fixed=b.isOffshore?30000:8000, varOp=(b.isOffshore?14:4)+6; for(let m=0;m<400;m++){ const p=prod0*declineFactor(m); const net=p*G.price-fixed-p*varOp; if(net<=0||p<5) break; v+=net; }
     const cost=depth*EQUIPMENT.standard.costM*(b.isOffshore?2.8:1); tev.push(b.trueProbability*EQUIPMENT.standard.reliability*v-cost); }); }
 const avg=a=>a.reduce((x,y)=>x+y,0)/a.length; const frac=(a,f)=>a.filter(f).length/a.length;
 return { n:est.length, probEstMoy:+avg(est).toFixed(3), probVraieMoy:+avg(tru).toFixed(3), guideEVMoyM:+(avg(gev)/1e6).toFixed(2), guideEVpositifs:+frac(gev,x=>x>0).toFixed(2), vraiEVMoyM:+(avg(tev)/1e6).toFixed(2), vraiEVpositifs:+frac(tev,x=>x>0).toFixed(2), coutForageMoyM:'' }; });
console.log(JSON.stringify(res,null,1)); await br.close(); })();
