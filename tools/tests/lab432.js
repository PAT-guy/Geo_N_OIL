const LABO = 'file://' + require('path').resolve(__dirname, '../../labo-sismique.html');
const INDEX = 'file://' + require('path').resolve(__dirname, '../../index.html');
const { chromium } = require('playwright');
(async()=>{ const br=await chromium.launch(); const ctx=await br.newContext({viewport:{width:1400,height:900}}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{ if(m.type()==='error'&&!/height/.test(m.text())) errs.push('console: '+m.text()); });
await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_menu','full')}catch(e){}});
const out={};
for(const [basin,seed] of [['paris','2024'],['paris','7'],['paris','99']]){
await pg.goto(LABO); await pg.waitForTimeout(300);
await pg.click('.menu-tab[data-tab="world"]'); await pg.click(`#basinPicker button[data-val="${basin}"]`); await pg.fill('#geoSeed',seed); await pg.click('#startBtn'); await pg.click('#labOptGo'); await pg.waitForTimeout(500);
out[basin+seed] = await pg.evaluate(()=>{ setSpeed(0); const r=[]; blocks.filter(b=>!b.isOffshore).slice(0,60).forEach(b=>{ b.studies.push({type:'welllog',result:{horizonsPartial:b.horizons.map(h=>({...h}))}}); const m=labCalModel(b); if(!m) return; let lo=null,hi=null; for(let V=1500;V<=7000;V+=25){ if(m.rms(V)<=m.tol){ if(lo===null) lo=V; hi=V; } } r.push({best:Math.round(m.best*1000), tol:Math.round(m.tol*1000), bestV:m.bestV, lo, hi, n:m.refl.length}); }); const ok=r.filter(x=>x.lo!==null).length; const w=r.map(x=>x.hi-x.lo); return {n:r.length, ok, minW:Math.min(...w), maxW:Math.max(...w), maxBest:Math.max(...r.map(x=>x.best)), vrange:[Math.min(...r.map(x=>x.bestV)),Math.max(...r.map(x=>x.bestV))]}; });
}
// parcours de jeu
await pg.goto(LABO); await pg.waitForTimeout(300);
await pg.click('.menu-tab[data-tab="world"]'); await pg.click('#basinPicker button[data-val="paris"]'); await pg.fill('#geoSeed','2024'); await pg.click('#startBtn'); await pg.click('#labOptGo'); await pg.waitForTimeout(500);
await pg.evaluate(()=>{ setSpeed(0); G.budget=30e6; performStudy(null,'gravity'); const land=blocks.filter(b=>!b.isOffshore); const rows={}; land.forEach(b=>(rows[b.y]=rows[b.y]||[]).push(b)); const r=Object.values(rows).sort((a,z)=>z.length-a.length)[0].sort((a,z)=>a.x-z.x); G.sectionA=r[0].id; G.sectionB=r[r.length-1].id; window.__row=r.map(b=>b.id); performStudy(null,'seismic2d'); switchTab('section'); labSetPick(3); drillBlock(window.__row[4],'vertical','renforce'); for(let i=0;i<30&&G.drilling.length;i++) monthTick(); drillRevealQueue.length=0; drillRevealPlaying=false; document.getElementById('drillRevealModal').classList.remove('open'); renderSection(); });
await pg.waitForTimeout(300);
const lv = ()=>pg.evaluate(()=>{ const prof=window.__row.map(id=>({b:blocks.find(b=>b.id===id)})); const lvs=labLevels(prof.map(o=>({b:o.b}))); const sec=document.getElementById('sectionInterpret').innerText; return { niveaux:lvs.join(','), litho:[...document.querySelectorAll('#sectionInterpret .lab-tab tbody td:nth-last-child(2)')].filter(td=>!td.textContent.includes('?')).length, bouton: !!document.querySelector('#sectionInterpret button[onclick^="labOpenCal"]'), calCalee:/calé ✓/.test(sec), guide:document.getElementById('guideText')?.innerText?.slice(0,90) }; });
out.avantCal = await lv();
await pg.evaluate(()=>labOpenCal(window.__row[4])); await pg.waitForTimeout(200);
await pg.screenshot({path:'lab_cal.png'});
out.mauvais = await pg.evaluate(()=>{ labCalSet(labCalState.m.bestV>3500?2000:6500); labCalValidate(); return document.getElementById('labCalMsg').innerText; });
out.mauvais2 = await pg.evaluate(()=>{ labCalValidate(); return document.getElementById('labCalMsg').innerText; });
const b0 = await pg.evaluate(()=>G.budget);
await pg.evaluate(()=>{ const sl=document.getElementById('labCalSlider'); sl.value=labCalState.m.bestV; sl.dispatchEvent(new Event('input')); });
await pg.screenshot({path:'lab_cal_ok.png'});
await pg.evaluate(()=>labCalValidate()); await pg.waitForTimeout(200);
out.bonus = (await pg.evaluate(()=>G.budget))-b0;
out.apresCal = await lv();
await pg.locator('#tab-section').screenshot({path:'lab_cal_apres.png'});
console.log(JSON.stringify(out,null,1)); console.log('erreurs',errs); await br.close(); })();
