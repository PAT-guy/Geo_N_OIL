// Trait de coupe : case à cocher (mémorisée), conservation en pointillé pendant une nouvelle coupe, blocs encore cliquables, sauvegarde/chargement
const LABO = 'file://' + require('path').resolve(__dirname, '../../labo-sismique.html');
const { chromium } = require('playwright');
(async()=>{ const br=await chromium.launch(); const ctx=await br.newContext({viewport:{width:1400,height:900}}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{ if(m.type()==='error'&&!/height/.test(m.text())) errs.push('console: '+m.text()); });
await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_menu','full')}catch(e){}});
const out={};
async function start(){
  await pg.goto(LABO); await pg.waitForTimeout(300);
  await pg.click('.menu-tab[data-tab="world"]'); await pg.click('#basinPicker button[data-val="paris"]'); await pg.fill('#geoSeed','2024'); await pg.click('#startBtn'); await pg.click('#labOptGo'); await pg.waitForTimeout(500);
  await pg.evaluate(()=>{ setSpeed(0); G.budget=30e6; performStudy(null,'gravity'); const land=blocks.filter(b=>!b.isOffshore); const rows={}; land.forEach(b=>(rows[b.y]=rows[b.y]||[]).push(b)); const r=Object.values(rows).sort((a,z)=>z.length-a.length)[0].sort((a,z)=>a.x-z.x); window.__row=r.map(b=>b.id); });
}
const trait = ()=>pg.evaluate(()=>{ const s=document.getElementById('secLineSvg'); if(!s) return null; const v=s.querySelectorAll('line')[1]; return { fantome: !!v.getAttribute('stroke-dasharray'), cliquable: getComputedStyle(s.querySelector('.hit')).pointerEvents }; });
await start();
out.caseCochee = await pg.evaluate(()=>document.getElementById('secLineChk').checked);
await pg.evaluate(()=>{ setTool('section'); onBlockClick(window.__row[1]); onBlockClick(window.__row[9]); });
out.pose = await trait();
// blocs sous le trait : clic au bord (hors bande de 10 px) puis au centre
const bid = await pg.evaluate(()=>window.__row[4]);
const bb = await pg.locator('.block[data-id="'+bid+'"]').boundingBox();
await pg.mouse.click(bb.x+bb.width/2, bb.y+4); await pg.waitForTimeout(150);
out.clicBord = await pg.evaluate(id=>selectedBlock===id, bid);
await pg.evaluate(()=>{ selectedBlock=null; });
await pg.mouse.click(bb.x+bb.width/2, bb.y+bb.height/2); await pg.waitForTimeout(150);
out.clicCentre = await pg.evaluate(id=>({ bloc: selectedBlock===id }), bid);
// décocher
await pg.uncheck('#secLineChk'); out.masque = await trait();
await pg.evaluate(()=>{ rerenderAllBlocks(); }); out.masqueApresRerendu = await trait();
await pg.reload(); await pg.waitForTimeout(300);
out.memorise = await pg.evaluate(()=>({ pref: LAB_SECLINE, ls: localStorage.getItem('geoexplorer_secline') }));
await start(); out.caseApresRecharge = await pg.evaluate(()=>document.getElementById('secLineChk').checked);
await pg.check('#secLineChk');
await pg.evaluate(()=>{ setTool('section'); onBlockClick(window.__row[1]); onBlockClick(window.__row[9]); });
out.reaffiche = await trait();
// nouvelle coupe : l'ancienne reste en pointillé
await pg.evaluate(()=>{ setTool('section'); onBlockClick(window.__row[2]); });
out.pendantNouvelle = await trait();
await pg.evaluate(()=>{ onBlockClick(window.__row[7]); });
out.nouvelleCoupe = await trait();
out.fantomeEfface = await pg.evaluate(()=>G.labSecPrev);
// sauvegarde puis chargement
const saveFn = await pg.evaluate(()=> typeof saveGame==='function' ? 'saveGame' : (typeof doSave==='function' ? 'doSave' : null));
out.saveFn = saveFn;
if(saveFn){ await pg.evaluate(f=>window[f](), saveFn); await pg.evaluate(()=>{ loadGame(); }); await pg.waitForTimeout(400); out.apresChargement = await trait(); }
console.log(JSON.stringify(out,null,1)); console.log('erreurs',errs); await br.close(); })();
