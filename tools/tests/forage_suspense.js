// Suspense des forages : le résultat n'apparaît ni sur la carte, ni au journal, ni au compteur avant la révélation ; plusieurs forages à la suite donnent un tableau récapitulatif ; « Tout voir d'un coup » le montre directement.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1280,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(400);
  const A = await pg.evaluate(async ()=>{ document.getElementById('geoSeed').value='4242'; menuConfig.daily=null; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); setSpeed(0);
    G.budget=500e6; const picks = blocks.filter(b=>!b.inSalt).slice(0,3); const o={};
    const b = picks[0]; b.studyLevel=3; const wells0 = document.getElementById('hudWells').textContent; const logs0 = document.getElementById('logEntries').children.length;
    resolveDrilling({blockId:b.id, method:'vertical', equip:'standard', depth:1500, cost:2e6, cf:1, startMonth:0, endMonth:0});
    o.pending = b.revealPending===true; o.cls = b.el.className; o.noWellIcon = !/has-well|dry-hole/.test(b.el.className);
    o.logHeld = document.getElementById('logEntries').children.length===logs0; o.hudSame = document.getElementById('hudWells').textContent===wells0;
    return o; });
  await pg.waitForTimeout(2000);
  const B = await pg.evaluate(()=>{ const b=blocks.filter(b=>!b.inSalt)[0]; return { shown: /has-well|dry-hole/.test(b.el.className), pending:b.revealPending, logs: document.getElementById('logEntries').children.length>0, modal: document.getElementById('drillRevealModal').classList.contains('open'), close: getComputedStyle(document.getElementById('drillRevealCloseBtn')).display!=='none' }; });
  ok(A.pending && A.noWellIcon && A.logHeld && A.hudSame, 'avant la révélation : icône, journal et compteur ne montrent pas le résultat '+JSON.stringify(A));
  ok(B.shown && !B.pending && B.logs && B.modal && B.close, 'après le suspense : résultat visible sur la carte et au journal '+JSON.stringify(B));
  await pg.click('#drillRevealCloseBtn'); await pg.waitForTimeout(150);
  // trois forages en file
  const C = await pg.evaluate(()=>{ const ps=blocks.filter(b=>!b.inSalt && !b.well && !b.dryHole).slice(0,3); ps.forEach(b=>{ b.studyLevel=3; resolveDrilling({blockId:b.id, method:'vertical', equip:'standard', depth:1500, cost:2e6, cf:1, startMonth:0, endMonth:0}); }); return { skipShown: getComputedStyle(document.getElementById('drillRevealSkipBtn')).display!=='none', pend: ps.every(b=>b.revealPending) }; });
  ok(C.pend && C.skipShown, 'trois forages en file : résultats masqués, bouton « Tout voir d\'un coup » proposé '+JSON.stringify(C));
  await pg.click('#drillRevealSkipBtn'); await pg.waitForTimeout(200);
  const D = await pg.evaluate(()=>({ rows: document.querySelectorAll('.dr-recap tbody tr').length, title: document.getElementById('drillRevealTitle').textContent, allShown: blocks.filter(b=>b.well||b.dryHole).every(b=>!b.revealPending) }));
  ok(D.rows===3 && /Récapitulatif/.test(D.title) && D.allShown, 'tableau récapitulatif de 3 forages '+JSON.stringify(D));
  await pg.click('#drillRevealCloseBtn'); await pg.waitForTimeout(100);
  const E = await pg.evaluate(()=>!document.getElementById('drillRevealModal').classList.contains('open'));
  ok(E, 'le récapitulatif se ferme');
  // deux forages vus un par un : tableau à la fin
  const F = await pg.evaluate(()=>{ const ps=blocks.filter(b=>!b.inSalt && !b.well && !b.dryHole).slice(0,2); ps.forEach(b=>{ b.studyLevel=3; resolveDrilling({blockId:b.id, method:'vertical', equip:'standard', depth:1500, cost:2e6, cf:1, startMonth:0, endMonth:0}); }); return true; });
  await pg.waitForTimeout(1900); await pg.click('#drillRevealCloseBtn'); await pg.waitForTimeout(1900); await pg.click('#drillRevealCloseBtn'); await pg.waitForTimeout(150);
  const G2 = await pg.evaluate(()=>({ rows: document.querySelectorAll('.dr-recap tbody tr').length, open: document.getElementById('drillRevealModal').classList.contains('open') }));
  ok(G2.rows===2 && G2.open, 'deux forages vus un par un : tableau récapitulatif à la fin '+JSON.stringify(G2));
  ok(errs.length===0, 'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko? 'ECHECS: '+ko : 'TOUT OK'); process.exit(ko?1:0); })();
