// Injection de CO2 (V5.15) : MMP, miscibilité selon la pression, gain selon le mécanisme, percée, soutien de pression, coût au Mcf, conditions d'accès, achat et arrêt.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1300,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  await pg.evaluate(async()=>{ document.getElementById('geoSeed').value='2024'; menuConfig.mode='junior'; menuConfig.basinType='paris'; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); setSpeed(0); G.budget=80e6; G.advOn=true; });
  // MMP : la formule annoncée
  const m = await pg.evaluate(()=>({ a:co2Mmp({tempAtRes:60},{api:30}), b:co2Mmp({tempAtRes:100},{api:20}), c:co2Mmp({tempAtRes:30},{api:50}) }));
  ok(Math.abs(m.a-111)<0.01 && Math.abs(m.b-(75+84+9))<0.01 && m.c===60,'MMP = 75 + 1,2 (T − 30) − 0,9 (API − 30), plancher 60 bar '+JSON.stringify(m));
  // puits fictif, mécanismes et pressions contrôlés
  const r = await pg.evaluate(()=>{ const b=blocks.find(x=>!x.inSalt && !x.isOffshore && !x.well && x.topOfReservoir>=900); b.tempAtRes=60;
    const mk=(mech)=>({ blockId:b.id, status:'producing', method:'vertical', production:10000, comps:[{q0:10000,t0:0}], monthsActive:10, cum:0, offshore:false, fp:{kind:'oil',api:30,sulfur:0.5,gor:500}, rd:{mech, pi:300}, wp:null, isGas:false });
    const out={}; b.well=mk('solgas'); const w=b.well;
    const eco0=wellEconomicsRaw(w); w.co2={since:10,capex:2e6};
    // miscible (pression 300 > MMP 111) : +22 % pour un gaz dissous
    const s1=co2State(w); out.miscible=s1.misc; out.boostSol=s1.boost;
    w.rd.mech='gascap'; out.boostCap=co2State(w).boost; w.rd.mech='aquifer'; out.boostAq=co2State(w).boost; w.rd.mech='solgas';
    // immiscible : on abaisse la pression via le cumul
    w.cum = 10000*60*0.9; w.rd.pi=300; b.tempAtRes=120; const sI=co2State(w); out.pImm=Math.round(sI.p); out.miscImm=sI.misc; w.cum=0; b.tempAtRes=60;
    // percée : après 36 mois le gain retombe, plancher à la moitié
    w.monthsActive=10+36+24; out.fade=co2State(w).phase; w.monthsActive=10+100; out.floor=co2State(w).phase; w.monthsActive=10;
    // économie : production et coût du CO2
    const eco1=wellEconomicsRaw(w); out.prodUp=eco1.prodEffective/eco0.prodEffective; out.costUp=eco1.fluidCost-eco0.fluidCost; out.expectCost=10000*0.22*7*co2Price();
    // WAG : percée retardée avec maintien de pression
    w.maint=true; out.btWag=co2State(w).bt; w.maint=false; out.bt=co2State(w).bt;
    // soutien de pression : la pression chute moins avec CO2
    w.cum=10000*30; w.co2=null; const pNo=pressureFrac(w); w.co2={since:10}; const pCo=pressureFrac(w); out.pNo=pNo; out.pCo=pCo;
    // conditions d'accès
    w.co2=null; out.elig=co2Eligible(w); w.offshore=true; out.eligOff=!!co2Eligible(w); w.offshore=false; w.rd.mech='tight'; out.eligTight=!!co2Eligible(w); w.rd.mech='solgas'; b.topOfReservoir=500; out.eligShallow=!!co2Eligible(w); b.topOfReservoir=1500;
    // achat et arrêt
    const bud=G.budget; co2Buy(b.id); out.bought=!!w.co2; out.paid=bud-G.budget; co2Stop(b.id); out.stopped=!w.co2; b.well=null; return out; });
  ok(r.miscible===true && Math.abs(r.boostSol-1.22)<1e-6,'sous la MMP exclue, un gaz dissous gagne 22 % en miscible '+r.boostSol);
  ok(Math.abs(r.boostCap-(1+0.22*0.7))<1e-6 && Math.abs(r.boostAq-(1+0.22*0.4))<1e-6,'chapeau de gaz 70 %, aquifère 40 % du gain '+r.boostCap+' / '+r.boostAq);
  ok(r.miscImm===false && r.pImm<183,'réservoir épuisé : sous la MMP, l\'injection devient immiscible (pression '+r.pImm+' bar)');
  ok(r.fade<1 && Math.abs(r.floor-0.5)<1e-6,'percée : le gain retombe puis plafonne à la moitié '+r.fade+' / '+r.floor);
  ok(Math.abs(r.prodUp-1.22)<0.001 && Math.abs(r.costUp-r.expectCost)/r.expectCost<0.01,'économie : +22 % de production et CO2 payé au Mcf par baril supplémentaire '+r.prodUp+' / '+Math.round(r.costUp)+' vs '+Math.round(r.expectCost));
  ok(r.btWag===r.bt+12,'WAG : le maintien de pression retarde la percée de 12 mois '+r.bt+' → '+r.btWag);
  ok(r.pCo>r.pNo,'le CO2 soutient la pression '+r.pNo.toFixed(3)+' → '+r.pCo.toFixed(3));
  ok(r.elig===null && r.eligOff && r.eligTight && r.eligShallow,'conditions : à terre, huile, hors shale, assez profond');
  ok(r.bought && Math.round(r.paid)===2000000 && r.stopped,'achat à 2,0 M$ puis arrêt');
  // quiz : le gabarit CO2 apparaît et sa réponse est recalculée
  const q = await pg.evaluate(()=>{ let n=0,bad=0; const num=t=>parseFloat(String(t).replace(/\s/g,'').replace('−','-').replace(',','.').replace(/[^\d.\-]/g,'')); for(let i=0;i<200;i++){ window.__qz.qzGenFluids().filter(x=>x.kind==='fluide-co2').forEach(x=>{ n++; if(x.facts.length===3){ const T=num(x.facts[0][1]), api=num(x.facts[1][1]), p=num(x.facts[2][1]); const mm=co2Mmp({tempAtRes:T},{api}); if((p>=mm)!==(x.correct===1)) bad++; } else { const price=num(x.facts[0][1]), util=num(x.facts[1][1]), cp=num(x.facts[2][1]); const mg=price-10-util*cp; if(Math.abs(num(x.choices[x.correct])-mg)>0.6) bad++; } }); } return {n,bad}; });
  ok(q.n>=50 && q.bad===0,'quiz fluides : gabarit CO2 (miscibilité et marge) recalculé '+JSON.stringify(q));
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
