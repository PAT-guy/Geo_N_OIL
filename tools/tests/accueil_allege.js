// Accueil allégé (V5.20) : un seul bouton Mini-jeux ouvre la liste, Mode TP est proposé (le Bac à sable reste dans l'accueil complet), Personnaliser, Accueil simple et Défi du jour sont de vrais boutons.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const ctx=await br.newContext({viewport:{width:440,height:900}}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const h = await pg.evaluate(()=>{ const vis=e=>!!e && e.getClientRects().length>0; const q=s=>document.querySelector(s); const bs=s=>{ const e=q(s); const r=e.getBoundingClientRect(); const cs=getComputedStyle(e); return { vis:vis(e), h:Math.round(r.height), border:cs.borderTopWidth!=='0px' && cs.borderTopStyle!=='none', underline:/underline/.test(cs.textDecorationLine) }; };
    return { train:vis(q('#quickTrain')), mini:bs('#quickMiniBtn'), custom:bs('#menuCustomBtn'), daily:bs('#dailyBtn'), modes:[...document.querySelectorAll('#quickModes .q-mode')].map(b=>b.dataset.mode), modal:getComputedStyle(q('#miniGamesModal')).display }; });
  ok(!h.train && h.modal==='none','la liste des mini-jeux n\'est plus affichée sur l\'accueil');
  ok(h.mini.vis && h.mini.h>=40 && h.mini.border && !h.mini.underline,'bouton Mini-jeux : bouton plein, 40 px au moins '+JSON.stringify(h.mini));
  const mb = await pg.evaluate(()=>{ const b=document.getElementById('quickMiniBtn'), cs=getComputedStyle(b), cu=getComputedStyle(document.getElementById('menuCustomBtn')); return { text:b.textContent, chip:document.getElementById('quickMiniCount').textContent, border:parseFloat(cs.borderTopWidth), borderCu:parseFloat(cu.borderTopWidth), bg:cs.backgroundColor, bgCu:cu.backgroundColor, h:Math.round(b.getBoundingClientRect().height) }; });
  ok(/Mini-jeux/.test(mb.text) && /quiz/i.test(mb.text) && /logs/i.test(mb.text) && /console/i.test(mb.text),'Mini-jeux : le bouton dit ce qu\'il contient (quiz, logs, sismique, console) '+mb.text.replace(/\s+/g,' ').slice(0,90));
  ok(mb.chip==='12 jeux','Mini-jeux : pastille avec le nombre de jeux '+mb.chip);
  ok(mb.border>=2 && mb.border>mb.borderCu && mb.bg!==mb.bgCu && mb.h>=56,'Mini-jeux : bouton mis en avant (bordure plus épaisse et fond d\'accent, plus haut que les autres)');
  ok(h.custom.vis && h.custom.h>=40 && h.custom.border && !h.custom.underline,'« Personnaliser la partie » : bouton propre '+JSON.stringify(h.custom));
  ok(h.daily.vis && h.daily.h>=40 && h.daily.border && !h.daily.underline,'« Défi du jour » : bouton propre '+JSON.stringify(h.daily));
  ok(h.modes.includes("tp") && !h.modes.includes("sandbox") && h.modes.length===6,'Mode TP proposé, Bac à sable retiré de l\'affichage central '+h.modes);
  // la liste s'ouvre, un jeu s'ouvre et ferme la liste
  await pg.click('#quickMiniBtn'); await pg.waitForTimeout(200);
  ok(await pg.evaluate(()=>getComputedStyle(document.getElementById('miniGamesModal')).display!=='none' && document.querySelectorAll('#miniGamesModal #quickTrain button').length===12),'Mini-jeux : la liste des 12 jeux s\'ouvre');
  await pg.click('#quickTrain button[data-quiz="fluides"]'); await pg.waitForTimeout(300);
  ok(await pg.evaluate(()=>document.getElementById('quizModal').classList.contains('open') && getComputedStyle(document.getElementById('miniGamesModal')).display==='none'),'un jeu choisi s\'ouvre et la liste se ferme');
  await pg.evaluate(()=>document.getElementById('quizModal').classList.remove('open'));
  await pg.click('#quickMiniBtn'); await pg.keyboard.press('Escape'); await pg.waitForTimeout(100);
  ok(await pg.evaluate(()=>getComputedStyle(document.getElementById('miniGamesModal')).display==='none'),'Échap ferme la liste');
  // modes : TP et Bac à sable se sélectionnent comme les autres
  await pg.click('#quickModes .q-mode[data-mode="tp"]'); ok(await pg.evaluate(()=>menuConfig.mode==='tp' && document.querySelector('#quickModes .q-mode[data-mode="tp"]').classList.contains('sel')),'Mode TP sélectionnable depuis l\'accueil');
  ok(await pg.evaluate(()=>!document.querySelector('#quickModes .q-mode[data-mode="sandbox"]') && !!document.querySelector('.mode-card[data-mode="sandbox"]')),'Bac à sable absent de l\'accueil simple, toujours proposé dans l\'accueil complet (Personnaliser la partie)');
  // accueil complet : « Accueil simple » est un bouton propre
  await pg.click('#menuCustomBtn'); await pg.waitForTimeout(200);
  const back = await pg.evaluate(()=>{ const e=document.getElementById('menuSimpleBtn'), r=e.getBoundingClientRect(), cs=getComputedStyle(e); return { vis:e.getClientRects().length>0, h:Math.round(r.height), border:cs.borderTopWidth!=='0px', underline:/underline/.test(cs.textDecorationLine) }; });
  ok(back.vis && back.h>=40 && back.border && !back.underline,'« Accueil simple » : bouton propre '+JSON.stringify(back));
  await pg.click('#menuSimpleBtn'); await pg.waitForTimeout(100);
  ok(await pg.evaluate(()=>document.getElementById('menu').classList.contains('simple')),'retour à l\'accueil simple');
  ok(await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'pas de débordement horizontal');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
