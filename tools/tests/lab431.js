const LABO = 'file://' + require('path').resolve(__dirname, '../../index.html');
const INDEX = 'file://' + require('path').resolve(__dirname, '../../index.html');
const { chromium } = require('playwright');
(async()=>{ const br=await chromium.launch(); const ctx=await br.newContext({viewport:{width:1400,height:900}}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{ if(m.type()==='error'&&!/height/.test(m.text())) errs.push('console: '+m.text()); });
await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_menu','full')}catch(e){}});
await pg.goto(LABO); await pg.waitForTimeout(300);
await pg.click('.menu-tab[data-tab="world"]'); await pg.click('#basinPicker button[data-val="paris"]'); await pg.fill('#geoSeed','2024'); await pg.click('#startBtn'); await pg.evaluate(()=>labOptPreset('complet')); await pg.click('#labOptGo'); await pg.waitForTimeout(500);
const out={};
await pg.evaluate(()=>{ setSpeed(0); G.budget=30e6; performStudy(null,'gravity'); const land=blocks.filter(b=>!b.isOffshore); const rows={}; land.forEach(b=>(rows[b.y]=rows[b.y]||[]).push(b)); const r=Object.values(rows).sort((a,z)=>z.length-a.length)[0].sort((a,z)=>a.x-z.x); G.sectionA=r[0].id; G.sectionB=r[r.length-1].id; window.__row=r.map(b=>b.id); performStudy(null,'seismic2d'); switchTab('section'); renderSection(); });
await pg.waitForTimeout(300);
const drill=()=>pg.evaluate(()=>{ const id=window.__row[4]; const n0=G.drilling.length; const b0=G.budget; drillBlock(id,'vertical','renforce'); return {lance:G.drilling.length>n0, budget:b0-G.budget}; });
const resolve=async()=>{ await pg.evaluate(()=>{ for(let i=0;i<30&&G.drilling.length;i++) monthTick(); }); await pg.waitForFunction(()=>/PUITS/.test(document.getElementById('drillRevealTitle').textContent),null,{timeout:20000}); const t=await pg.evaluate(()=>{ const m=document.getElementById('drillRevealModal'); const r=m.innerText.replace(/\n/g,' ').slice(0,600); drillRevealQueue.length=0; drillRevealPlaying=false; m.classList.remove('open'); return r; }); return {txt:t}; };
// clic souris sur la sismique
const rb = await pg.locator('#sectionSvg rect[onclick="labPickAt(event)"]').first().boundingBox(); const x=rb.x+rb.width*0.5, y=rb.y+rb.height*0.5;
await pg.mouse.click(x,y); await pg.waitForTimeout(200);
out.pickSouris = await pg.evaluate(()=>G.labPick);
out.trait = await pg.evaluate(()=>/🎯/.test(document.getElementById('sectionSvg').innerHTML));
// mauvaise cible
const resIdx = await pg.evaluate(()=>STRAT.findIndex(l=>l.role==='reservoir'));
out.resIdx=resIdx;
const wrong = await pg.evaluate((r)=>{ const nl = getBlockLayerData(blocks.find(b=>b.id===window.__row[4])).length; return nl>1 ? (r===0?1:0) : null; }, resIdx);
await pg.evaluate(w=>labSetPick(G.labPick===w? (w+1) : w), wrong); 
out.pickMauvais = await pg.evaluate(()=>G.labPick);
const bud0 = await pg.evaluate(()=>G.budget);
out.drillMauvais = await drill(); out.resMauvais = await resolve();
await pg.evaluate(()=>renderSection());
out.litho = await pg.evaluate(()=>[...document.querySelectorAll('#sectionInterpret .lab-tab tbody td:nth-last-child(2)')].filter(td=>!td.textContent.includes('?')).length);
// bonne cible (autre bloc du profil)
await pg.evaluate(r=>{ G.labPick=null; labSetPick(r); },resIdx);
out.pickBon = await pg.evaluate(()=>G.labPick);
const b1 = await pg.evaluate(()=>G.budget);
await pg.evaluate(()=>{ const id=window.__row[2]; drillBlock(id,'vertical','renforce'); });
out.resBon = await resolve();
out.budgetBon = (await pg.evaluate(()=>G.budget))-b1;
await pg.evaluate(()=>{ renderSection(); selectedBlock=null; });
await pg.screenshot({path:'lab_p2.png'});
// fuites
out.fuiteBloc = await pg.evaluate(()=>{ const b=blocks.find(b=>b.id===window.__row[6]); renderGeoPanel(b); return document.getElementById('geoPanel')?.innerText.match(/R.servoir[^\n]*\n?[^\n]*/)?.[0]; });
console.log(JSON.stringify(out,null,1)); console.log('erreurs',errs); await br.close(); })();
