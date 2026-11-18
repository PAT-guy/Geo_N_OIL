// Mini-jeu « Interpréter une coupe sismique » : coupes toujours lisibles (faille unique, réflecteur cible net), jugement des pointés, géologie de la partie intacte, parcours au doigt sur téléphone.
const { chromium, devices } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const errs=[]; const ctx=await br.newContext({...devices['iPhone 13']}); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1'); localStorage.removeItem('geoexplorer_quiz_best_sei');}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const T = await pg.evaluate(()=>{ const S=window.__sei, o={n:0,nul:0,bad:[],tapBad:[],sepBad:0,cross:0}; window.__keep = blocks; const keepLen = blocks.length;
    for(let i=0;i<80;i++){ const R=S.makeRound(); if(!R){ o.nul++; continue; } o.n++;
      const tops=R.tgt.tops, d=[]; for(let k=0;k<7;k++) d.push(Math.abs(tops[k+1]-tops[k])); const gap=d.indexOf(Math.max(...d)), dmax=d[gap], others=d.filter((v,k)=>k!==gap);
      if(R.cols.length!==8 || gap!==R.gap || dmax<50 || Math.max(...others)>Math.min(0.55*dmax,38)+1e-9) o.bad.push(['faille',gap,R.gap,dmax,Math.max(...others)]);
      if(R.tieZ!==tops[R.tieCol] || R.tgtZ!==tops[R.tgtCol] || Math.abs(R.tieCol-R.tgtCol)<3) o.bad.push(['colonnes']);
      const sep = c => Math.min(...R.ifs.filter(f=>!f.res).map(f=>Math.abs(f.tops[c]-tops[c])), 1e9); if(sep(R.tieCol)<70-1e-9 || sep(R.tgtCol)<70-1e-9) o.sepBad++;
      if(R.ifs.some(f=>f.R.some(v=>!isFinite(v)))) o.bad.push(['R']); if(Math.abs(R.tgt.R[R.tieCol])<0.035 && Math.abs(R.tgt.R[R.tgtCol])<0.035) o.bad.push(['contraste']);
      if((R.tieCol<=R.gap)!==(R.tgtCol<=R.gap)) o.cross++;
      // jugement des pointés
      const X=c=>S.xOf(c), Y=z=>S.yOf(R,z);
      const jh = (c,z)=>S.judge(R,'h',X(c),Y(z)).ok;
      if(!jh(R.tgtCol,R.tgtZ) || !jh(R.tgtCol,R.tgtZ+40) || !jh(R.tgtCol,R.tgtZ-40)) o.tapBad.push(['juste refusé']);
      if(jh(R.tgtCol,R.tgtZ+70) || jh(R.tgtCol,R.tgtZ-70) || jh((R.tgtCol+3)%8,R.tgtZ)) o.tapBad.push(['faux accepté']);
      const jf = x=>S.judge(R,'f',x,150).ok; const mid=(X(R.gap)+X(R.gap+1))/2; const other=R.gap>=3 ? (X(0)+X(1))/2 : (X(6)+X(7))/2;
      if(!jf(mid) || jf(other)) o.tapBad.push(['faille']); }
    o.isolated = blocks===window.__keep && blocks.length===keepLen; return o; });
  ok(T.n>=72, 'coupes générées : '+T.n+'/80 ('+T.nul+' échecs de génération)');
  ok(T.bad.length===0, 'chaque coupe a une faille unique et franche, des colonnes cohérentes et un réflecteur cible contrasté '+JSON.stringify(T.bad.slice(0,2)));
  ok(T.sepBad===0, 'aucun autre réflecteur à moins de 70 m du pointé au puits ni à la colonne cible');
  ok(T.cross>=T.n*0.5, 'au moins la moitié des coupes demandent de franchir la faille ('+T.cross+'/'+T.n+')');
  ok(T.tapBad.length===0, 'le jugement accepte les pointés à 40 m, refuse à 70 m ou sur une mauvaise colonne, et situe la faille '+JSON.stringify(T.tapBad.slice(0,2)));
  ok(T.isolated, 'la géologie de la partie en cours est intacte après génération');
  // parcours au doigt
  await pg.locator('#quickMiniBtn').tap(); await pg.locator('#quickTrain button[data-open="sei"]').tap(); await pg.waitForTimeout(500);
  const ui = await pg.evaluate(()=>{ const m=document.getElementById('seiGameModal'), svg=document.getElementById('seiSvg'), r=svg?svg.getBoundingClientRect():null; return { open:m.classList.contains('open'), svg:!!svg, w:r?Math.round(r.width):0, fits: r && r.right<=window.innerWidth+1, q:document.getElementById('seiQ').textContent.slice(0,60), over: document.documentElement.scrollWidth>window.innerWidth+1 }; });
  ok(ui.open && ui.svg && ui.fits && !ui.over && /Le puits/.test(ui.q), 'téléphone : la coupe s\'affiche dans la largeur sans débordement ('+ui.w+' px) avec la question du puits');
  const tapAt = async (frac)=>{ const p = await pg.evaluate(src=>{ const S=window.__sei, R=S.rounds[S.state().ri], svg=document.getElementById('seiSvg').getBoundingClientRect(); const pt=(new Function('R','S',src))(R,S); return { x: svg.left + pt.x/S.VBW*svg.width, y: svg.top + pt.y/S.VBH*svg.height }; }, frac); await pg.touchscreen.tap(p.x, p.y); await pg.waitForTimeout(120); };
  await tapAt('return {x:S.xOf(R.tgtCol), y:S.yOf(R,R.tgtZ)}');
  const a1 = await pg.evaluate(()=>({ st:window.__sei.state(), fb:document.getElementById('seiFb').textContent, show:document.getElementById('seiFb').classList.contains('ok'), nextH:document.getElementById('seiNext').getBoundingClientRect().height }));
  ok(a1.st.score===1 && a1.st.answered && a1.show && /Bien pointé/.test(a1.fb) && a1.nextH>=44, 'téléphone : un pointé juste au doigt est reconnu, le bouton Suite fait 44 px au moins');
  await pg.locator('#seiNext').tap(); await pg.waitForTimeout(150);
  await tapAt('const far = R.gap>=3 ? 0 : 6; return {x:(S.xOf(far)+S.xOf(far+1))/2, y:150}');
  const a2 = await pg.evaluate(()=>({ st:window.__sei.state(), fb:document.getElementById('seiFb').textContent }));
  ok(a2.st.score===1 && a2.st.asked===2 && /Pas là/.test(a2.fb), 'téléphone : une faille pointée au mauvais endroit est refusée et expliquée');
  // fin de manche : réponses programmatiques
  await pg.evaluate(()=>{ const S=window.__sei; for(let k=0;k<4;k++){ document.getElementById('seiNext').click(); const R=S.rounds[S.state().ri], kind=S.cur.kind; if(kind==='h') S.answer(S.xOf(R.tgtCol), S.yOf(R,R.tgtZ)); else S.answer((S.xOf(R.gap)+S.xOf(R.gap+1))/2, 150); } document.getElementById('seiNext').click(); });
  const fin = await pg.evaluate(()=>({ q:document.getElementById('seiQ').textContent, best:localStorage.getItem('geoexplorer_quiz_best_sei'), again:/Rejouer/.test(document.getElementById('seiNext').textContent) }));
  ok(/Manche terminée : 5\/6/.test(fin.q) && fin.best && JSON.parse(fin.best).s===5 && fin.again, 'téléphone : bilan de la manche (5/6), meilleur score enregistré, bouton Rejouer ('+fin.q.slice(0,40)+')');
  ok(errs.length===0, 'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko? 'ECHECS: '+ko : 'TOUT OK'); process.exit(ko?1:0); })();
