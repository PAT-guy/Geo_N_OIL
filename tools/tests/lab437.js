// Sondage stratigraphique : carotte et Rock-Eval possibles, la carotte cale le puits et double la portée de sa lithologie
const LABO = 'file://' + require('path').resolve(__dirname, '../../index.html');
const { chromium } = require('playwright');
(async()=>{ const br=await chromium.launch(); const ctx=await br.newContext({viewport:{width:1400,height:900}}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{ if(m.type()==='error'&&!/height/.test(m.text())) errs.push('console: '+m.text()); });
await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_menu','full')}catch(e){}});
const out={};
await pg.goto(LABO); await pg.waitForTimeout(300);
await pg.click('.menu-tab[data-tab="world"]'); await pg.click('#basinPicker button[data-val="paris"]'); await pg.fill('#geoSeed','2024'); await pg.click('#startBtn'); await pg.evaluate(()=>labOptPreset('complet')); await pg.click('#labOptGo'); await pg.waitForTimeout(500);
await pg.evaluate(()=>{ setSpeed(0); G.budget=30e6; performStudy(null,'gravity'); const land=blocks.filter(b=>!b.isOffshore); const rows={}; land.forEach(b=>(rows[b.y]=rows[b.y]||[]).push(b)); const r=Object.values(rows).sort((a,z)=>z.length-a.length)[0].sort((a,z)=>a.x-z.x); G.sectionA=r[0].id; G.sectionB=r[r.length-1].id; window.__row=r.map(b=>b.id); performStudy(null,'seismic2d'); switchTab('section'); renderSection(); });
const id = await pg.evaluate(()=>window.__row[2]);
out.carotteAvantSondage = await pg.evaluate(id=>{ const n=blocks[id].studies.length; performStudy(id,'core'); return blocks[id].studies.length-n; }, id);   // doit être 0 : pas encore foré
await pg.evaluate(id=>{ drillBlock(id,'strati','standard'); for(let i=0;i<30&&G.drilling.length;i++) monthTick(); drillRevealQueue.length=0; drillRevealPlaying=false; document.getElementById('drillRevealModal').classList.remove('open'); }, id);
const niveaux = ()=>pg.evaluate(()=>labLevels(window.__row.map(i=>({b:blocks[i]}))).join(','));
out.niveauxAvantCarotte = await niveaux();
out.boutonsEtudes = await pg.evaluate(id=>{ selectedBlock=id; renderStudiesPanel(blocks[id]); const t=document.getElementById('studiesContent')?.innerText || document.body.innerText; return { carotte:/Carotte\s*:/.test(t), rockeval:/Rock-Eval\s*:/.test(t), desactives:[...document.querySelectorAll('button[onclick*="\'core\'"],button[onclick*="\'rockeval\'"]')].map(b=>b.disabled) }; }, id);
const b0 = await pg.evaluate(()=>G.budget);
await pg.evaluate(id=>{ performStudy(id,'core'); }, id);
out.coutCarotte = Math.round(b0-(await pg.evaluate(()=>G.budget)));
out.carotte = await pg.evaluate(id=>{ const e=blocks[id].estimate; return e?.core ? { porosite:+e.core.porosity.toFixed(1), hcSaturation:e.core.hcSaturation, odeur:e.core.odour } : (blocks[id].studies.find(s=>s.type==='core')?.result || null); }, id);
out.niveauxApresCarotte = await niveaux();
const b1 = await pg.evaluate(()=>G.budget);
await pg.evaluate(id=>{ performStudy(id,'rockeval'); }, id);
out.coutRockEval = Math.round(b1-(await pg.evaluate(()=>G.budget)));
out.rockeval = await pg.evaluate(id=>{ const r=blocks[id].estimate?.rockeval; return r ? { toc:r.toc, tmax:r.tmax, pot:r.genPotential } : null; }, id);
out.panneau = await pg.evaluate(id=>{ renderGeoPanel(blocks[id]); const t=document.getElementById('geoContent').innerText; return { carotte:/Analyse de carotte/.test(t), note:/hors du sommet du piège/.test(t), rockeval:/Géochimie Rock-Eval/.test(t) }; }, id);
out.listePuits = await pg.evaluate(()=>/calé par la carotte/.test(document.getElementById('sectionInterpret').innerText));
out.strati = await pg.evaluate(id=>({ strati:blocks[id].strati, well:!!blocks[id].well, dry:!!blocks[id].dryHole }), id);
await pg.locator('#tab-section').screenshot({path:'lab_carotte.png'});
console.log(JSON.stringify(out,null,1)); console.log('erreurs',errs); await br.close(); })();
