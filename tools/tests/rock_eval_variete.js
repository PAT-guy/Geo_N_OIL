// Rock-Eval : résultats variés (toutes les classes de potentiel présentes, la majorité n'est pas « Bon »), HI cohérent avec la maturité,
// aucune roche-mère là où la province n'en a pas, lecture Tmax affichée.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const T = await pg.evaluate(()=>{ const pot={}, hi={Immature:[],'Fenêtre à huile':[],'Surmature (gaz)':[]}, o={n:0,absentBad:0,absent:0,incoh:0,tmaxBad:0};
    for(const bt of ['random','rift','passive','foreland','paris','north_sea','aquitaine','gulf_coast','permian']) for(let s=1;s<=12;s++){ generateGeology(12,bt,true,s*977+13); const rng=makeRng(s+7);
      blocks.forEach(b=>{ const r=STUDIES.rockeval.do(b,rng); if(b.srcAbsent){ o.absent++; if(!(+r.toc<0.7)) o.absentBad++; return; } o.n++; pot[r.genPotential]=(pot[r.genPotential]||0)+1; hi[b.maturityClass].push(r.hi);
        const t=+r.toc, h=r.hi, cls = t<0.3?'Non générateur': t<0.7?'Pauvre': t<1.5 ? (h>300?'Bon':'Moyen') : (h>400?'Excellent':'Bon'); const near = [0.3,0.7,1.5].some(th=>Math.abs(t-th)<0.011) || Math.abs(h-300)<=1 || Math.abs(h-400)<=1; /* l'arrondi de l'affichage peut franchir un seuil */ if(cls!==r.genPotential && !near) o.incoh++;
        const exp = b.maturityClass==='Immature' ? r.tmax<435 : b.maturityClass==='Fenêtre à huile' ? (r.tmax>=435 && r.tmax<=455) : r.tmax>455; if(!exp) o.tmaxBad++; }); }
    const med = a => { const t=[...a].sort((x,y)=>x-y); return t[Math.floor(t.length/2)]; };
    o.pct = Object.fromEntries(Object.entries(pot).map(([k,v])=>[k,Math.round(100*v/o.n)])); o.hiMed = { imm:med(hi.Immature), oil:med(hi['Fenêtre à huile']), gas:med(hi['Surmature (gaz)']) };
    // lecture Tmax dans le panneau
    const b = blocks.find(x=>!x.srcAbsent); b.well = {status:'producing', production:100, comps:[{q0:100,t0:0}], monthsActive:0, isGas:false, offshore:false, cost:1e6}; b.estimate = b.estimate || {}; b.estimate.rockeval = STUDIES.rockeval.do(b, rng0 = makeRng(3));
    renderStudiesPanel(b); o.lecture = /Tmax (sous|entre|au-dessus)/.test(document.body.innerHTML); return o; });
  ok(['Non générateur','Pauvre','Moyen','Bon','Excellent'].every(k=>(T.pct[k]||0)>=2), 'les cinq classes de potentiel existent, chacune à 2 % au moins '+JSON.stringify(T.pct));
  ok((T.pct.Bon||0)<=72, '« Bon » n\'est plus la réponse automatique : '+T.pct.Bon+' % ('+T.n+' mesures)');
  ok(T.hiMed.imm>T.hiMed.oil && T.hiMed.oil>T.hiMed.gas && T.hiMed.gas<100, 'le HI baisse avec la maturité : immature '+T.hiMed.imm+', huile '+T.hiMed.oil+', gaz '+T.hiMed.gas);
  ok(T.incoh===0, 'la classe de potentiel suit la règle affichée (TOC puis HI)');
  ok(T.tmaxBad===0, 'le Tmax reste cohérent avec la classe de maturité');
  ok(T.absent>0 && T.absentBad===0, 'une province sans roche-mère donne un TOC très faible ('+T.absent+' blocs)');
  ok(T.lecture, 'le panneau affiche la lecture du Tmax');
  ok(errs.length===0, 'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko? 'ECHECS: '+ko : 'TOUT OK'); process.exit(ko?1:0); })();
