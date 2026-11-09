const LABO = 'file://' + require('path').resolve(__dirname, '../../labo-sismique.html');
const INDEX = 'file://' + require('path').resolve(__dirname, '../../index.html');
const { chromium } = require('playwright');
(async()=>{ const br=await chromium.launch(); const ctx=await br.newContext({viewport:{width:1400,height:900}}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{ if(m.type()==='error'&&!/height/.test(m.text())) errs.push('console: '+m.text()); });
await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_menu','full')}catch(e){}});
await pg.goto(LABO); await pg.waitForTimeout(300);
await pg.click('.menu-tab[data-tab="world"]'); await pg.click('#basinPicker button[data-val="paris"]'); await pg.fill('#geoSeed','2024'); await pg.click('.start-btn'); await pg.waitForTimeout(500);
const out={};
out.titre=await pg.title();
await pg.evaluate(()=>{ setSpeed(0); G.budget=30e6; performStudy(null,'gravity'); const land=blocks.filter(b=>!b.isOffshore); const rows={}; land.forEach(b=>(rows[b.y]=rows[b.y]||[]).push(b)); const r=Object.values(rows).sort((a,z)=>z.length-a.length)[0].sort((a,z)=>a.x-z.x); G.sectionA=r[0].id; G.sectionB=r[r.length-1].id; window.__row=r.map(b=>b.id); performStudy(null,'seismic2d'); switchTab('section'); renderSection(); });
await pg.waitForTimeout(300);
// aucune lithologie dans la coupe avant forage
out.avant=await pg.evaluate(()=>{ const names=new Set(); STRAT_PROVINCES.forEach(c=>c.forEach(l=>names.add(l.name))); const txt=[...document.querySelectorAll('#sectionSvg text')].map(t=>t.textContent); const leg=document.getElementById('sectionLegend').innerText; const fuite=[...names].filter(n=>txt.some(t=>t.startsWith(n.slice(0,10)))||leg.includes(n)); return { image: !!document.querySelector('#sectionSvg image'), etiquettes: txt.filter(t=>/^H\d+$/.test(t)).length, fuites: fuite, legende: leg.slice(0,120).replace(/\n/g,' '), tableau: document.querySelectorAll('#sectionInterpret .lab-tab tbody tr').length }; });
await pg.locator('#tab-section').screenshot({path:'lab_avant.png'});
await pg.evaluate(()=>openBigView('section')); await pg.waitForTimeout(300); await pg.screenshot({path:'lab_avant_grand.png'}); await pg.evaluate(()=>closeBigView());
// forer un bloc du profil, puis voir la lithologie se débloquer
await pg.evaluate(()=>{ const id=window.__row[4]; drillBlock(id,'vertical','renforce'); for(let i=0;i<30&&G.drilling.length;i++) monthTick(); drillRevealQueue.length=0; drillRevealPlaying=false; document.getElementById('drillRevealModal').classList.remove('open'); renderSection(); });
await pg.waitForTimeout(300);
out.apres=await pg.evaluate(()=>{ const leg=document.getElementById('sectionLegend').innerText.replace(/\n/g,' ').slice(0,200); return { polygones: document.querySelectorAll('#sectionSvg .sec-layer-poly').length, lithologiesDansLegende: leg.slice(0,200), tableauAvecNoms: [...document.querySelectorAll('#sectionInterpret .lab-tab tbody td:last-child')].filter(td=>!td.textContent.includes('?')).length }; });
await pg.locator('#tab-section').screenshot({path:'lab_apres.png'});
await pg.evaluate(()=>openBigView('section')); await pg.waitForTimeout(300); await pg.screenshot({path:'lab_apres_grand.png'}); await pg.evaluate(()=>closeBigView());
await pg.click('#labTruthBtn'); await pg.waitForTimeout(200); out.verite=await pg.evaluate(()=>({img:!!document.querySelector('#sectionSvg image'), poly:document.querySelectorAll('#sectionSvg .sec-layer-poly').length})); await pg.click('#labTruthBtn');
console.log(JSON.stringify(out,null,1)); console.log('erreurs',errs); await br.close(); })();
