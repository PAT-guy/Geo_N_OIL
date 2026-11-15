// Même seed, même séquence d'actions : mêmes résultats de forage, même marché (prix et événements), mêmes accidents ; une autre seed donne autre chose.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const run = async (seed) => { const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
    await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(400);
    const r = await pg.evaluate(async (sd)=>{ document.getElementById('geoSeed').value=sd; menuConfig.daily=null; menuConfig.financeMode=true; labOptLaunch(); await new Promise(r=>setTimeout(r,900));
      G.budget=500e6; const prices=[]; const out=[];
      const picks = blocks.filter(b=>!b.inSalt && b.topOfReservoir<3500).slice(0,8);
      picks.forEach(b=>{ b.studyLevel=3; try{ drillBlock(b.id,'vertical','standard',null); }catch(e){} });
      for(let i=0;i<80;i++){ monthTick(); prices.push(Math.round(G.price*100)); }
      picks.forEach(b=>out.push(b.well?'W':b.dryHole?'D':'-'));
      return { out:out.join(''), prices:prices.join(','), ev:JSON.stringify((G.eventLog||[]).map(e=>e.month+e.kind)), acc:G.log ? G.log.length : 0 }; }, seed);
    await pg.close(); return { r, errs }; };
  const A = await run('4242'), B = await run('4242'), C = await run('777');
  ok(A.r.out===B.r.out && A.r.out.length===8, 'résultats de forage identiques sur une même seed ('+A.r.out+')');
  ok(A.r.prices===B.r.prices, 'prix du brut identiques sur 80 mois');
  ok(A.r.ev===B.r.ev, 'événements de marché identiques '+A.r.ev.slice(0,60));
  ok(A.r.prices!==C.r.prices, 'une autre seed donne un autre marché');
  ok(A.errs.length+B.errs.length+C.errs.length===0, 'aucune erreur JS '+A.errs.concat(B.errs).join('|'));
  await br.close(); console.log(ko? 'ECHECS: '+ko : 'TOUT OK'); process.exit(ko?1:0); })();
