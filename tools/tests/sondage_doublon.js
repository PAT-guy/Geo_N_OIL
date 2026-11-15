// Pas deux sondages au même endroit, ni un forage sur un bloc en cours de forage ; une coupe a besoin de deux blocs différents.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1280,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(400);
  const T = await pg.evaluate(async ()=>{ const o={}; document.getElementById('geoSeed').value='4242'; menuConfig.daily=null; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); setSpeed(0);
    G.budget=90e6; G.month=1; performStudy(null,'gravity'); const b=blocks.find(x=>!x.inSalt && x.topOfReservoir<2200); b.studyLevel=1;
    const b0=G.budget; launchStrati(b.id); const afterFirst=G.budget; o.first = G.drilling.filter(d=>d.blockId===b.id).length===1;
    launchStrati(b.id); o.noSecondInProgress = G.drilling.filter(d=>d.blockId===b.id).length===1 && G.budget===afterFirst;
    const pl = drillPlan(b,'vertical'); G.labPick = null; drillBlock(b.id,'vertical',pl.equip,null); o.noVerticalDuring = G.drilling.filter(d=>d.blockId===b.id).length===1 && G.budget===afterFirst;
    for(let i=0;i<30&&G.drilling.some(d=>d.blockId===b.id);i++) monthTick(); [drillRevealCur,...drillRevealQueue].forEach(drillRevealFlush);
    const afterDone=G.budget; launchStrati(b.id); o.noSecondDone = G.budget===afterDone && G.drilling.filter(d=>d.blockId===b.id).length===0;
    // coupe : B ne peut pas être A
    G.sectionA=null; G.sectionB=null; setTool('section'); onBlockClick(b.id); onBlockClick(b.id); o.stillOpen = G.sectionA===b.id && G.sectionB===null;
    G.sectionA=b.id; G.sectionB=b.id; const bs=G.budget; performStudy(null,'seismic2d'); o.noSingle2d = G.budget===bs;
    return o; });
  ok(T.first && T.noSecondInProgress, 'un second sondage est refusé pendant le premier '+JSON.stringify(T));
  ok(T.noVerticalDuring, 'un forage vertical est refusé pendant un sondage sur le même bloc');
  ok(T.noSecondDone, 'un second sondage est refusé une fois le premier terminé');
  ok(T.stillOpen, 'cliquer A deux fois ne ferme pas la coupe sur un seul bloc');
  ok(T.noSingle2d, 'une sismique 2D n\'est pas lancée avec A = B');
  ok(errs.length===0, 'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko? 'ECHECS: '+ko : 'TOUT OK'); process.exit(ko?1:0); })();
