// Clic sur une couche de la coupe (jeu principal) : toit, mur et épaisseur à l'endroit du clic, biseau, surlignage de toute la couche
const INDEX = 'file://' + require('path').resolve(__dirname, '../../index.html');
const { chromium } = require('playwright');
(async()=>{ const br=await chromium.launch(); const pg=await br.newPage({viewport:{width:1400,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_menu','full')}catch(e){}});
await pg.goto(INDEX); await pg.waitForTimeout(300);
await pg.click('.menu-tab[data-tab="world"]'); await pg.click('#basinPicker button[data-val="paris"]'); await pg.fill('#geoSeed','2024'); await pg.click('#startBtn'); await pg.waitForTimeout(500);
await pg.evaluate(()=>{ setSpeed(0); G.budget=30e6; performStudy(null,'gravity'); const land=blocks.filter(b=>!b.isOffshore); const rows={}; land.forEach(b=>(rows[b.y]=rows[b.y]||[]).push(b)); const r=Object.values(rows).sort((a,z)=>z.length-a.length)[0].sort((a,z)=>a.x-z.x); G.sectionA=r[0].id; G.sectionB=r[r.length-1].id; performStudy(null,'seismic2d'); switchTab('section'); renderSection(); });
const out={};
// clic réel sur la première bande atteignable
out.reel = await pg.evaluate(()=>{ const polys=[...document.querySelectorAll('#sectionSvg .sec-layer-poly')]; for(const poly of polys){ const bb=poly.getBoundingClientRect(); for(let y=bb.top;y<bb.bottom;y+=3){ for(let x=bb.left;x<bb.right;x+=3){ if(document.elementsFromPoint(x,y)[0]===poly){ poly.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:x,clientY:y})); return { label:document.getElementById('sectionLayerLabel')?.textContent, surlignees:document.querySelectorAll('.sec-layer-selected').length }; } } } } return null; });
// persistance au redessin, puis fermeture par clic dans le vide
out.apresRedessin = await pg.evaluate(()=>{ renderSection(); return { etiquette: !!document.getElementById('sectionLayerLabel'), surlignees: document.querySelectorAll('.sec-layer-selected').length }; });
out.apresClicVide = await pg.evaluate(()=>{ document.getElementById('sectionSvg').dispatchEvent(new MouseEvent('click',{bubbles:true})); return { etiquette: !!document.getElementById('sectionLayerLabel'), surlignees: document.querySelectorAll('.sec-layer-selected').length }; });
// biseau : couche qui s'amincit
out.biseau = await pg.evaluate(()=>{ const svg=document.getElementById('sectionSvg'), poly=svg.querySelector('.sec-layer-poly'), geo=JSON.parse(svg.getAttribute('data-sec')); poly.setAttribute('data-prof','[[0,100,300],[0.5,150,300],[1,290,291]]'); const ctm=svg.getScreenCTM(); const at=t=>({clientX:ctm.a*(geo.l+geo.w*t)+ctm.e, clientY:ctm.f+50}); return { gauche:secLayerInfo(at(0.05),poly), droite:secLayerInfo(at(0.97),poly) }; });
console.log(JSON.stringify(out,null,1)); console.log('erreurs',errs); await br.close(); })();
