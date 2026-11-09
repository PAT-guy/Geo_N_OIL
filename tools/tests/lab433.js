const LABO = 'file://' + require('path').resolve(__dirname, '../../index.html');
const INDEX = 'file://' + require('path').resolve(__dirname, '../../index.html');
const { chromium } = require('playwright');
(async()=>{ const br=await chromium.launch(); const ctx=await br.newContext({viewport:{width:1400,height:900}}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{ if(m.type()==='error'&&!/height/.test(m.text())) errs.push('console: '+m.text()); });
await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_menu','full')}catch(e){}});
const out={};
async function start(preset, lock){
  await pg.goto(LABO); await pg.waitForTimeout(300);
  await pg.click('.menu-tab[data-tab="world"]'); await pg.click('#basinPicker button[data-val="paris"]'); await pg.fill('#geoSeed','2024'); await pg.click('#startBtn'); await pg.waitForTimeout(200);
  const vis = await pg.evaluate(()=>document.getElementById('labOptModal').classList.contains('open') && !document.getElementById('menu').classList.contains('hidden'));
  await pg.evaluate(p=>labOptPreset(p||'complet'), preset);
  if(lock) await pg.evaluate(()=>labOptSet('locked',true));
  if(preset==='x') {}
  await pg.click('#labOptGo'); await pg.waitForTimeout(500);
  await pg.evaluate(()=>{ setSpeed(0); G.budget=30e6; performStudy(null,'gravity'); const land=blocks.filter(b=>!b.isOffshore); const rows={}; land.forEach(b=>(rows[b.y]=rows[b.y]||[]).push(b)); const r=Object.values(rows).sort((a,z)=>z.length-a.length)[0].sort((a,z)=>a.x-z.x); G.sectionA=r[0].id; G.sectionB=r[r.length-1].id; window.__row=r.map(b=>b.id); performStudy(null,'seismic2d'); switchTab('section'); renderSection(); });
  return vis;
}
const resolve=async()=>{ await pg.evaluate(()=>{ for(let i=0;i<30&&G.drilling.length;i++) monthTick(); }); await pg.waitForFunction(()=>/SONDAGE|PUITS/.test(document.getElementById('drillRevealTitle').textContent),null,{timeout:20000}); return await pg.evaluate(()=>{ const m=document.getElementById('drillRevealModal'); const r=m.innerText.replace(/\n/g,' ').slice(0,400); drillRevealQueue.length=0; drillRevealPlaying=false; m.classList.remove('open'); return r; }); };
// 1) défaut : écran d'options, sondage stratigraphique
out.ecran = await start(null,false);
out.opt = await pg.evaluate(()=>JSON.stringify(LABOPT));
out.boutons = await pg.evaluate(()=>({truth:getComputedStyle(document.getElementById('labTruthBtn')).display, opt:getComputedStyle(document.getElementById('labOptBtn')).display}));
const c = await pg.evaluate(()=>{ const b=blocks[window.__row[4]]; const d=drillDepthEstimate(b); const eq=EQUIPMENT.standard; return {vert:d*eq.costM*1, strati:d*eq.costM*METHODS.strati.costMult, depth:Math.round(d)}; });
out.cout = c;
out.optionStrati = await pg.evaluate(()=>{ selectedBlock=window.__row[4]; renderStudiesPanel(blocks[selectedBlock]); return [...document.querySelectorAll('#drillMethod option')].map(o=>o.textContent.slice(0,22)); });
const b0 = await pg.evaluate(()=>G.budget);
await pg.evaluate(()=>{ drillBlock(window.__row[4],'strati','standard'); });
out.sansCible = await pg.evaluate(()=>G.drilling.length);   // doit être 1 : pas de cible exigée pour le sondage
out.resStrati = await resolve();
out.coutPaye = Math.round(b0-(await pg.evaluate(()=>G.budget)));
out.strati = await pg.evaluate(()=>{ const b=blocks[window.__row[4]]; renderSection(); return { strati:b.strati, well:!!b.well, dry:!!b.dryHole, prob:b.estimate?.prob, drilled:labDrilled(b), niveaux:labLevels(window.__row.map(id=>({b:blocks[id]}))).join(',') }; });
out.puitsApres = await pg.evaluate(()=>{ blocks[window.__row[4]].well=null; labSetPick(3); const before=G.drilling.length; drillBlock(window.__row[4],'vertical','renforce'); return G.drilling.length-before; });
// 2) Découverte : pas de muet, pas de cible exigée, pas de calage
out.decouverte = await start('decouverte',false);
out.decOpt = await pg.evaluate(()=>JSON.stringify(LABOPT));
out.decCoupe = await pg.evaluate(()=>{ const poly=document.querySelectorAll('#sectionSvg .sec-layer-poly').length; const img=!!document.querySelector('#sectionSvg image'); drillBlock(window.__row[4],'vertical','renforce'); return {poly, img, forageLance:G.drilling.length, calBtn:!!document.querySelector('button[onclick^="labOpenCal"]')}; });
await pg.screenshot({path:'lab_decouverte.png'});
// 3) Expert verrouillé
await start('expert',true);
out.expert = await pg.evaluate(()=>({opt:JSON.stringify(LABOPT), truth:getComputedStyle(document.getElementById('labTruthBtn')).display, optBtn:getComputedStyle(document.getElementById('labOptBtn')).display, labOpt:JSON.stringify(G.labOpt)}));
await pg.evaluate(()=>labOptOpen('start')); await pg.screenshot({path:'lab_options.png'});
console.log(JSON.stringify(out,null,1)); console.log('erreurs',errs); await br.close(); })();
