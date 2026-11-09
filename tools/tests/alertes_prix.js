// Prix de base 80 $ et alertes de prix : création par l'interface, déclenchement au franchissement, pause, répétition, sauvegarde
const { chromium } = require('playwright');
const path = require('path');
(async()=>{ const br=await chromium.launch(); const pg=await br.newPage({viewport:{width:1400,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_menu','full')}catch(e){}});
await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(300);
await pg.click('.menu-tab[data-tab="world"]'); await pg.click('#basinPicker button[data-val="paris"]'); await pg.fill('#geoSeed','2024'); await pg.click('#startBtn'); await pg.click('#labOptGo'); await pg.waitForTimeout(500);
const out={};
out.depart = await pg.evaluate(()=>({ prix:G.price, histo:G.priceHistory.slice(), hud:document.getElementById('hudPrice').textContent, alertes:G.priceAlerts.length }));
// création par l'interface
await pg.evaluate(()=>setSpeed(0));
await pg.click('#btnPriceAlert'); await pg.waitForTimeout(100);
out.modalOuverte = await pg.evaluate(()=>document.getElementById('priceAlertModal').classList.contains('open'));
await pg.click('#priceAlertModal button:has-text("sous")'); await pg.fill('#paValue','70'); await pg.check('#paRepeat'); await pg.click('#priceAlertModal button:has-text("Ajouter l\'alerte")');
await pg.click('#priceAlertModal button:has-text("au-dessus de")'); await pg.fill('#paValue','95'); await pg.click('#priceAlertModal button:has-text("Ajouter l\'alerte")');
out.liste = await pg.evaluate(()=>({ n:G.priceAlerts.length, alertes:G.priceAlerts.map(a=>a.dir+' '+a.value+(a.pause?' pause':'')+(a.repeat?' répétée':'')), compteur:document.getElementById('priceAlertCount').textContent }));
await pg.screenshot({path:'alertes_prix.png'});
await pg.click('#priceAlertModal button:has-text("Fermer")');
// déclenchements
out.declenchement = await pg.evaluate(()=>{ setSpeed(1); const r={};
  G.price=72; priceAlertCheck(72, 69.5); r.vitesse=G.speed; r.apresSous70=G.priceAlerts.map(a=>a.dir+' '+a.value+(a.repeat?' répétée':''));   // « sous 70 » répétée reste, pause activée par défaut
  priceAlertCheck(69.5, 68); r.sansNouveauFranchissement=G.priceAlerts.length;                                                     // déjà sous le seuil : pas de re-déclenchement
  setSpeed(1); priceAlertCheck(93, 96); r.vitesse2=G.speed; r.apresAu95=G.priceAlerts.map(a=>a.dir+' '+a.value);                // « au-dessus de 95 » non répétée disparaît
  priceAlertCheck(68, 71); priceAlertCheck(71, 69); r.repetee=G.speed; return r; });
// sauvegarde / chargement
out.sauvegarde = await pg.evaluate(()=>{ G.priceAlerts.push({dir:'above',value:110,pause:false,repeat:true}); saveGame(); G.priceAlerts=[]; loadGame(); return { n:G.priceAlerts.length, compteur:document.getElementById('priceAlertCount').textContent }; });
// la courbe se dessine avec les traits d'alerte ; 300 mois de prix sans erreur
out.courbe = await pg.evaluate(()=>{ for(let i=0;i<300;i++) stepPrice(); drawSparkline(); return { prix:+G.price.toFixed(1), histo:G.priceHistory.length }; });
console.log(JSON.stringify(out,null,1)); console.log('erreurs',errs); await br.close(); })();
