// Quiz Maturation et Rock-Eval générés par le moteur géologique : chaque question doit avoir une réponse défendable,
// les classes doivent être équilibrées, une manche mélange questions générées et questions fixes, la partie en cours n'est pas touchée.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(400);
  // une vraie partie est lancée : on vérifie qu'elle n'est pas modifiée par la génération des quiz
  await pg.click('#startBtn'); await pg.click('#labOptGo'); await pg.waitForTimeout(500);
  const empreinte = ()=>JSON.stringify({ n: blocks.length, q: blocks.map(b=>[b.id,b.trueQuality,b.maturityClass,b.topOfReservoir,b.horizons.length]), s: STRAT.length, g: GS ? Object.keys(GS).length : 0, lv: buildStratigraphy.lastVariant });
  await pg.evaluate(`window.__avant = (${empreinte.toString()})()`);
  const r = await pg.evaluate(()=>{ const t0=performance.now(); const out={mat:[],rock:[],manches:[]};
    for(let i=0;i<40;i++){ out.mat.push(...window.__qz.qzGenMaturation(6)); out.rock.push(...window.__qz.qzGenRockeval()); }
    out.ms=(performance.now()-t0)/80;
    for(let i=0;i<20;i++){ ['maturation','rockeval'].forEach(k=>{ const m=window.__qz.qzBuildRound(window.__qz.QUIZ_BANKS[k]); out.manches.push({k, n:m.length, gen:m.filter(q=>q.gen).length}); }); }
    return out; });
  const apres = await pg.evaluate(`(${empreinte.toString()})()`); const avant = await pg.evaluate(()=>window.__avant);
  const valid = q => q.q && Array.isArray(q.choices) && q.choices.length>=2 && Number.isInteger(q.correct) && q.correct>=0 && q.correct<q.choices.length && q.explain;
  ok(r.mat.length===240, 'maturation : 6 questions générées par manche ('+r.mat.length+'/240)'); ok(r.rock.length===200, 'rock-eval : 5 questions générées par manche ('+r.rock.length+'/200)');
  ok(r.mat.every(valid) && r.rock.every(valid), 'toutes les questions générées sont bien formées');
  // maturation : la réponse doit se retrouver par le calcul affiché
  let faux=0, marge=0; const cnt=[0,0,0]; r.mat.forEach(q=>{ const m=/à (\d+) m, gradient géothermique ([\d,]+) °C\/km, exhumation ×([\d,]+)/.exec(q.q); const top=+m[1], g=+m[2].replace(',','.'), e=+m[3].replace(',','.'); const T=14+top*e*g/1000; const cls=T<60?0:T<=150?1:2; if(cls!==q.correct) faux++; if(Math.abs(T-60)<8||Math.abs(T-150)<8) marge++; cnt[q.correct]++; });
  ok(faux===0, 'maturation : le calcul affiché donne toujours la bonne classe ('+faux+' erreurs)'); ok(marge===0, 'maturation : aucune question à moins de 8 °C d\'un seuil');
  ok(Math.max(...cnt)-Math.min(...cnt)<=2, 'maturation : classes équilibrées '+JSON.stringify(cnt));
  // rock-eval : Tmax et S2 recalculables
  let fauxR=0, tm=0, s2=0; r.rock.forEach(q=>{ let m=/Tmax = (\d+) °C/.exec(q.q); if(m){ tm++; const t=+m[1], c=t<435?0:t<=455?1:2; if(c!==q.correct||(t>430&&t<435)||(t>455&&t<460)) fauxR++; } else { s2++; const mm=/A : TOC = ([\d,]+) %, HI = (\d+).*B : TOC = ([\d,]+) %, HI = (\d+)/.exec(q.q); const sa=+mm[1].replace(',','.')*mm[2]/100, sb=+mm[3].replace(',','.')*mm[4]/100; const c=sa>sb?0:1; if(c!==q.correct || Math.max(sa,sb)/Math.min(sa,sb)<1.3) fauxR++; } });
  ok(fauxR===0 && tm===120 && s2===80, 'rock-eval : Tmax et S2 recalculés = bonne réponse, marges respectées ('+tm+' Tmax, '+s2+' S2, '+fauxR+' erreurs)');
  ok(r.manches.every(m=>m.n===8) && r.manches.filter(m=>m.k==='maturation').every(m=>m.gen===6) && r.manches.filter(m=>m.k==='rockeval').every(m=>m.gen===5), 'manche de 8 questions : 6 (maturation) ou 5 (rock-eval) générées + le reste tiré de la liste fixe');
  ok(apres===avant && avant.length>500, 'la partie en cours (cartes, strates) n\'est pas modifiée par la génération des quiz ('+avant.length+' octets comparés)');
  ok(r.ms<120, 'génération rapide : '+Math.round(r.ms)+' ms par manche');
  // les autres quiz restent des listes fixes
  const fixes = await pg.evaluate(()=>['lithofacies','seismic'].map(k=>window.__qz.qzBuildRound(window.__qz.QUIZ_BANKS[k]).length)); ok(fixes.every(n=>n===8), 'lithofaciès et sismique : manches de 8 questions fixes');
  console.log('erreurs JS', errs); console.log(ko?'ECHECS: '+ko:'TOUT OK'); await br.close(); process.exit(ko||errs.length?1:0); })();
