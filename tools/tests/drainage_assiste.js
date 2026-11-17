// Drainage assisté (V5.16) : EOR, injection de CO2 et réinjection du gaz associé se lancent depuis l'onglet Gisements ; réinjection : gain selon le mécanisme, gaz ni vendu ni brûlé, recompression payée, exclusivité avec le CO2, conditions d'accès.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1300,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  await pg.evaluate(async()=>{ document.getElementById('geoSeed').value='2024'; menuConfig.mode='junior'; menuConfig.basinType='paris'; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); setSpeed(0); G.budget=80e6; G.advOn=true; G.financeMode=true; });
  const r = await pg.evaluate(()=>{
    const b=blocks.find(x=>!x.inSalt && !x.isOffshore && !x.well && x.topOfReservoir>=900); b.tempAtRes=60;
    const mk=(mech,gor)=>({ blockId:b.id, status:'producing', method:'vertical', production:10000, comps:[{q0:10000,t0:0}], monthsActive:10, cum:0, offshore:false, fp:{kind:'oil',api:30,sulfur:0.5,gor}, rd:{mech, pi:300}, wp:null, isGas:false, eorActive:false, eorMonthsLeft:0 });
    const out={}; b.well=mk('solgas',800); const w=b.well; G.wells.push(w);
    const e0=wellEconomicsRaw(w);
    // fiche Gisements : trois boutons de drainage assisté
    renderGisementsPanel(); const html=document.getElementById('gisementsContent').innerHTML;
    out.btnEor=/drainTap\(\d+,'eor'\)/.test(html); out.btnCo2=/drainTap\(\d+,'co2'\)/.test(html); out.btnGas=/drainTap\(\d+,'gas'\)/.test(html); out.noStack=!/onclick="co2Buy|onclick="gasInjBuy|onclick="activateEOR/.test(html);
    // gain selon le mécanisme
    w.gasInj={since:10}; out.bSol=gasInjBoost(w); w.rd.mech='gascap'; out.bCap=gasInjBoost(w); w.rd.mech='aquifer'; out.bAq=gasInjBoost(w); w.rd.mech='solgas';
    // économie : +10 %, gaz ni vendu ni brûlé, recompression payée
    const e1=wellEconomicsRaw(w); out.prodUp=e1.prodEffective/e0.prodEffective; out.gasRev1=e1.gasRev; out.cost1=e1.fluidCost; out.expectCost=e1.assocMcf*GASINJ.compress; out.mcf=e1.assocMcf;
    // pression soutenue
    w.cum=10000*30; w.gasInj=null; const pNo=pressureFrac(w); w.gasInj={since:10}; const pGas=pressureFrac(w); out.pNo=pNo; out.pGas=pGas; w.gasInj=null; w.cum=0;
    // conditions d'accès
    out.elig=gasInjEligible(w); w.offshore=true; out.eOff=!!gasInjEligible(w); w.offshore=false; w.rd.mech='tight'; out.eTight=!!gasInjEligible(w); w.rd.mech='solgas';
    w.fp.gor=20; out.eGor=!!gasInjEligible(w); w.fp.gor=800;
    // exclusivité avec le CO2
    w.co2={since:10}; out.eCo2=!!gasInjEligible(w); w.co2=null;
    // achat et arrêt
    const bud=G.budget; gasInjBuy(b.id); out.bought=!!w.gasInj; out.paid=bud-G.budget; gasInjStop(b.id); out.stopped=!w.gasInj;
    // EOR depuis Gisements
    const b2=G.budget; activateEOR(b.id); out.eorOn=w.eorActive; out.eorPaid=b2-G.budget; renderGisementsPanel(); out.eorRow=/EOR/.test(document.getElementById('gisementsContent').innerHTML) && !/activateEOR\(/.test(document.getElementById('gisementsContent').innerHTML);
    // le bloc EOR a quitté le panneau Finance
    renderFinancePanel(); out.finEor=/activateEOR\(/.test(document.getElementById('financeContent').innerHTML);
    G.wells.pop(); b.well=null; return out; });
  ok(r.btnEor && r.btnCo2 && r.btnGas && r.noStack,'fiche Gisements : pastilles EOR, CO2 et Gaz à côté du puits, plus de boutons empilés '+JSON.stringify([r.btnEor,r.btnCo2,r.btnGas,r.noStack]));
  ok(r.bSol===1.10 && r.bCap===1.12 && r.bAq===1.02,'gain de réinjection : gaz dissous 10 %, chapeau 12 %, aquifère 2 %');
  ok(Math.abs(r.prodUp-1.10)<1e-6 && r.gasRev1===0 && Math.abs(r.cost1-r.expectCost)<1,'économie : +10 %, gaz ni vendu ni brûlé, recompression '+Math.round(r.cost1)+' $ pour '+Math.round(r.mcf)+' Mcf');
  ok(r.pGas>r.pNo,'la réinjection soutient la pression '+r.pNo.toFixed(3)+' → '+r.pGas.toFixed(3));
  ok(r.elig===null && r.eOff && r.eTight && r.eGor && r.eCo2,'conditions : à terre, huile, hors shale, assez de gaz, pas de CO2 en parallèle');
  ok(r.bought && Math.round(r.paid)===1600000 && r.stopped,'achat à 1,6 M$ puis arrêt');
  ok(r.eorOn && r.eorPaid===500000 && r.eorRow,'EOR lancé depuis Gisements (500 k$), puis affiché comme actif');
  const fl = await pg.evaluate(()=>{ const b=blocks.find(x=>!x.inSalt && !x.isOffshore && !x.well && x.topOfReservoir>=900); b.tempAtRes=60; const w={ blockId:b.id, status:'producing', method:'vertical', production:10000, comps:[{q0:10000,t0:0}], monthsActive:10, cum:0, offshore:false, fp:{kind:'oil',api:30,sulfur:0.5,gor:800}, rd:{mech:'solgas', pi:300}, wp:null, isGas:false, eorActive:false, eorMonthsLeft:0, cost:3e6 }; b.well=w; G.wells.push(w); const out={};
    renderGisementsPanel(); out.n=document.querySelectorAll('#gisementsContent .drain-ic').length;
    const bud=G.budget; drainTap(b.id,'gas'); out.modal=document.getElementById('confirmModal').classList.contains('open'); out.title=document.getElementById('confirmTitle').textContent; out.paid0=bud-G.budget;
    document.getElementById('confirmYes').click(); out.gasOn=!!w.gasInj; out.paid=bud-G.budget; renderGisementsPanel(); out.onClass=!!document.querySelector('#gisementsContent .drain-ic.on');
    drainTap(b.id,'co2'); out.co2Blocked=!w.co2; document.getElementById('confirmModal').classList.remove('open');
    drainTap(b.id,'gas'); out.stopAsk=/Arrêter|Stop/.test(document.getElementById('confirmTitle').textContent); document.getElementById('confirmYes').click(); out.gasOff=!w.gasInj;
    w.offshore=true; renderGisementsPanel(); out.offN=document.querySelectorAll('#gisementsContent .drain-ic').length; w.offshore=false;
    G.wells.pop(); b.well=null; return out; });
  ok(fl.n===3 && fl.modal && fl.paid0===0 && /gaz|gas/i.test(fl.title),'pastilles : un toucher ouvre une confirmation avec le coût, rien n\'est payé avant '+JSON.stringify([fl.n,fl.modal,fl.paid0]));
  ok(fl.gasOn && fl.paid===1600000 && fl.onClass,'confirmer lance la réinjection (1,6 M$) et la pastille devient active');
  ok(fl.co2Blocked && fl.stopAsk && fl.gasOff,'CO2 refusé quand le gaz est actif ; un second toucher demande confirmation pour arrêter');
  ok(fl.offN===1,'puits en mer : seul l\'EOR reste proposé '+fl.offN);
  ok(!r.finEor,'plus de bouton EOR dans le panneau Finance');
  // quiz : gabarit réinjecter ou vendre, recalculé
  const q = await pg.evaluate(()=>{ let n=0,bad=0; const num=t=>parseFloat(String(t).replace(/\s/g,'').replace('−','-').replace(',','.').replace(/[^\d.\-]/g,'')); const boosts={'gaz dissous':1.10,'chapeau de gaz':1.12,'aquifère actif':1.02}; for(let i=0;i<200;i++){ window.__qz.qzGenFluids().filter(x=>x.kind==='fluide-gasinj').forEach(x=>{ n++; const bo=boosts[x.facts[0][1]]-1, prod=num(x.facts[1][1]), price=num(x.facts[2][1]), mcf=num(x.facts[3][1]), net=num(x.facts[4][1]); const gain=bo*prod*(price-10)-mcf*0.4, sale=mcf*net; if((gain>sale)!==(x.correct===1)) bad++; }); } return {n,bad}; });
  ok(q.n>=50 && q.bad<=Math.round(q.n*0.02),'quiz fluides : gabarit « réinjecter ou vendre » recalculé '+JSON.stringify(q));
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
