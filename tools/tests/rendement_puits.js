// Rendement d'un puits productif : débit initial, production cumulée, durée de vie, valeur nette, coût de forage, à terre et en mer (prix fixé à 70 $/bbl).
const { chromium } = require('playwright');
(async()=>{ const br=await chromium.launch(); const pg=await br.newPage(); await pg.goto('file://'+require('path').resolve(__dirname,'../../index.html')); await pg.waitForTimeout(300);
const res = await pg.evaluate(()=>{ document.getElementById('tutorialModal').style.display='none';
 ['updateHud','renderBlock','drawSparkline','renderGeoPanel','renderStudiesPanel','renderSection','renderFinancePanel','addLog','toast','showDrillReveal','renderGuide'].forEach(n=>{ window[n]=()=>{}; });
 const mulberry=(a)=>()=>{ a=(a+0x6D2B79F5)|0; let t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return((t^(t>>>14))>>>0)/4294967296; };
 const rows=[]; 
 for(let seed=1;seed<=30;seed++){ Math.random=mulberry(seed*101*7919+13); LABOPT=labNormOpt({...LAB_PRESETS.decouverte.o}); menuConfig.seed=seed*101; menuConfig.mode='junior'; menuConfig.basinType='random'; menuConfig.gridSize=12; menuConfig.offshore=true; menuConfig.financeMode=false; _doStartGame(); setSpeed(0);
   blocks.forEach(b=>{ const res=b.horizons.find(l=>l.role==='reservoir'); if(!res||res.thicknessLocal<3||b.inSalt) return;
     const q=b.trueQuality, th=res.thicknessLocal; const p0=(q/100)*th*PROD_BASE*prodSite(b); // barils/mois (ou Mcf)
     const depth=b.topOfReservoir; const cost=depth*EQUIPMENT.standard.costM*(b.isOffshore?OFFSHORE_COST_MULT:1);
     let cumB=0, V=0, months=0; const fixed=b.isOffshore?OFFSHORE_OPEX:8000, varOp=(b.isOffshore?14:4)+6; const price=70;
     for(let m=0;m<400;m++){ const p=p0*declineFactor(m); const net=p*price-fixed-p*varOp; if(net<=0||p<5) break; cumB+=p; V+=net; months=m+1; }
     rows.push({p0, bbld:p0/30.4, cumB, V, cost, months, off:b.isOffshore, p:b.trueProbability, depth}); }); }
 const on=rows.filter(r=>!r.off), off=rows.filter(r=>r.off);
 const q=(a,f)=>{ const s=[...a].map(f).sort((x,y)=>x-y); return [0.1,0.5,0.9].map(k=>+s[Math.floor(s.length*k)].toFixed(1)); };
 const res={};
 for(const [nom,set] of [['terre',on],['mer',off]]){ if(!set.length) continue; res[nom]={ n:set.length,
   debitInitialBblJour_p10_p50_p90:q(set,r=>r.bbld), productionCumulee_kbbl_p10_p50_p90:q(set,r=>r.cumB/1e3), dureeVieAns_p10_p50_p90:q(set,r=>r.months/12),
   valeurNetteDuPuitsM_p10_p50_p90:q(set,r=>r.V/1e6), coutForageM_p10_p50_p90:q(set,r=>r.cost/1e6), profondeurM_p10_p50_p90:q(set,r=>r.depth),
   ratioValeurSurCout_p50:+(([...set].map(r=>r.V/r.cost).sort((a,b)=>a-b))[Math.floor(set.length/2)]).toFixed(1), probSucces_moy:+(set.reduce((a,r)=>a+r.p,0)/set.length).toFixed(2) }; }
 return res; });
console.log(JSON.stringify(res,null,1)); await br.close(); })();
