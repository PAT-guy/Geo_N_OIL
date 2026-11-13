// Drain horizontal (géosteering) : géométrie jouable, diagraphies cohérentes, capteurs en retard, pilotage limité, score, niveaux de joueurs,
// et parcours complet au doigt sur téléphone simulé (puits vertical, drain, bilan).
const { chromium, devices } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); }; const errs=[];
  const pg=await br.newPage(); pg.on('pageerror',e=>errs.push(e.message)); await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const T = await pg.evaluate(()=>{ const R=window.__rig, o={n:0,col:0,exit:0,heel:0,grc:0,rtc:0,meas:0,measN:0,lagN:0,lagOk:0,steer:0,steerN:0,geom:0,geomN:0,score:0,scoreN:0,naive:[],bot:[]};
    for(let i=0;i<60;i++){ const sc=R.rigScenario(); if(!sc) continue; o.n++; const d=sc.drain;
      // géométrie : colonne d'hydrocarbures d'au moins 18 m partout, talon dans la zone, contraste GR et Rt, trajectoire horizontale qui sort entre 120 et 340 m
      let minCol=1e9; for(let x=0;x<=d.L+200;x+=10) minCol=Math.min(minCol, d.zc-(d.top+d.off(x))); if(minCol>=18) o.col++;
      if(R.drZone(d,0,d.heelZ)==='pay') o.heel++; if(d.grAbove>=95 && d.grPay<=60) o.grc++; if(d.rtPay>=11 && d.rtWater<=0.7*d.rtPay) o.rtc++;
      let xe=Infinity; { const out = x => { const tp=d.top+d.off(x), bs=tp+d.thr; return (d.heelZ < tp-6 || d.heelZ > Math.min(bs, d.zc)+6) ? 1 : 0; }; for(let x=0;x<=d.L;x+=10){ if(out(x)){ let s2=true; for(let x2=x;x2<=Math.min(d.L,x+120);x2+=10) if(!out(x2)) s2=false; if(s2){ xe=x; break; } } } } if(xe>=120 && xe<=340) o.exit++;
      // mesures : la zone mesurée est celle du point, GR et Rt dans les bandes attendues
      for(let k=0;k<40;k++){ const x=Math.random()*d.L, z=d.top-20+Math.random()*(d.thr+60); const m=R.drMeasure(d,x,z), zn=R.drZone(d,x,z); o.measN++;
        const grOk = zn==='above' ? Math.abs(m.gr-d.grAbove)<=9 : zn==='below' ? Math.abs(m.gr-d.grBelow)<=9 : Math.abs(m.gr-d.grPay)<=9;
        const rtOk = zn==='pay' ? m.rt>=d.rtPay*0.8 : zn==='water' ? m.rt<=d.rtWater*1.25 : m.rt<=5; if(m.zone===zn && grOk && rtOk) o.meas++; }
      const mk=()=>{ const S=R.rigNew(sc); S.status='td'; S.dr=R.drNew(S); return S; };
      // pilotage : 2° au plus par pas, intégration de la trajectoire, score cohérent avec la zone du trou
      const S=mk(), dr=S.dr; let prev=0, okS=true, okG=true, x0=dr.x, z0=dr.z; for(let k=0;k<40;k++){ dr.target = k<20 ? 9 : -9; R.drStep(S); if(Math.abs(dr.pitch-prev)>2.0001) okS=false; const r=dr.pitch*Math.PI/180, tr=dr.trail, a=tr[tr.length-2], b=tr[tr.length-1]; if(Math.abs((b.x-a.x)-10*Math.cos(r))>1e-9 || Math.abs((b.z-a.z)-10*Math.sin(r))>1e-9) okG=false; prev=dr.pitch; }
      o.steerN++; if(okS && Math.abs(dr.md-400)<1e-9) o.steer++; o.geomN++; if(okG) o.geom++;
      const B=mk(); R.drainBot(B,'bot'); const N=mk(); R.drainBot(N,'naive'); o.bot.push(R.drScore(B).score); o.naive.push(R.drScore(N).score);
      let pay=0; B.dr.trail.slice(3).forEach(p=>{ if(R.drZone(d,p.x,p.z)==='pay') pay++; }); o.scoreN++; if(pay===B.dr.inPay && Math.abs(R.drScore(B).pct - pay/B.dr.steps)<1e-9) o.score++;
      // capteurs en retard : toute limite détectée l'est au moins 5 m derrière l'outil
      B.dr.marks.concat(N.dr.marks).forEach(m=>{ o.lagN++; if(m.at - m.x >= 5.5) o.lagOk++; }); }
    return o; });
  ok(T.n>=55, 'scénarios de drain générés : '+T.n+'/60');
  ok(T.col===T.n && T.heel===T.n && T.grc===T.n && T.rtc===T.n, 'géométrie : colonne d\'hydrocarbures >= 18 m partout, talon dans la zone, GR et Rt contrastés ('+T.col+', '+T.heel+', '+T.grc+', '+T.rtc+' sur '+T.n+')');
  ok(T.exit===T.n, 'une trajectoire horizontale sort de la zone (de plus de 6 m, pendant au moins 120 m) entre 120 et 340 m dans les '+T.n+' scénarios (le drain est exigeant)');
  ok(T.meas===T.measN, 'mesures GR et Rt conformes à la zone traversée ('+T.meas+'/'+T.measN+')');
  ok(T.steer===T.steerN && T.geom===T.geomN, 'pilotage : 2° au plus par 10 m, trajectoire intégrée avec cos et sin de l\'inclinaison, longueur forée exacte');
  ok(T.score===T.scoreN, 'score = part des pas dont la position réelle est dans la zone ('+T.score+'/'+T.scoreN+')');
  ok(T.lagN>20 && T.lagOk===T.lagN, 'capteurs derrière l\'outil : '+T.lagN+' limites détectées, toutes à au moins 5,5 m derrière l\'outil');
  const avg=a=>a.reduce((x,y)=>x+y,0)/a.length, bm=avg(T.bot), nm=avg(T.naive);
  ok(bm>=72 && nm<=68 && bm-nm>=8, 'joueurs automatiques : suiveur des diagraphies '+Math.round(bm)+'/100, trajectoire horizontale '+Math.round(nm)+'/100 (écart d\'au moins 8 points)');
  // parcours au doigt
  await pg.close();
  const ctx=await br.newContext({...devices['iPhone 13'],viewport:{width:390,height:780}}); const ph=await ctx.newPage(); ph.on('pageerror',e=>errs.push(e.message));
  await ph.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.removeItem('geoexplorer_quiz_best_rigdrain')}catch(e){}});
  await ph.goto('file://'+path.resolve(__dirname,'../../index.html')); await ph.waitForTimeout(300);
  await ph.locator('#quickTrain button[data-open="rig"]').tap(); await ph.waitForTimeout(400);
  await ph.evaluate(()=>{ const R=window.__rig; R.playBot(R.S,'good'); R.render(); });
  ok(await ph.evaluate(()=>!!document.getElementById('rgDrain') && /Continuer : forer le drain horizontal/.test(document.getElementById('rgDrain').innerText)), 'téléphone : après le puits vertical réussi, le bilan propose le drain horizontal');
  await ph.locator('#rgDrain').tap(); await ph.waitForTimeout(200);
  const br_ = await ph.evaluate(()=>{ const t=document.getElementById('rgBody').innerText, d=window.__rig.S.sc.drain; return { titre:/Projet de drain horizontal/.test(t), toit:t.includes(String(Math.round(d.top))+' m') && t.includes(String(Math.round(d.zc))+' m'), outils:/GR/.test(t) && /résistivité/.test(t) && /inclinaison visée/i.test(t), inconnu:/pendage/.test(t), start:!!document.getElementById('rgDrStart'), sans:!document.getElementById('rgDrT') }; });
  ok(br_.titre && br_.toit && br_.outils && br_.inconnu && br_.start && br_.sans, 'téléphone : récapitulatif du drain (objectif, toit et contact connus, ce qu\'on ignore, outils), sans commandes avant de commencer');
  await ph.locator('#rgDrStart').tap(); await ph.waitForTimeout(200);
  const ui = await ph.evaluate(()=>{ const bt=[...document.querySelectorAll('#rgBody button')].filter(e=>e.offsetParent).map(e=>Math.round(e.getBoundingClientRect().height)); return { minBtn:Math.min(...bt), slider:!!document.getElementById('rgDrT'), termineOff: document.getElementById('rgDrEnd').disabled, debord: document.documentElement.scrollWidth>innerWidth, chart: !!document.querySelector('#rgChart svg') }; });
  ok(ui.minBtn>=40 && ui.slider && ui.termineOff && !ui.debord && ui.chart, 'téléphone : commandes du drain (boutons >= 40 px, curseur d\'inclinaison), « Terminer » inactif avant 200 m, pas de débordement');
  await ph.evaluate(()=>{ const el=document.getElementById('rgDrT'); el.value='4'; el.dispatchEvent(new Event('input')); });
  await ph.locator('#rgDrOne').tap(); await ph.locator('#rgDrOne').tap(); await ph.waitForTimeout(100);
  const st = await ph.evaluate(()=>{ const dr=window.__rig.S.dr; return { target:dr.target, pitch:dr.pitch, md:dr.md, logs:dr.logs.length, gr:/GR\s*\n?\s*\d+ API/.test(document.getElementById('rgStats').innerText), courbes: document.querySelectorAll('#rgChart polyline').length>=3 }; });
  ok(st.target===4 && Math.abs(st.pitch-4)<1e-9 && st.md===20 && st.logs===2 && st.gr && st.courbes, 'téléphone : le curseur vise +4° (atteint en 2 pas), deux pas forés, GR et Rt mesurés et tracés');
  await ph.evaluate(()=>{ const S=window.__rig.S; for(let i=0;i<24;i++) window.__rig.drStep(S); window.__rig.render(); });
  ok(await ph.evaluate(()=>!document.getElementById('rgDrEnd').disabled), 'téléphone : « Terminer le drain » devient actif après 200 m');
  await ph.locator('#rgDrEnd').tap(); await ph.waitForTimeout(150);
  const fin = await ph.evaluate(()=>({ t:document.getElementById('rgBody').innerText, best:localStorage.getItem('geoexplorer_quiz_best_rigdrain'), again:!!document.getElementById('rgAgain') }));
  ok(/Score : \d+\/100/.test(fin.t) && /dans la zone d'hydrocarbures/.test(fin.t) && /pendage/.test(fin.t) && fin.again && fin.best!==null, 'téléphone : bilan du drain (part dans la zone, au-dessus, sous le contact, score, structure réelle) et meilleur score mémorisé');
  console.log('erreurs JS', errs); console.log(ko?'ECHECS: '+ko:'TOUT OK'); await br.close(); process.exit(ko||errs.length?1:0); })();
