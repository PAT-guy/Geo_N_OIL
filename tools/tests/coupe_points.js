// Points des blocs sur la coupe : visibles, cliquables, bloc sélectionné repéré par un trait vertical (jeu principal et labo)
const { chromium } = require('playwright');
const path = require('path');
(async()=>{ for(const [nom, file, labo] of [['jeu','index.html',false],['labo','index.html',true]]){
  const br=await chromium.launch(); const pg=await br.newPage({viewport:{width:1400,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_menu','full')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../'+file)); await pg.waitForTimeout(300);
  await pg.click('.menu-tab[data-tab="world"]'); await pg.click('#basinPicker button[data-val="paris"]'); await pg.fill('#geoSeed','2024'); await pg.click('#startBtn'); await pg.evaluate(()=>labOptPreset('complet')); await pg.click('#labOptGo'); await pg.waitForTimeout(500);
  await pg.evaluate(()=>{ setSpeed(0); G.budget=30e6; performStudy(null,'gravity'); const land=blocks.filter(b=>!b.isOffshore); const rows={}; land.forEach(b=>(rows[b.y]=rows[b.y]||[]).push(b)); const r=Object.values(rows).sort((a,z)=>z.length-a.length)[0].sort((a,z)=>a.x-z.x); G.sectionA=r[0].id; G.sectionB=r[r.length-1].id; window.__row=r.map(b=>b.id); performStudy(null,'seismic2d'); switchTab('section'); renderSection(); if(window.labSetPick) labSetPick(3); });
  const out={ nom };
  // les points de la rangée sont visibles : hors du groupe écrêté et au-dessus de tout autre élément à leur position
  out.points = await pg.evaluate(()=>{ const svg=document.getElementById('sectionSvg'); const cs=[...svg.querySelectorAll('circle')].filter(e=>/selectBlockFromSection/.test(e.getAttribute('onclick')||'') && !e.closest('g[clip-path]') && e.getAttribute('class')!=='sel-hit'); return { n:cs.length, dansGroupeEcrete:[...svg.querySelectorAll('g[clip-path] circle[onclick*="selectBlockFromSection"]')].filter(e=>+e.getAttribute('cy')>280).length }; });
  const id = await pg.evaluate(()=>window.__row[4]);
  // clic réel sur le point du bloc
  const pt = await pg.evaluate(id=>{ const c=[...document.querySelectorAll('#sectionSvg circle')].filter(e=>(e.getAttribute('onclick')||'').includes('selectBlockFromSection('+id+')') && +e.getAttribute('cy')>280 && e.getAttribute('class')!=='sel-hit')[0]; const r=c.getBoundingClientRect(); return { x:r.x+r.width/2, y:r.y+r.height/2, dessus: document.elementFromPoint(r.x+r.width/2, r.y+r.height/2)===c }; }, id);
  out.clicable = pt.dessus;
  await pg.mouse.click(pt.x, pt.y); await pg.waitForTimeout(200);
  out.apresClic = await pg.evaluate(id=>({ selectionne: selectedBlock===id, traitVertical: [...document.querySelectorAll('#sectionSvg line')].some(l=>l.getAttribute('stroke-dasharray')==='4 3' && l.getAttribute('stroke')==='var(--amber)'), etiquette: /Bloc \(\d+, \d+\)/.test(document.getElementById('sectionSvg').textContent), foragevise: /forage visé \d+ m/.test(document.getElementById('sectionSvg').textContent), panneauForage: /Forage/.test(document.getElementById('studiesContent')?.innerText||document.body.innerText) }), id);
  // second clic : désélection
  await pg.mouse.click(pt.x, pt.y); await pg.waitForTimeout(150);
  out.apresSecondClic = await pg.evaluate(()=>selectedBlock);
  await pg.locator('#tab-section').screenshot({path:'coupe_points_'+nom+'.png'});
  await pg.mouse.click(pt.x, pt.y); await pg.waitForTimeout(150);
  await pg.evaluate(()=>openBigView('section')); await pg.waitForTimeout(300); await pg.screenshot({path:'coupe_points_'+nom+'_grande.png'});
  console.log(JSON.stringify(out)); console.log('erreurs',errs); await br.close(); } })();
