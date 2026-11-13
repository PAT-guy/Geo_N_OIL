// Défi du jour : mêmes réglages et même carte pour une date, record du jour mémorisé, retour aux réglages du joueur, pas de défi si les réglages sont modifiés.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const T = await pg.evaluate(async ()=>{
    const o = {}; const hash = () => blocks.map(b=>[b.id,+b.trueQuality.toFixed(5),Math.round(b.topOfReservoir)].join(',')).join(';').split('').reduce((a,c)=>(a*31+c.charCodeAt(0))|0,0);
    const c1 = dailyConfig(), c2 = dailyConfig(); o.det = JSON.stringify(c1)===JSON.stringify(c2) && c1.seed>=0 && c1.seed<99999 && DAILY_BASINS.includes(c1.basinType) && /^\d{4}-\d{2}-\d{2}$/.test(c1.date); o.cfg = c1;
    o.btn = document.getElementById('dailyLbl').textContent;
    // lancement du défi
    const hs = [];
    for(let i=0;i<2;i++){ document.getElementById('dailyBtn').click(); labOptLaunch(); await new Promise(r=>setTimeout(r,700)); hs.push([G.daily, G.gridSize, G.basinType, hash()]); }
    o.run = hs; o.same = hs[0][3]===hs[1][3] && hs[0][0]===c1.date && hs[0][1]===20 && hs[0][2]===c1.basinType;
    // record
    localStorage.removeItem('geoexplorer_daily'); G.budget = 80e6; showEnd('quit'); const t1 = document.getElementById('endStats').textContent; const st1 = JSON.parse(localStorage.getItem('geoexplorer_daily')||'{}')[c1.date];
    G.budget = 10e6; showEnd('quit'); const st2 = JSON.parse(localStorage.getItem('geoexplorer_daily')||'{}')[c1.date]; const t2 = document.getElementById('endStats').textContent;
    o.rec = /Défi du/.test(t1) && !!st1 && st2.nw===st1.nw && /meilleur du jour/.test(t2) && !/nouveau record/.test(t2);
    // retour aux réglages du joueur
    menuConfig.mode='expert'; menuConfig.gridSize=15; menuConfig.basinType='rift'; menuConfig.seed=null; document.getElementById('geoSeed').value='';
    document.getElementById('dailyBtn').click(); document.getElementById('labOptModal')?.remove();
    document.getElementById('startBtn').click();
    o.back = menuConfig.daily===null && menuConfig.mode==='expert' && menuConfig.gridSize===15 && menuConfig.basinType==='rift';
    // changement de réglages entre-temps : plus de défi
    document.getElementById('dailyBtn').click(); menuConfig.gridSize = 12; labOptLaunch(); await new Promise(r=>setTimeout(r,500)); o.mod = G.daily===null;
    return o; });
  ok(T.det, 'la configuration du jour est déterministe et valide '+JSON.stringify(T.cfg));
  ok(/Défi du jour/.test(T.btn), 'le bouton annonce le bassin du jour : '+T.btn);
  ok(T.same, 'deux lancements donnent exactement la même carte et les mêmes réglages '+JSON.stringify(T.run));
  ok(T.rec, 'le record du jour est mémorisé et un moins bon score ne l\'écrase pas');
  ok(T.back, 'un départ normal après le bouton du défi rend ses réglages au joueur');
  ok(T.mod, 'changer les réglages annule le défi');
  ok(errs.length===0, 'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko? 'ECHECS: '+ko : 'TOUT OK'); process.exit(ko?1:0); })();
