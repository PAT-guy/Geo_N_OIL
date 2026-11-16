// Cartes de la production avancée sur téléphone (V5.2) : eau et BSW, qualité et gaz, traitement et transport, puits actif, résumé de forage, écran de programme.
// Aucun défilement horizontal, texte dans l'écran, boutons d'au moins 40 px de haut (les boutons « compacts » d'études, volontairement à 36 px en mode téléphone, sont exclus).
const { chromium, devices } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const ctx=await br.newContext({...devices['iPhone 13']}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const R = await pg.evaluate(async()=>{ const o={}; document.getElementById('geoSeed').value='2468'; menuConfig.mode='expert'; menuConfig.basinType='aquitaine'; menuConfig.gridSize=12; menuConfig.offshore=false; LABOPT.advfluids=true; LABOPT.rigprog=true; labOptLaunch(); await new Promise(r=>setTimeout(r,1200)); setSpeed(0); LABOPT.pick=false; G.budget=1e9; G.price=80; checkEndConditions=function(){};
    const land=blocks.filter(b=>!b.inSalt&&!b.isOffshore); G.wells=[1,2,3,4,5].map(i=>{ const b=land[i]; const w={blockId:b.id,cost:5e6,offshore:false,production:8000,comps:[{q0:8000,t0:-30}],monthsActive:30,cum:200000,status:'producing',isGas:false,eorActive:false,eorMonthsLeft:0,wp:waterParams(b,false),fp:{kind:'oil',api:31,sulfur:0.5,gor:800},rd:{mech:'solgas',pi:200}}; b.well=w; return w; });
    const vw = window.innerWidth, check = (id)=>{ const el=document.getElementById(id); if(!el) return null; const r=el.getBoundingClientRect(); let wide=0, small=0; el.querySelectorAll('*').forEach(e=>{ const q=e.getBoundingClientRect(); if(q.width>0 && q.right>vw+1) wide++; }); const names=[]; el.querySelectorAll('button:not(.study-btn-compact)').forEach(b=>{ const q=b.getBoundingClientRect(); if(q.width>0 && q.height<40){ small++; names.push((b.textContent||'').trim().slice(0,30)+' '+Math.round(q.height)); } }); return { wide, small, names, nb: el.querySelectorAll('button').length, right:Math.round(r.right), vw }; };
    showMobileScreen('gisements'); renderGisementsPanel(); await new Promise(r=>setTimeout(r,200)); o.gis = check('gisementsContent'); o.gisScroll = document.documentElement.scrollWidth <= vw+1;
    const b=land[1]; selectedBlock=b.id; showMobileScreen('studies'); renderStudiesPanel(b); await new Promise(r=>setTimeout(r,200)); o.puits = check('studiesContent'); o.puitsScroll = document.documentElement.scrollWidth <= vw+1;
    const c=land[20]; c.studyLevel=3; c.estimate={structPos:0,prob:.3,quality:50,qualErr:5,depth:2000,isGas:false}; selectedBlock=c.id; renderStudiesPanel(c); document.getElementById('drillMethod').value='vertical'; updateDrillSummary(c.id); await new Promise(r=>setTimeout(r,200)); o.sum = check('drillSummary'); o.sumScroll = document.documentElement.scrollWidth <= vw+1;
    drillBlock(c.id,'vertical','standard',null); await new Promise(r=>setTimeout(r,200)); o.prog = check('progModal'); o.progOpen = document.getElementById('progModal')?.classList.contains('open'); o.progScroll = document.documentElement.scrollWidth <= vw+1; progClose();
    return o; });
  const g=(k,v)=>v && v.wide===0 && v.small===0;
  ok(R.gisScroll && R.gis && R.gis.wide===0, 'Gisements : aucun débordement horizontal ('+JSON.stringify(R.gis)+')');
  ok(R.gis && R.gis.small===0, 'Gisements : tous les boutons font 40 px de haut au moins ('+R.gis.small+' trop petits sur '+R.gis.nb+')');
  ok(R.puitsScroll && R.puits && R.puits.wide===0, 'puits actif : aucun débordement horizontal ('+JSON.stringify(R.puits)+')');
  ok(R.puits && R.puits.small===0, 'puits actif : boutons de 40 px au moins ('+JSON.stringify(R.puits.names)+' sur '+R.puits.nb+')');
  ok(R.sumScroll && R.sum && R.sum.wide===0, 'résumé de forage : aucun débordement horizontal');
  ok(R.progOpen && R.progScroll && R.prog && R.prog.wide===0, 'écran de programme : aucun débordement horizontal ('+JSON.stringify(R.prog)+')');
  ok(R.prog && R.prog.small===0, 'écran de programme : boutons de 40 px au moins ('+R.prog.small+' sur '+R.prog.nb+')');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
