// Pièges de diagraphie du quiz Lithofaciès : trou éboulé, mud cake, porosité-densité faussée. Chaque question se recalcule depuis ses valeurs affichées et s'explique.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(400);
  const r = await pg.evaluate(()=>{ const all=[]; for(let i=0;i<40;i++) all.push(...window.__qz.qzGenLogTraps(2)); const kinds={}; const bad=[];
    all.forEach(x=>{ kinds[x.kind]=(kinds[x.kind]||0)+1; const m=x.meta;
      if(x.kind==='eboule' && !(m.cal>=12 && x.choices.length===4 && /8,5|8\.5/.test(x.q) && m.phiApp>m.phiTrue+10)) bad.push('eboule');
      if(x.kind==='cake' && !(m.cal<8.5 && x.choices.length===4)) bad.push('cake');
      if(x.kind==='poro' && !(m.phiApp-m.phiTrue>=12 && x.choices[0]==='≈ '+m.phiTrue+' %' && Math.abs(m.phiApp-Math.round((2.65-m.rho)/1.65*100))<=1)) bad.push('poro');
      if(x.correct!==0 || new Set(x.choices).size!==x.choices.length || x.explain.length<120) bad.push('forme '+x.kind); });
    const rounds=[]; for(let i=0;i<20;i++){ const q=window.__qz.qzBuildRound(window.__qz.QUIZ_BANKS.lithofacies); rounds.push([q.length, q.filter(x=>x.gen).length, q.filter(x=>x.kind==='eboule'||x.kind==='cake'||x.kind==='poro').length]); }
    return { n:all.length, kinds, bad, rounds }; });
  ok(r.n===80 && r.bad.length===0, 'pièges de log : 80 questions, chacune recalculable et expliquée ('+r.bad.length+' erreurs) '+JSON.stringify(r.bad.slice(0,3)));
  ok(Object.keys(r.kinds).length===3 && Object.values(r.kinds).every(n=>n>=15), 'les trois pièges (éboulé, mud cake, porosité faussée) sont tirés '+JSON.stringify(r.kinds));
  ok(r.rounds.every(([n,g,t])=>n===8 && g===5 && t===2), 'manche lithofaciès : 8 questions, 5 générées dont 2 pièges de log');
  ok(errs.length===0, 'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko? 'ECHECS: '+ko : 'TOUT OK'); process.exit(ko?1:0); })();
