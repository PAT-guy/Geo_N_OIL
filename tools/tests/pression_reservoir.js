// Pression de réservoir et mécanismes de drainage (V4.98) : gaz dissous, chapeau de gaz, aquifère actif ; pression relative selon le cumul, GOR qui monte, déclin initial par mécanisme
// (neutre en moyenne), maintien de pression par réinjection d'eau, mécanisme déduit après 18 mois, contact eau-huile, absence en Découverte, anciens puits inchangés.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1280,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const R = await pg.evaluate(async()=>{ const o={}; document.getElementById('geoSeed').value='2468'; menuConfig.mode='junior'; menuConfig.basinType='aquitaine'; menuConfig.gridSize=12; menuConfig.offshore=false; labOptLaunch(); await new Promise(r=>setTimeout(r,1000)); setSpeed(0); LABOPT.pick=false;
    G.budget=1e9; G.price=80; checkEndConditions=function(){}; let land=blocks.filter(b=>!b.inSalt&&!b.isOffshore);
    // 1. mécanismes : déterminisme, répartition, neutralité du déclin
    const base=projectWell(3000,80,false,false,0,120).cum; let det=true, sum=0, n=0; const cnt={solgas:0,gascap:0,aquifer:0};
    for(let k=0;k<3;k++){ generateGeology(12,['aquitaine','rift','passive'][k],false,k*97+3); G.seedNum=k; blocks.forEach(b=>{ if(b.inSalt||b.isOffshore||b.isGas) return; const fp=fluidParams(b,false), d=driveParams(b,fp,false), d2=driveParams(b,fp,false); if(d.mech!==d2.mech) det=false; cnt[d.mech]++; sum+=projectWell(3000,80,false,false,0,120,{Di:DECL.Di*DRIVE[d.mech].di,b:DECL.b}).cum/base; n++; }); }
    land=blocks.filter(b=>!b.inSalt&&!b.isOffshore); o.det=det; o.mix=Object.fromEntries(Object.entries(cnt).map(([k,v])=>[k,+(v/n).toFixed(2)])); o.mixOk = Object.values(cnt).every(v=>v/n>0.05); o.neutral = Math.abs(sum/n-1)<0.03; o.neutralV=+(sum/n).toFixed(3);
    // 2. pression : plus le mécanisme est actif, plus elle chute vite ; le maintien la ralentit
    const mk=(mech,extra)=>({blockId:land[3].id,cost:5e6,offshore:false,production:2000,comps:[{q0:2000,t0:0}],monthsActive:30,cum:2000*40,status:'producing',isGas:false,eorActive:false,eorMonthsLeft:0,wp:{kind:'conv',b0:.05,tb:20,bmax:.8},fp:{kind:'oil',api:32,sulfur:0.5,gor:800},rd:{mech,pi:200},...extra});
    const pS=pressureFrac(mk('solgas')), pG=pressureFrac(mk('gascap')), pA=pressureFrac(mk('aquifer')), pM=pressureFrac(mk('solgas',{maint:true})); o.press = pS<pG && pG<pA && pM>pS && pS>=0.12 && pA<=1; o.pv=[pS,pG,pA,pM].map(x=>+x.toFixed(2));
    o.old = pressureFrac({production:1000}) === 1;
    // 3. GOR : monte sous la pression de bulle (gaz dissous) et avec le chapeau, constant avec l'aquifère
    const gS=gorNow(mk('solgas')), gG=gorNow(mk('gascap')), gA=gorNow(mk('aquifer')); o.gor = gS>800*1.3 && gG>800*1.1 && gA===800; o.gv=[gS,gG,gA].map(Math.round);
    const wS=mk('solgas'); const eS=wellEconomicsRaw(wS); o.econGor = Math.abs(eS.assocMcf - eS.prodEffective*gS/1000)<1e-6;
    // 4. maintien de pression : coût, eau réinjectée, +15 % pour le gaz dissous, refus sans eau, refus deux fois, refus en frac
    const b1=land[3]; const wM=mk('solgas'); wM.blockId=b1.id; G.wells=[wM]; b1.well=wM; const bud=G.budget, e0=wellEconomicsRaw(wM); maintBuy(b1.id);
    const e1=wellEconomicsRaw(wM); o.maintP=[wM.maint, bud-G.budget, e1.prodEffective/e0.prodEffective, waterUnit(wM)]; o.maint = wM.maint===true && Math.abs((bud-G.budget)-MAINT.capex)<1 && Math.abs(e1.prodEffective/e0.prodEffective-1.15)<1e-9 && Math.abs(waterUnit(wM)-MAINT.inject)<1e-9;
    const b2=land[4]; const wD=mk('aquifer',{blockId:b2.id, wp:null}); G.wells=[wD]; b2.well=wD; const b2bud=G.budget; maintBuy(b2.id); o.noWater = !wD.maint && G.budget===b2bud;
    const bud3=G.budget; maintBuy(b1.id); o.twice = G.budget===bud3;
    const wT=mk('tight',{blockId:land[5].id}); G.wells=[wT]; blocks[wT.blockId].well=wT; const bud4=G.budget; maintBuy(wT.blockId); o.tight = !wT.maint && G.budget===bud4;
    // 5. mécanisme déduit : trop tôt, puis après 18 mois selon pression, GOR et BSW
    const e=mk('solgas',{monthsActive:10}); o.early = driveGuess(e)===null; const gs=mk('solgas',{monthsActive:30,cum:2000*55}), gg=mk('gascap',{monthsActive:30,cum:2000*60}), ga=mk('aquifer',{monthsActive:30,cum:2000*50, wp:{kind:'conv',b0:.3,tb:5,bmax:.8}});
    o.guess=[driveGuess(gs), driveGuess(gg), driveGuess(ga)]; o.guessOk = o.guess[0]==='solgas' && o.guess[1]==='gascap' && o.guess[2]==='aquifer';
    // 6. création au forage : mécanisme, pression initiale en bar, cumul qui augmente
    G.wells=[]; G.drilling=[]; blocks.forEach(b=>{b.well=null;b.dryHole=false;}); const flush=()=>{ [drillRevealCur, ...drillRevealQueue].forEach(it=>{ try{ drillRevealFlush(it); }catch(e){} }); drillRevealQueue.length=0; drillRevealPlaying=false; drillRevealBatch=[]; drillRevealRecapOpen=false; document.getElementById('drillRevealModal')?.classList.remove('open'); };
    let made=null; for(const c of land.slice(0,60)){ c.studyLevel=3; if(!c.estimate) c.estimate={structPos:0}; const p=drillPlan(c,'vertical'); if(!p||!p.equip) continue; drillBlock(c.id,'vertical',p.equip,null); for(let i=0;i<24 && G.drilling.some(d=>d.blockId===c.id); i++) monthTick(); flush(); if(c.well){ made=c.well; break; } }
    o.madeP=made?JSON.stringify([made.rd,!!made.comps[0].dc,made.status]):'none'; o.made = !!made && !!made.rd && made.rd.pi>0 && ['solgas','gascap','aquifer','gasdep'].includes(made.rd.mech); if(made){ const c0=made.cum; const m0=made.monthsActive; monthTick(); o.cum = made.cum>c0 || made.status!=='producing'; o.dc = made.rd.mech==='gasdep' || (made.comps[0].dc && Math.abs(made.comps[0].dc.Di-DECL.Di*DRIVE[made.rd.mech].di)<1e-12); }
    // 7. panneau
    const wp=mk('solgas',{monthsActive:30}); wp.blockId=land[8].id; G.wells=[wp]; blocks[wp.blockId].well=wp; selectedBlock=wp.blockId; renderStudiesPanel(blocks[wp.blockId]); const sp=document.getElementById('studiesContent').textContent; o.rows=/Pression du réservoir/.test(sp)&&/GOR actuel/.test(sp)&&/Contact eau-huile/.test(sp)&&/Mécanisme de drainage/.test(sp)&&/Maintenir la pression/.test(sp);
    return o; });
  ok(R.det && R.mixOk, 'mécanismes déterministes par bloc, les trois présents '+JSON.stringify(R.mix));
  ok(R.neutral, 'le déclin par mécanisme est neutre en moyenne (cumul relatif '+R.neutralV+')');
  ok(R.press && R.old, 'pression : gaz dissous < chapeau de gaz < aquifère, le maintien la soutient '+JSON.stringify(R.pv));
  ok(R.gor && R.econGor, 'GOR : monte avec le gaz dissous et le chapeau, constant avec l\'aquifère, et alimente le gaz associé '+JSON.stringify(R.gv));
  ok(R.maint && R.noWater && R.twice && R.tight, 'maintien de pression : 1,2 M$, eau réinjectée à 0,8 $/bbl, +15 % en gaz dissous ; refusé sans eau, deux fois, en frac');
  ok(R.early && R.guessOk, 'mécanisme déduit seulement après 18 mois (gaz dissous, chapeau de gaz et aquifère reconnus) '+JSON.stringify(R.guess));
  ok(R.made && R.cum && R.dc, 'un puits créé au forage porte son mécanisme, sa pression initiale et son déclin ; le cumul augmente');
  ok(R.rows, 'panneau du puits : pression, GOR, contact eau-huile, mécanisme et bouton de maintien');
  const D = await pg.evaluate(async()=>{ menuConfig.mode='decouverte'; document.getElementById('geoSeed').value='808'; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); setSpeed(0); G.budget=1e9; let w=null; const land=blocks.filter(x=>!x.inSalt); for(const c of land.slice(0,40)){ c.studyLevel=3; if(!c.estimate) c.estimate={structPos:0}; const p=drillPlan(c,'vertical'); if(!p||!p.equip) continue; drillBlock(c.id,'vertical',p.equip,null); for(let i=0;i<30 && G.drilling.some(d=>d.blockId===c.id); i++) monthTick(); if(c.well){ w=c.well; break; } } return { rd: w ? w.rd : 'nowell', dc: w ? !!w.comps[0].dc : null }; });
  ok(D.rd===null || D.rd==='nowell', 'Découverte : aucun mécanisme de drainage, déclin d\'origine'); ok(!D.dc, 'Découverte : déclin sans modification');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
