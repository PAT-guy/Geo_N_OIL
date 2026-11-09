// Fusion du labo dans le jeu (V4.33) : préréglage par niveau, Découverte par défaut, ancienne sauvegarde, redirection du labo
const { chromium } = require('playwright');
const path = require('path');
const INDEX = 'file://' + path.resolve(__dirname, '../../index.html');
const LABO = 'file://' + path.resolve(__dirname, '../../labo-sismique.html');
(async()=>{ const br=await chromium.launch(); const ctx=await br.newContext({viewport:{width:1400,height:900}}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{ if(m.type()==='error'&&!/height/.test(m.text())) errs.push('console: '+m.text()); });
await pg.addInitScript(()=>{ try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_menu','full')}catch(e){} });
const out={};
await pg.goto(INDEX); await pg.waitForTimeout(300);
out.titre = await pg.title();
for(const mode of ['junior','expert','expedition','sandbox']){
  await pg.evaluate(m=>{ menuConfig.mode=m; }, mode);
  await pg.click('#startBtn'); await pg.waitForTimeout(100);
  out['modal_'+mode] = await pg.evaluate(()=>({ mute:labOptDraft.mute, pick:labOptDraft.pick, cal:labOptDraft.cal, thick:labOptDraft.thick, cheat:labOptDraft.cheat }));
  await pg.evaluate(()=>labOptCancel());
}
await pg.evaluate(()=>{ menuConfig.mode='junior'; menuConfig.seed=2024; });
await pg.click('#startBtn'); await pg.click('#labOptGo'); await pg.waitForTimeout(500);
out.decouverte = await pg.evaluate(()=>{ setSpeed(0); G.budget=30e6; performStudy(null,'gravity'); const b=blocks.find(x=>!x.isOffshore); performStudy(b.id,'seismic2d'); const n=G.drilling.length; drillBlock(b.id,'vertical','standard'); return { opt:JSON.stringify(G.labOpt), forageLance:G.drilling.length-n, truthBtn:getComputedStyle(document.getElementById('labTruthBtn')).display, cleSauvegarde: SAVE_KEY }; });
out.sauvegarde = await pg.evaluate(()=>{ saveGame(); const raw=JSON.parse(localStorage.getItem(SAVE_KEY)); delete raw.G.labOpt; localStorage.setItem(SAVE_KEY, JSON.stringify(raw)); LABOPT = labNormOpt({ ...LAB_PRESETS.complet.o }); loadGame(); return { mute:LABOPT.mute, pick:LABOPT.pick, thick:LABOPT.thick }; });
const p2 = await ctx.newPage(); await p2.goto(LABO); await p2.waitForTimeout(800); out.redirection = p2.url().includes('index.html');
console.log(JSON.stringify(out,null,1)); console.log('erreurs',errs); await br.close(); })();
