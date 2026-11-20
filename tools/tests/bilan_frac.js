// Bilan de fin de partie (V5.47) : un puits fracturé est jugé sur sa roche-mère, pas sur les quatre facteurs d'un piège conventionnel ; la synthèse ne range plus les frac sèches sous « Piège structural ».
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1100,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const r = await pg.evaluate(async()=>{ const o={}; document.getElementById('geoSeed').value='59868'; menuConfig.mode='junior'; menuConfig.basinType='permian'; menuConfig.seed='59868'; labOptLaunch(); await new Promise(r=>setTimeout(r,700)); setSpeed(0);
    const strip=h=>h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
    const bs=blocks.filter(b=>!b.isOffshore&&!b.inSalt).slice(0,3), [b1,b2,b3]=bs;
    const sh=b=>shaleTrue(b);
    // deux frac sèches (TOC trop faible) et une frac réussie
    [b1,b2].forEach(b=>{ b.dryHole=true; b.well=null; b.fracInfo={ ...sh(b), toc:1.2, why:'toc', lat:2000, ip:0 }; b.dryHoleInfo={ method:'frac', cost:7e6, techFail:false, studyLevelAtDrill:2, month:10, factors:{'piège':0.39,'réservoir':0.8,'couverture':0.7,'charge':0.9} }; });
    b3.well={ blockId:b3.id, method:'frac', cost:8e6, production:900, factors:{'piège':0.2,'réservoir':0.6,'couverture':0.5,'charge':0.5}, status:'producing', month:20 }; b3.fracInfo={ ...sh(b3), ip:900, lat:2000 }; G.wells=[b3.well];
    o.dry=strip(debriefEntry(b1, b1.dryHoleInfo, false)); o.good=strip(debriefEntry(b3, b3.well, true));
    buildDebriefReport(); o.report=strip(document.getElementById('endDebrief').innerHTML);
    return o; });
  ok(/puits sec par fracturation/.test(r.dry) && /roche-mère trop pauvre/.test(r.dry) && !/Facteur limitant|Piège structural/.test(r.dry),'frac sèche : cause = roche-mère, plus de « Facteur limitant : Piège structural » '+r.dry.slice(0,160));
  ok(/réussite par fracturation/.test(r.good) && !/facteur le plus solide/.test(r.good) && /ne comptent pas pour une frac/.test(r.good),'frac réussie : jugée sur la roche-mère, avec la mention que le piège ne compte pas');
  ok(/Synthèse de la fracturation/.test(r.report) && /2 frac\(s\) sèche\(s\)/.test(r.report) && /roche-mère trop pauvre/.test(r.report),'synthèse de la fracturation : 2 frac sèches, cause TOC');
  ok(!/même facteur limitant : Piège structural/.test(r.report),'la synthèse conventionnelle ne compte plus les frac');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
