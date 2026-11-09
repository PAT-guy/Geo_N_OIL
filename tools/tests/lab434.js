const LABO = 'file://' + require('path').resolve(__dirname, '../../index.html');
const INDEX = 'file://' + require('path').resolve(__dirname, '../../index.html');
const { chromium } = require('playwright');
(async()=>{ const br=await chromium.launch(); const ctx=await br.newContext({viewport:{width:1400,height:900}}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{ if(m.type()==='error'&&!/height/.test(m.text())) errs.push('console: '+m.text()); });
await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_menu','full')}catch(e){}});
const out={};
await pg.goto(LABO); await pg.waitForTimeout(300);
await pg.click('.menu-tab[data-tab="world"]'); await pg.click('#basinPicker button[data-val="paris"]'); await pg.fill('#geoSeed','2024'); await pg.click('#startBtn'); await pg.evaluate(()=>labOptPreset('complet')); await pg.click('#labOptGo'); await pg.waitForTimeout(500);
await pg.evaluate(()=>{ setSpeed(0); G.budget=30e6; performStudy(null,'gravity'); const land=blocks.filter(b=>!b.isOffshore); const rows={}; land.forEach(b=>(rows[b.y]=rows[b.y]||[]).push(b)); const r=Object.values(rows).sort((a,z)=>z.length-a.length)[0].sort((a,z)=>a.x-z.x); G.sectionA=r[0].id; G.sectionB=r[r.length-1].id; window.__row=r.map(b=>b.id); performStudy(null,'seismic2d'); switchTab('section'); renderSection(); });
await pg.evaluate(()=>openBigView('section')); await pg.waitForTimeout(300); await pg.screenshot({path:'lab_p4_avant.png'}); await pg.evaluate(()=>closeBigView());
out.qualite = await pg.evaluate(()=>labProcQ());
// 3D sur quelques blocs du profil
await pg.evaluate(()=>{ [3,4,5,6].forEach(i=>{ try{ performStudy(window.__row[i],'seismic3d'); }catch(e){ window.__e=e.message; } }); renderSection(); });
out.err3d = await pg.evaluate(()=>window.__e||null);
out.est = await pg.evaluate(()=>[3,4,5,6].map(i=>{ const b=blocks[window.__row[i]]; const e=b.estimate||{}; return {prob:e.prob, fine:e.probFine&&+e.probFine.toFixed(2), cls:e.dhiClass, amp:e.amplitude, vrai:+b.trueProbability.toFixed(2)}; }));
await pg.evaluate(()=>openBigView('section')); await pg.waitForTimeout(300); await pg.screenshot({path:'lab_p4_3d.png'}); await pg.evaluate(()=>closeBigView());
const b0 = await pg.evaluate(()=>G.budget);
await pg.evaluate(()=>labReprocess()); await pg.waitForTimeout(200);
out.retraite = { cout:Math.round(b0-(await pg.evaluate(()=>G.budget))), q: await pg.evaluate(()=>labProcQ()), bouton: await pg.evaluate(()=>!!document.querySelector('#sectionInterpret button[onclick="labReprocess()"]')), etat: await pg.evaluate(()=>/Traitement de cette sismique : [a-zé]+/.exec(document.getElementById('sectionInterpret').innerText)?.[0]) };
await pg.evaluate(()=>openBigView('section')); await pg.waitForTimeout(300); await pg.screenshot({path:'lab_p4_retraite.png'}); await pg.evaluate(()=>closeBigView());
out.axeMs = await pg.evaluate(()=>[...document.querySelectorAll('#sectionSvg text')].map(t=>t.textContent).filter(t=>/^\d+$/.test(t)).join(','));
// Découverte : valeurs fines conservées
await pg.goto(LABO); await pg.waitForTimeout(300);
await pg.click('.menu-tab[data-tab="world"]'); await pg.click('#basinPicker button[data-val="paris"]'); await pg.fill('#geoSeed','2024'); await pg.click('#startBtn'); await pg.evaluate(()=>labOptPreset('decouverte')); await pg.evaluate(()=>labOptPreset('complet')); await pg.click('#labOptGo'); await pg.waitForTimeout(500);
out.decouverte = await pg.evaluate(()=>{ setSpeed(0); G.budget=30e6; performStudy(null,'gravity'); const b=blocks.find(b=>!b.isOffshore); const row=blocks.filter(x=>!x.isOffshore&&x.y===b.y); G.sectionA=row[0].id; G.sectionB=row[row.length-1].id; performStudy(null,'seismic2d'); performStudy(b.id,'seismic3d'); return {prob:b.estimate?.prob, fine:b.estimate?.probFine, err:b.studies.map(s=>s.type)}; });
console.log(JSON.stringify(out,null,1)); console.log('erreurs',errs); await br.close(); })();
