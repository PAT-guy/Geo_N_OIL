// Trait de coupe cliquable avec flèche sur la carte ; finance dans les options de la partie
const LABO = 'file://' + require('path').resolve(__dirname, '../../index.html');
const { chromium } = require('playwright');
(async()=>{ const br=await chromium.launch(); const ctx=await br.newContext({viewport:{width:1400,height:900}}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{ if(m.type()==='error'&&!/height/.test(m.text())) errs.push('console: '+m.text()); });
await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_menu','full')}catch(e){}});
const out={};
async function start(finance){
  await pg.goto(LABO); await pg.waitForTimeout(300);
  await pg.click('.menu-tab[data-tab="world"]'); await pg.click('#basinPicker button[data-val="paris"]'); await pg.fill('#geoSeed','2024'); await pg.click('#startBtn'); await pg.waitForTimeout(200);
  const ligne = await pg.evaluate(()=>!!document.querySelector('#labOptModal input[onchange*="finance"]'));
  if(finance===false) await pg.evaluate(()=>labOptSet('finance', false));
  const coche = await pg.evaluate(()=>labOptDraft.finance);
  await pg.evaluate(()=>labOptPreset('complet')); await pg.click('#labOptGo'); await pg.waitForTimeout(500);
  return { ligne, coche, G: await pg.evaluate(()=>G.financeMode), financeTab: await pg.evaluate(()=>getComputedStyle(document.querySelector('[data-tab="finance"]')||document.body).display) };
}
out.defaut = await start();
await pg.evaluate(()=>{ setSpeed(0); G.budget=30e6; performStudy(null,'gravity'); const land=blocks.filter(b=>!b.isOffshore); const rows={}; land.forEach(b=>(rows[b.y]=rows[b.y]||[]).push(b)); const r=Object.values(rows).sort((a,z)=>z.length-a.length)[0].sort((a,z)=>a.x-z.x); window.__row=r.map(b=>b.id); });
// pose de la coupe comme un joueur : outil Coupe, clic A, clic B
await pg.click('#toolSection, [data-tool="section"]').catch(()=>{});
out.sansCoupe = await pg.evaluate(()=>!!document.getElementById('secLineSvg'));
await pg.evaluate(()=>{ setTool('section'); onBlockClick(window.__row[1]); onBlockClick(window.__row[9]); });
await pg.waitForTimeout(300);
out.trait = await pg.evaluate(()=>{ const s=document.getElementById('secLineSvg'); return s ? { lignes:s.querySelectorAll('line').length, marqueur:!!s.querySelector('marker'), flecheSurTrait: !!s.querySelector('[marker-end]') } : null; });
await pg.evaluate(()=>{ switchTab('geo'); });
await pg.screenshot({path:'lab_trait.png'});
// clic réel sur le trait
const box = await pg.locator('#secLineSvg line.hit').boundingBox();
await pg.evaluate(()=>{ switchTab('studies'); });
await pg.mouse.click(box.x+box.width/2, box.y+box.height/2); await pg.waitForTimeout(300);
out.apresClic = await pg.evaluate(()=>({ onglet: document.querySelector('.rtab.active, .tab.active, [data-tab].active')?.dataset?.tab, coupeVisible: getComputedStyle(document.getElementById('sectionSvg')).display }));
// zoom : le trait suit
const avant = await pg.evaluate(()=>document.querySelector('#secLineSvg line.hit').getAttribute('x2'));
await pg.click('#zoomIn'); await pg.waitForTimeout(200);
out.zoomSuit = (await pg.evaluate(()=>document.querySelector('#secLineSvg line.hit').getAttribute('x2'))) !== avant;
// outil Coupe de nouveau : l'ancien trait disparaît
await pg.evaluate(()=>setTool('section')); out.traitEffaceNouvelleCoupe = await pg.evaluate(()=>!document.getElementById('secLineSvg'));
// finance désactivée
out.sansFinance = await start(false);
await pg.evaluate(()=>labOptOpen('game'));
out.enJeu = await pg.evaluate(()=>({ desactive: document.querySelector('#labOptModal input[onchange*="finance"]').disabled, coche: document.querySelector('#labOptModal input[onchange*="finance"]').checked }));
console.log(JSON.stringify(out,null,1)); console.log('erreurs',errs); await br.close(); })();
