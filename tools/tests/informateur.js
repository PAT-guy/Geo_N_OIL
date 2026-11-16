// Chocs externes et informateur : événements planifiés 2 à 8 mois à l'avance (fréquences vérifiées), effets réels (embargo, récession, tempête, taxe),
// briefing et alertes payants avec détection et fausses rumeurs mesurées, bilan affiché, interface sur téléphone.
const { chromium, devices } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const ctx = await br.newContext({...devices['iPhone 13']}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const T = await pg.evaluate(async ()=>{
    const o={}; document.getElementById('geoSeed').value='31'; menuConfig.daily=null; labOptLaunch(); await new Promise(r=>setTimeout(r,900));
    const reset = () => { G.marketEvents=[]; G.informant=null; G.price=80; G.priceTrend=0; G.priceTrendTarget=0; G.priceAlerts=[]; G.month=0; G.stormMonthsLeft=0; G.taxMonthsLeft=0; };
    // 1. fréquences, anticipation, prix borné
    reset(); G.financeMode=true; const seen=new Set(), N=12000, cnt={}; let early=0, minP=1e9, maxP=0;
    for(let m=1;m<=N;m++){ G.month=m; stepPrice(); minP=Math.min(minP,G.price); maxP=Math.max(maxP,G.price);
      (G.marketEvents||[]).forEach(e=>{ if(!seen.has(e)){ seen.add(e); cnt[e.kind]=(cnt[e.kind]||0)+1; if(e.at-m<2 || e.at-m>8) early++; } }); }
    o.freq = Object.fromEntries(Object.entries(cnt).map(([k,v])=>[k,+(v/N).toFixed(4)])); o.early=early; o.bounds=[+minP.toFixed(1), +maxP.toFixed(1)];
    // 2. effets : embargo, récession, tempête, taxe
    reset(); G.financeMode=false; G.marketEvents=[{kind:'embargo', size:14, at:1}]; G.month=1; const p0=G.price; stepPrice(); o.embargo = G.price > p0 + 8 && G.priceTrendTarget===0.08;
    reset(); G.marketEvents=[{kind:'recession', size:11, at:1}]; G.month=1; stepPrice(); o.recession = G.price < 80 - 6 && G.priceTrendTarget===-0.08;
    reset(); G.financeMode=false; G.sellMode='immediate'; G.wells=[]; G.loans=[]; G.hedgeContract=null; G.strikeMonthsLeft=0;
    const mk = (id, off) => ({ blockId:id, cost:5e6, offshore:off, production:1000, comps:[{q0:1000,t0:0}], monthsActive:0, status:'producing', isGas:false, eorActive:false, eorMonthsLeft:0 });
    const wOn = mk(0,false), wOff = mk(1,true); G.wells=[wOn,wOff]; G.drilling=[]; G.month=10;
    const tick = () => { const pr = G.wells.map(w=>w.production); G.marketEvents=[]; const before = G.price; monthTick(); const price=G.price; return { rev:G.lastRevenue, price, pr }; };
    G.stormMonthsLeft=0; G.taxMonthsLeft=0; let t = tick(); const base = t.rev / (t.price*(t.pr[0]+t.pr[1])); G.wells.forEach(w=>{w.production=1000; w.comps=[{q0:1000,t0:w.monthsActive}];});
    G.stormMonthsLeft=2; t = tick(); const stormRatio = t.rev / (t.price*t.pr[0]); o.storm = Math.abs(stormRatio-1)<0.02 && G.stormMonthsLeft===1;
    G.wells.forEach(w=>{w.production=1000; w.comps=[{q0:1000,t0:w.monthsActive}];}); G.stormMonthsLeft=0; G.taxMonthsLeft=3; t = tick(); const taxRatio = t.rev / (t.price*(t.pr[0]+t.pr[1])); o.tax = Math.abs(taxRatio-(1-TAX_RATE))<0.02 && G.taxMonthsLeft===2; o.base = +base.toFixed(3);
    // 3. briefing : détection 75 %, rumeurs
    reset(); G.mode='sandbox'; G.budget=1e9; G.financeMode=true; let realBig=0, listedReal=0, fakeItems=0, briefs=0;
    for(let m=1;m<=40000;m++){ G.month=m; stepPrice(); if(m%12===0){ const st=infoState(); const known=(G.marketEvents||[]).filter(ev=>{ const d=ev.at-G.month; return d>=1 && d<=INFO_BRIEF_H && infoIsBig(ev); }).length; realBig+=known; const nb=st.briefs.length; infoBuyBrief(); const br=infoState().briefs[nb]; briefs++; listedReal += br.items.filter(i=>i.real).length; fakeItems += br.items.filter(i=>!i.real).length; } }
    const st3 = infoState(); o.brief = { detect:+(listedReal/realBig).toFixed(3), fakePerBrief:+(fakeItems/briefs).toFixed(3), judged:st3.total, hit:+(st3.hits/st3.total).toFixed(3), realBig };
    // 4. alertes : détection 80 %, fausses 0,07 par mois, 1 à 3 mois d'avance
    reset(); G.financeMode=true; const st4 = infoState(); st4.subUntil = 1e9; const evs=new Set(); let big=0;
    for(let m=1;m<=40000;m++){ G.month=m; stepPrice(); (G.marketEvents||[]).forEach(e=>{ if(!evs.has(e)){ evs.add(e); if(infoIsBig(e)) big++; } }); }
    o.al = { big, told:st4.alertHits, fakes:st4.fakes.length, detect:+(st4.alertHits/big).toFixed(3), fakeRate:+(st4.fakes.length/40000).toFixed(3) };
    o.lead = st4.notes.every(n=>/dans [123] mois/.test(n.t));
    // 5. coût et interface
    reset(); G.mode='junior'; G.budget=1e6; const b0=G.budget; infoBuyBrief(); o.paid = Math.round(b0-G.budget)===INFO_BRIEF_COST;
    G.budget=10e3; const b1=G.budget; infoBuyBrief(); o.refused = G.budget===b1; G.budget=1e7; G.month=5; const sb=G.budget; infoSubscribe(); o.sub = Math.round(sb-G.budget)===INFO_SUB_COST && infoState().subUntil===5+INFO_SUB_MONTHS;
    informantOpen(); const mod=document.getElementById('informantModal'); o.ui = mod.classList.contains('open') && /Bilan de l'informateur/.test(mod.textContent) && /Briefing à 8 mois/.test(mod.textContent) && /Alertes d'événements/.test(mod.textContent);
    const r = document.getElementById('btnInformant').getBoundingClientRect(), rb = document.getElementById('btnPriceAlert').getBoundingClientRect(); o.btn = { w:Math.round(r.width), h:Math.round(r.height), bellH:Math.round(rb.height) };
    informantClose(); o.hudFit = document.documentElement.scrollWidth <= window.innerWidth+1;
    return o; });
  const f = T.freq;
  ok(Math.abs(f.trend-0.05)<0.012 && Math.abs(f.shock-0.012)<0.004 && Math.abs(f.embargo-0.004)<0.002 && Math.abs(f.recession-0.004)<0.002 && Math.abs(f.storm-0.005)<0.002 && Math.abs(f.tax-0.003)<0.0015, 'fréquences par mois conformes '+JSON.stringify(f));
  ok(T.early===0, 'chaque événement est planifié 2 à 8 mois à l\'avance');
  ok(T.bounds[0]>=20 && T.bounds[1]<=140, 'le prix reste entre 20 et 140 $ '+JSON.stringify(T.bounds));
  ok(T.embargo && T.recession, 'embargo : prix en hausse et tendance haussière ; récession : prix en baisse et tendance baissière');
  ok(T.storm, 'tempête : seul le puits en mer cesse de produire, le compteur décroît');
  ok(T.tax, 'taxe : revenus réduits de '+Math.round(15)+' %, compteur décroissant (rapport de base '+T.base+')');
  ok(Math.abs(T.brief.detect-0.75)<0.08 && Math.abs(T.brief.fakePerBrief-0.35)<0.1 && T.brief.judged>0, 'briefing : détection '+Math.round(T.brief.detect*100)+' % (75), '+T.brief.fakePerBrief+' fausse rumeur par briefing (0,35) '+JSON.stringify(T.brief));
  ok(Math.abs(T.al.detect-0.8)<0.08 && Math.abs(T.al.fakeRate-0.07)<0.02, 'alertes : détection '+Math.round(T.al.detect*100)+' % (80), fausses '+T.al.fakeRate+' par mois (0,07) '+JSON.stringify(T.al));
  ok(T.lead, 'les alertes annoncent l\'événement 1 à 3 mois avant');
  ok(T.paid && T.refused && T.sub, 'briefing et abonnement sont payants, refusés sans budget, abonnement de 12 mois');
  ok(T.ui && T.btn.h>=40 && T.btn.w>=40, 'la fenêtre affiche briefing, alertes et bilan ; bouton 📡 de 40 px au moins sur téléphone '+JSON.stringify(T.btn));
  ok(T.hudFit, 'la barre du haut tient sur téléphone sans défilement horizontal');
  ok(errs.length===0, 'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko? 'ECHECS: '+ko : 'TOUT OK'); process.exit(ko?1:0); })();
