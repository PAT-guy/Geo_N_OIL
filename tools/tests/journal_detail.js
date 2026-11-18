// Journal (V5.22) : un clic sur un événement ouvre sa description ; s'il concerne un bloc foré, le rapport de forage et un bouton pour ouvrir le bloc. Clavier, Échap, événement sans bloc.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1300,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  await pg.evaluate(async()=>{ document.getElementById('geoSeed').value='2024'; menuConfig.mode='junior'; menuConfig.basinType='paris'; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); setSpeed(0); G.budget=30e6; LABOPT.pick=false; G.labOpt.pick=false; performStudy(null,'gravity'); });
  const ids = await pg.evaluate(()=>{ const c=blocks.filter(b=>!b.inSalt && !b.isOffshore && !b.well && !b.dryHole).sort((a,z)=>z.trueProbability-a.trueProbability); let well=null, dry=null; for(const b of c){ drillBlock(b.id,'vertical','renforce'); for(let i=0;i<40&&G.drilling.length;i++) monthTick(); drillRevealQueue.length=0; drillRevealPlaying=false; document.getElementById('drillRevealModal')?.classList.remove('open'); if(b.well && well===null) well=b.id; if(b.dryHole && dry===null) dry=b.id; if(well!==null && dry!==null) break; }
    const bw = well!==null ? blocks[well] : null, bd = dry!==null ? blocks[dry] : null; if(bw) addLog(`✓ Puits productif : bloc (${bw.x},${bw.y}).`,'good'); if(bd) addLog(`✗ Forage infructueux : bloc (${bd.x},${bd.y}), aucun HC.`,'bad'); addLog('Le prix du brut monte à 95 $.','ev'); return { well, dry }; });
  ok(ids.well!==null,'un puits productif existe pour le test');
  await pg.evaluate(()=>{ document.getElementById('alertModal')?.classList.remove('open'); switchTab('log'); }); await pg.waitForTimeout(200);
  const n = await pg.evaluate(()=>({ clickable:document.querySelectorAll('#logEntries .log-entry.clickable').length, withBid:document.querySelectorAll('#logEntries .log-entry[data-bid]').length }));
  ok(n.clickable>=3 && n.withBid>=2,'les entrées du journal sont cliquables, celles d\'un bloc portent son identifiant '+JSON.stringify(n));
  // clic sur l'événement du puits productif
  await pg.locator('#logEntries .log-entry', { hasText:'Puits productif' }).first().click(); await pg.waitForTimeout(200);
  const d1 = await pg.evaluate(()=>({ open:document.getElementById('logDetailModal')?.classList.contains('open'), t:document.getElementById('logDetailModal')?.innerText||'' }));
  ok(d1.open && /Détail de l'événement/.test(d1.t) && /Puits productif/.test(d1.t),'clic : la fenêtre de détail s\'ouvre avec le message');
  ok(/Rapport de forage/i.test(d1.t) && /réussite/.test(d1.t) && /Puits producteur/.test(d1.t),'événement d\'un puits : rapport de forage et état du puits');
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(100);
  ok(await pg.evaluate(()=>!document.getElementById('logDetailModal').classList.contains('open')),'Échap ferme le détail');
  // événement d'un puits sec
  if(ids.dry!==null){ await pg.locator('#logEntries .log-entry', { hasText:'infructueux' }).first().click(); await pg.waitForTimeout(150);
    const d2 = await pg.evaluate(()=>document.getElementById('logDetailModal').innerText); ok(/puits sec/i.test(d2) && /Rapport de forage/i.test(d2),'événement d\'un puits sec : rapport avec le facteur limitant'); await pg.keyboard.press('Escape'); }
  // événement sans bloc
  await pg.locator('#logEntries .log-entry', { hasText:'prix du brut' }).first().click(); await pg.waitForTimeout(150);
  ok(await pg.evaluate(()=>/ne concerne pas un bloc précis/.test(document.getElementById('logDetailModal').innerText) && !/Rapport de forage/i.test(document.getElementById('logDetailModal').innerText)),'événement sans bloc : description seule');
  await pg.keyboard.press('Escape');
  // bouton « Voir le bloc » : sélectionne le bloc
  await pg.locator('#logEntries .log-entry', { hasText:'Puits productif' }).first().click(); await pg.waitForTimeout(100);
  await pg.locator('#logDetailModal button', { hasText:'Voir le bloc' }).click(); await pg.waitForTimeout(200);
  ok(await pg.evaluate(id=>selectedBlock===id && !document.getElementById('logDetailModal').classList.contains('open'),ids.well),'« Voir le bloc » sélectionne le bloc et ferme le détail');
  // clavier : Entrée ouvre
  await pg.evaluate(()=>switchTab('log')); await pg.locator('#logEntries .log-entry').first().focus(); await pg.keyboard.press('Enter'); await pg.waitForTimeout(100);
  ok(await pg.evaluate(()=>document.getElementById('logDetailModal').classList.contains('open')),'Entrée sur une entrée focalisée ouvre le détail');
  // un clic hors de la boîte ferme
  await pg.mouse.click(5,5); await pg.waitForTimeout(100);
  ok(await pg.evaluate(()=>!document.getElementById('logDetailModal').classList.contains('open')),'clic à côté de la fenêtre : fermeture');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
