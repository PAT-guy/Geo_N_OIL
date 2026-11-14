// Récap de fin : calibration des estimations par tranche (verdict optimiste, prudent ou calibré), marché subi et bilan de l'informateur.
const { chromium, devices } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const ctx = await br.newContext({...devices['iPhone 13']}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const T = await pg.evaluate(async ()=>{
    const o={}; document.getElementById('geoSeed').value='55'; menuConfig.daily=null; labOptLaunch(); await new Promise(r=>setTimeout(r,900));
    const stats = () => { G.budget=30e6; try{ showEnd('quit'); }catch(e){} return document.getElementById('endStats').textContent; };
    // vide : aucun bloc de calibration ni de marché
    G.calib=null; G.calibLog=[]; G.eventLog=[]; G.informant=null; let t = stats(); o.empty = !/Calibration de vos estimations/.test(t) && !/Marché :/.test(t);
    // trop optimiste : 6 annonces à 80 % dont 2 réussies
    G.calib={n:0,net:0}; G.calibLog=[]; G.mode='junior'; const b=blocks[0]; [1,1,0,0,0,0].forEach(ok=>applyCalibration({p:0.8,bucket:null}, !!ok, null, b)); t = stats();
    o.opt = /Calibration de vos estimations \(6/.test(t) && /60 % et plus/.test(t) && /trop optimiste/.test(t) && /80 %/.test(t) && /33 %/.test(t);
    // trop prudent
    G.calib={n:0,net:0}; G.calibLog=[]; [1,1,1,1,1,0].forEach(ok=>applyCalibration({p:0.2,bucket:null}, !!ok, null, b)); t = stats(); o.prud = /trop prudent/.test(t) && /moins de 30 %/.test(t);
    // bien calibré
    G.calib={n:0,net:0}; G.calibLog=[]; [1,1,1,0,1,0].forEach(ok=>applyCalibration({p:0.6,bucket:null}, !!ok, null, b)); t = stats(); o.ok = /Bien calibré/.test(t);
    // peu d'estimations
    G.calib={n:0,net:0}; G.calibLog=[]; applyCalibration({p:0.6,bucket:null}, true, null, b); t = stats(); o.few = /Trop peu d'estimations/.test(t);
    // marché et informateur
    G.eventLog=[{month:12,kind:'embargo',size:10,alerted:true},{month:30,kind:'storm',dur:3,alerted:false},{month:44,kind:'shock',size:-14,alerted:true}]; G.informant={briefs:[],hits:1,total:2,subUntil:0,fakes:[{at:3}],alertHits:2,alertTotal:3,notes:[],spent:160e3};
    t = stats(); o.mkt = /3 événements subis/.test(t) && /embargo au mois 12 ✓ annoncé/.test(t) && /tempête sur les plateformes au mois 30/.test(t) && /2 événements sur 3 annoncés à l'avance/.test(t) && /1 fausse alerte/.test(t) && /160/.test(t);
    // largeur
    o.noOverflow = document.documentElement.scrollWidth <= window.innerWidth + 1; o.oldCalib = !/Calibration \(\d+ estimation/.test(t);
    return o; });
  ok(T.empty, 'sans estimation ni événement, le récap n\'ajoute rien');
  ok(T.opt, 'annonces trop optimistes : tranche, moyenne annoncée 80 % et réussite réelle 33 % affichées, verdict « trop optimiste »');
  ok(T.prud, 'annonces trop prudentes : verdict « trop prudent »');
  ok(T.ok, 'annonces calibrées : verdict « bien calibré »');
  ok(T.few, 'moins de 4 estimations : « trop peu pour juger »');
  ok(T.mkt, 'le marché subi et le bilan de l\'informateur sont chiffrés (événements, annoncés à l\'avance, fausses alertes, dépense)');
  ok(T.noOverflow && T.oldCalib, 'pas de débordement sur téléphone, l\'ancienne ligne « Calibration » peu lisible a disparu');
  ok(errs.length===0, 'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko? 'ECHECS: '+ko : 'TOUT OK'); process.exit(ko?1:0); })();
