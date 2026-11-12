// Matériel de forage : fiabilité dépendante de la charge (profondeur / limite), utilisée par le tirage du jeu,
// et mini-jeu « Dimensionner son forage » (réponses recalculables, bonnes réponses équilibrées).
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(400);
  // 1. la fonction
  const f = await pg.evaluate(()=>{ const o={}; for(const k of Object.keys(EQUIPMENT)){ const e=EQUIPMENT[k]; const ds=[0,0.2,0.5,0.8,1].map(r=>eqReliability(e,r*e.maxDepth)); o[k]={ds, base:eqReliability(e,e.maxDepth*0.5)-e.reliability}; } return o; });
  const mono = Object.values(f).every(o=>o.ds.every((v,i,a)=>i===0||v<=a[i-1]+1e-12)), bornes = Object.values(f).every(o=>o.ds.every(v=>v>=0.5&&v<=0.99)), centre = Object.values(f).every(o=>Math.abs(o.base)<1e-9);
  ok(mono && bornes && centre, 'fiabilité : décroissante avec la charge, bornée à 50-99 %, égale à la base à mi-limite '+JSON.stringify(Object.fromEntries(Object.entries(f).map(([k,o])=>[k,o.ds.map(v=>Math.round(v*100))]))));
  // 2. le tirage du jeu utilise cette fiabilité, exactement
  await pg.click('#startBtn'); await pg.click('#labOptGo'); await pg.waitForTimeout(500);
  const g = await pg.evaluate(()=>{ setSpeed(0); G.budget = 1e9; G.labPick = null; const res=[]; const realRandom=Math.random;
    const run = (equip, depth, x, bidx)=>{ const b=blocks.filter(z=>!z.inSalt&&!z.well&&!z.dryHole)[bidx]; b.topOfReservoir=depth; b.horizons.forEach(h=>{ if(h.role==='reservoir') h.top = depth; }); b.trueProbability=0.9;
      const q=[0.0001, x]; Math.random = ()=> q.length ? q.shift() : realRandom();
      try { resolveDrilling({blockId:b.id, method:'vertical', equip, depth, cost:1e6, cf:1, startMonth:0, endMonth:0}); } finally { Math.random = realRandom; }
      return { well: !!b.well, dry: !!b.dryHole, tech: b.dryHoleInfo && b.dryHoleInfo.techFail, detail: b.dryHoleInfo && b.dryHoleInfo.techDetail }; };
    const cases = [['standard',3800,0],['standard',1500,1],['leger',2400,2],['renforce',5000,3]];
    cases.forEach(([eq,d,i])=>{ const rel=eqReliability(EQUIPMENT[eq], d); const a=run(eq,d,rel-0.002,i*2), c=run(eq,d,rel+0.002,i*2+1); res.push({eq,d,rel,reussi:a.well, echoue:c.dry&&c.tech, relNote:c.detail&&c.detail.rel, depthNote:c.detail&&c.detail.depth}); });
    const tooDeep = run('leger',3000,0.0001,10); res.push({eq:'leger',d:3000,tooDeep:tooDeep.dry&&tooDeep.tech&&tooDeep.detail.tooDeep});
    return res; });
  g.slice(0,4).forEach(c=>ok(c.reussi && c.echoue && Math.abs(c.relNote-c.rel)<1e-9 && c.depthNote===c.d, 'tirage du jeu : '+c.eq+' à '+c.d+' m bascule exactement à la fiabilité '+Math.round(c.rel*1000)/10+' %'));
  ok(g[4].tooDeep, 'tirage du jeu : un matériel léger à 3000 m échoue toujours (au-delà de sa limite)');
  // 3. le débrief cite la cause
  const deb = await pg.evaluate(()=>{ const b=blocks.find(z=>z.dryHoleInfo&&z.dryHoleInfo.techFail&&z.dryHoleInfo.techDetail&&!z.dryHoleInfo.techDetail.tooDeep); const dd = blocks.find(z=>z.dryHoleInfo&&z.dryHoleInfo.techDetail&&z.dryHoleInfo.techDetail.tooDeep);
    const h1 = b ? debriefEntry(b, b.dryHoleInfo, false) : '', h2 = dd ? debriefEntry(dd, dd.dryHoleInfo, false) : ''; return { fiab: /fiabilité de \d+ % à \d+ m \(\d+ % de sa limite\)/.test(h1), limite: /au-delà de la limite du matériel léger \(2500 m\)/.test(h2) }; });
  ok(deb.fiab && deb.limite, 'débrief : cite la fiabilité à la profondeur et la part de la limite, ou le dépassement de limite');
  // 4. mini-jeu
  const q = await pg.evaluate(()=>{ const all=[], rounds=[]; for(let i=0;i<60;i++){ all.push(...window.__qz.qzGenForage()); const r=window.__qz.qzBuildRound(window.__qz.QUIZ_BANKS.forage); rounds.push([r.length, r.filter(x=>x.gen).length]); } return {all, rounds}; });
  let bad=0; const win={leger:0,standard:0,renforce:0,none:0}; let nEv=0, nFiab=0;
  const evals = await pg.evaluate((all)=>{ const E=EQUIPMENT; return all.map(x=>{ if(x.kind==='ev'){ const m=x.meta; const rows=['leger','standard','renforce'].map(id=>{ const e=E[id]; const okd=m.depth<=e.maxDepth; return {id, ev: okd? m.p*eqReliability(e,m.depth)*m.gain - m.depth*e.costM : -Infinity}; }); const best=[...rows].sort((a,c)=>c.ev-a.ev); const good = best[0].ev<=0 ? 'none' : best[0].id; const gap = best[0].ev<=0 ? Math.abs(best[0].ev) : best[0].ev-best[1].ev; return {kind:'ev', good, gap, gain:m.gain, shown:x.choices[x.correct], textOk: x.q.includes(m.depth+' m') && x.q.includes(Math.round(m.p*100)+' %'), distinct: new Set(x.choices).size===x.choices.length}; }
      const rs=x.meta.trio.map(t=>eqReliability(E[t.id],t.depth)); const mn=Math.min(...rs), s=[...rs].sort((a,c)=>a-c); return {kind:'fiab', good: rs.indexOf(mn), gap: s[1]-s[0], correct:x.correct, textOk: x.meta.trio.every(t=>x.q.includes(t.depth+' m')), distinct:true}; }); }, q.all);
  evals.forEach((e,i)=>{ const x=q.all[i]; if(e.kind==='ev'){ nEv++; const idx = x.correct, ids=['leger','standard','renforce','none']; if(ids[idx]!==e.good) bad++; if(e.gap < Math.max(0.04*e.gain,120000)-1) bad++; if(!e.textOk||!e.distinct) bad++; win[e.good]++; } else { nFiab++; if(e.good!==e.correct || e.gap<0.025-1e-9 || !e.textOk) bad++; } });
  ok(bad===0, 'mini-jeu : '+nEv+' questions de gain net et '+nFiab+' de fiabilité recalculées, marges respectées, textes cohérents ('+bad+' erreurs)');
  const tot=nEv; ok(['leger','standard','renforce'].every(k=>win[k]/tot>=0.15) && win.none>0, 'mini-jeu : bonnes réponses équilibrées '+JSON.stringify(win));
  ok(q.rounds.every(([n,gen])=>n===8 && gen>=5), 'mini-jeu : manche de 8 questions, au moins 5 générées (reste : liste fixe) ; générées par manche '+[...new Set(q.rounds.map(r=>r[1]))].join('/'));
  // accès : accueil simple et onglet mini-jeux
  const acc = await pg.evaluate(()=>({ home: !!document.querySelector('#quickTrain button[data-quiz="forage"]'), card: !!document.querySelector('.mg-card[data-quiz="forage"]') }));
  ok(acc.home && acc.card, 'accès : bouton « S\'entraîner » et carte de l\'onglet Mini-jeux présents');
  console.log('erreurs JS', errs); console.log(ko?'ECHECS: '+ko:'TOUT OK'); await br.close(); process.exit(ko||errs.length?1:0); })();
