// Épaisseurs variables des couches (option du labo) : variation réelle, cohérence des piles, cartes inchangées hors épaisseur
const LABO = 'file://' + require('path').resolve(__dirname, '../../labo-sismique.html');
const { chromium } = require('playwright');
(async()=>{ const br=await chromium.launch(); const pg=await br.newPage({viewport:{width:1400,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{ if(m.type()==='error'&&!/height/.test(m.text())) errs.push('console: '+m.text()); });
await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_menu','full')}catch(e){}});
await pg.goto(LABO); await pg.waitForTimeout(300);
const res = await pg.evaluate(()=>{ document.getElementById('tutorialModal').style.display='none'; const out={};
  const gen = (seed,size,thick)=>{ LABOPT = labNormOpt({ ...LAB_PRESETS.complet.o, thick }); menuConfig.seed=seed; menuConfig.gridSize=size; menuConfig.basinType='random'; _doStartGame(); setSpeed(0);
    return blocks.map(b=>({ top:b.topOfReservoir, p:b.trueProbability, prov:b.provinceIdx, salt:b.inSalt, H:b.horizons.map(h=>({top:h.top, th:h.thicknessLocal, base:h.base, role:h.role})) })); };
  for(const [seed,size] of [[2024,12],[7,12],[99,30]]){
    const off = gen(seed,size,false), on = gen(seed,size,true);
    // cartes inchangées hors épaisseur
    const memeTop = off.every((b,i)=>b.top===on[i].top), memeProv = off.every((b,i)=>b.prov===on[i].prov);
    // variation par couche et province (hors réservoir)
    const per={}; on.forEach(b=>{ if(b.salt) return; b.H.forEach((h,i)=>{ if(h.role==='reservoir') return; const k=b.prov+'/'+i; (per[k]=per[k]||[]).push(h.th); }); });
    const per2 = Object.values(per).filter(v=>v.reduce((a,c)=>a+c,0)>0); const cv = per2.map(v=>{ const m=v.reduce((a,c)=>a+c,0)/v.length; const sd=Math.sqrt(v.reduce((a,c)=>a+(c-m)**2,0)/v.length); return sd/m; });
    const rapport = per2.map(v=>Math.max(...v)/Math.min(...v));
    // piles cohérentes : top(i+1) = top(i)+épaisseur(i), épaisseurs positives
    let pilesOk = true, minTh = Infinity; on.forEach(b=>{ b.H.forEach((h,i)=>{ if(h.th>0) minTh = Math.min(minTh, h.th); if(i>0 && Math.abs(b.H[i-1].top + b.H[i-1].th - h.top) > 0.01) pilesOk = false; }); });
    // hors option : épaisseurs constantes par province
    const perOff={}; off.forEach(b=>{ if(b.salt) return; b.H.forEach((h,i)=>{ if(h.role==='reservoir') return; const k=b.prov+'/'+i; (perOff[k]=perOff[k]||[]).push(h.th); }); });
    const constantesOff = Object.values(perOff).every(v=>Math.max(...v)-Math.min(...v)<0.01);
    out[seed+'/'+size] = { memeTop, memeProv, constantesOff, pilesOk, minTh:+minTh.toFixed(1), cvMoyen:+(cv.reduce((a,c)=>a+c,0)/cv.length).toFixed(3), cvMax:+Math.max(...cv).toFixed(3), rapportMaxMin:+Math.max(...rapport).toFixed(2) };
  }
  return out; });
console.log(JSON.stringify(res,null,1));
// la coupe se dessine avec les épaisseurs variables
await pg.evaluate(()=>{ LABOPT = labNormOpt({ ...LAB_PRESETS.complet.o, thick:true }); menuConfig.seed=2024; menuConfig.gridSize=12; menuConfig.basinType='random'; _doStartGame(); setSpeed(0); G.budget=30e6; performStudy(null,'gravity'); const land=blocks.filter(b=>!b.isOffshore); const rows={}; land.forEach(b=>(rows[b.y]=rows[b.y]||[]).push(b)); const r=Object.values(rows).sort((a,z)=>z.length-a.length)[0].sort((a,z)=>a.x-z.x); G.sectionA=r[0].id; G.sectionB=r[r.length-1].id; performStudy(null,'seismic2d'); switchTab('section'); renderSection(); LAB.truth=true; renderSection(); });
await pg.evaluate(()=>openBigView('section')); await pg.waitForTimeout(300); await pg.screenshot({path:'lab_epaisseurs.png'});
console.log('erreurs',errs); await br.close(); })();
