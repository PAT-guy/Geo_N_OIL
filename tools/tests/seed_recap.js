// Seed apparente : toujours connue (tirée à 5 chiffres si le joueur n'en saisit pas), affichée au journal et au récap de fin ; la même seed redonne la même carte.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const T = await pg.evaluate(async ()=>{
    const hash = () => blocks.map(b=>[b.id,+b.trueQuality.toFixed(5),Math.round(b.topOfReservoir),+b.trueProbability.toFixed(5)].join(',')).join(';').split('').reduce((a,c)=>(a*31+c.charCodeAt(0))|0,0);
    const o={};
    // sans seed saisie
    menuConfig.seed = null; document.getElementById('geoSeed').value=''; menuConfig.daily=null; labOptLaunch(); await new Promise(r=>setTimeout(r,800));
    o.auto = G.seedShown; const h1 = hash(), cfg = {gs:menuConfig.gridSize, bt:menuConfig.basinType, off:menuConfig.offshore};
    o.log = /Seed géologique : \d{5}/.test(document.getElementById('logEntries').textContent);
    G.budget = 50e6; try { showEnd('quit'); } catch(e){}
    o.end = document.getElementById('endStats').textContent.includes(G.seedShown) && /Seed de la carte/.test(document.getElementById('endStats').textContent);
    // même seed = même carte
    document.getElementById('geoSeed').value = G.seedShown; labOptLaunch(); await new Promise(r=>setTimeout(r,800)); o.replay = hash()===h1 && G.seedShown===o.auto;
    // seed saisie (texte)
    document.getElementById('geoSeed').value = 'ma-carte'; labOptLaunch(); await new Promise(r=>setTimeout(r,800)); o.typed = G.seedShown==='ma-carte';
    return o; });
  ok(/^\d{5}$/.test(T.auto), 'une seed à 5 chiffres est tirée quand le joueur n\'en saisit pas : '+T.auto);
  ok(T.log, 'la seed est écrite au journal de départ');
  ok(T.end, 'le récap de fin affiche la seed de la carte');
  ok(T.replay, 'relancer avec cette seed redonne exactement la même carte');
  ok(T.typed, 'une seed saisie (texte) est conservée telle quelle');
  ok(errs.length===0, 'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko? 'ECHECS: '+ko : 'TOUT OK'); process.exit(ko?1:0); })();
