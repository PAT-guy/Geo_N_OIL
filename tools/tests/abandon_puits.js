// Abandon des puits : coût payé une seule fois à la fermeture ou à l'épuisement, 12 % à terre / 18 % en mer, gratuit en bac à sable,
// non rétroactif pour les puits déjà fermés, passif affiché au bilan et dans le panneau du puits.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const T = await pg.evaluate(async ()=>{
    const o = {}; document.getElementById('dailyBtn').click(); labOptLaunch(); await new Promise(r=>setTimeout(r,800));
    const mk = (i, over) => { const b = blocks[i]; const w = Object.assign({blockId:b.id, cost:5e6, offshore:false, production:1000, comps:[{q0:1000,t0:0}], monthsActive:0, status:'producing', isGas:false, eorActive:false, eorMonthsLeft:0}, over||{}); G.wells.push(w); b.well = w; return w; };
    G.mode = 'junior'; G.financeMode = false;
    const w1 = mk(0), w2 = mk(1, {offshore:true, cost:10e6}), w3 = mk(2, {comps:[{q0:1,t0:0}], production:1});
    o.cost = [abandonCost(w1), abandonCost(w2)];
    o.liab = abandonLiability();
    const b0 = G.budget; closeWell(0); const d1 = b0 - G.budget; closeWell(0); const d1b = b0 - G.budget;
    o.once = d1===600000 && d1b===d1 && w1.status==='closed' && w1.abandonPaid===true;
    // épuisement
    const b1 = G.budget; w3.monthsActive = 400; monthTick(); o.depl = w3.status==='depleted' && w3.abandonPaid && (b1 - G.budget) >= 600000 - 1e5 ;
    // puits déjà fermé avant la mise à jour : pas de passif rétroactif
    const old = mk(3, {status:'closed'}); o.noRetro = abandonLiability() === abandonCost(w2);
    // panneau du puits et confirmation
    const bl = blocks[1]; renderStudiesPanel(bl); o.panel = /abandon : /.test(document.getElementById('studiesPanel')?.innerHTML || document.body.innerHTML);
    // bilan
    try { showEnd('quit'); } catch(e){ /* le bilan détaillé exige des puits complets (facteurs), inutile ici : seules les statistiques comptent */ } o.end = /Abandon des puits encore actifs/.test(document.getElementById('endStats').textContent);
    // bac à sable
    G.mode = 'sandbox'; o.sand = abandonCost(w2) === 0; G.mode = 'junior';
    return o; });
  ok(T.cost[0]===600000 && T.cost[1]===1800000, 'coût d\'abandon : 12 % à terre, 18 % en mer '+JSON.stringify(T.cost));
  ok(T.once, 'la fermeture facture une seule fois, y compris si on la relance');
  ok(T.depl, 'l\'épuisement d\'un puits facture aussi l\'abandon');
  ok(T.noRetro, 'un puits déjà fermé ne crée pas de passif rétroactif');
  ok(T.panel, 'le bouton de fermeture affiche le coût d\'abandon');
  ok(T.end, 'le bilan affiche l\'abandon des puits encore actifs');
  ok(T.sand, 'aucun coût d\'abandon en bac à sable');
  ok(errs.length===0, 'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko? 'ECHECS: '+ko : 'TOUT OK'); process.exit(ko?1:0); })();
