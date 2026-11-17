// Mesure (sans verdict) : un joueur automatique qui suit le guide joue des parties complètes. Sert à regarder le taux de victoire, la valeur nette finale et le poids des pannes de matériel dans les échecs.
// Usage : node tools/tests/sim_equilibrage.js [mode] [nombre de parties] [stratégie]   (modes : decouverte, junior, expert ; défaut decouverte 40)
// Stratégies : base (défaut : production avancée selon le mode), frac (sondage + carotte + Rock-Eval puis frac), prog (option Dimensionner le forage), fracprog (les deux),
// noadv (production avancée forcée à off), adv (forcée à on, sans leviers), advlev (forcée à on, le joueur joue les leviers : SWD, unité de gaz, maintien de pression). Se combinent : fracadvlev, etc.
const { chromium } = require('playwright'); const path = require('path');
const MODE = process.argv[2] || 'decouverte', N = parseInt(process.argv[3] || '40', 10), STRAT_BOT = process.argv[4] || 'base', OFF = parseInt(process.argv[5] || '0', 10);
(async()=>{ const br = await chromium.launch(); const pg = await br.newPage(); const errs = [];
  pg.on('pageerror', e=>errs.push(e.message));
  await pg.addInitScript(()=>{ try{ localStorage.setItem('geoexplorer_tutorialSeen','1'); localStorage.setItem('geoexplorer_played','1'); }catch(e){} });
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(400);
  const res = await pg.evaluate(async ([mode, n, strat, OFF, BASINX])=>{
    const out = [];
    for(let s=1; s<=n; s++){
      menuConfig.mode = mode; menuConfig.daily = null; menuConfig.seed = (s+OFF)*97+5;
      if(mode==='decouverte'){ menuConfig.basinType='paris'; menuConfig.gridSize=8; menuConfig.offshore=false; menuConfig.financeMode=false; LABOPT = labNormOpt({ ...LAB_DEFAULT_OPT, ...LAB_PRESETS.decouverte.o, cheat:false, finance:false }); }
      else { menuConfig.basinType = BASINX || ['paris','rift','aquitaine','passive'][s%4]; menuConfig.gridSize = 12; menuConfig.offshore = false; menuConfig.financeMode = true; LABOPT = labNormOpt({ ...LAB_DEFAULT_OPT, ...LAB_PRESETS.decouverte.o, finance:true }); }
      LABOPT.rigprog = /prog/.test(strat); LABOPT.advfluids = /noadv/.test(strat) ? false : /adv/.test(strat) ? true : !!LAB_MODE_ADV[mode]; document.getElementById('menu').classList.add('hidden'); startGame(); setSpeed(0);
      const m = MODES[G.mode], maxM = (m.maxYears||25)*12; let ended = null, guard = 0;
      const flush = ()=>{ [drillRevealCur, ...drillRevealQueue].forEach(it=>{ try{ drillRevealFlush(it); }catch(e){} }); drillRevealQueue.length = 0; drillRevealPlaying = false; drillRevealBatch = []; drillRevealRecapOpen = false; document.getElementById('drillRevealModal')?.classList.remove('open'); };
      while(!ended && G.month < maxM + 2 && guard++ < 5000){
        for(let k=0;k<4;k++){ const g = guideCompute(); if(!g || !g.act || !g.act.ok) break; try{
          const call = g.act.call;
          if(/guideDo\('section'\)/.test(call)){ const c = blocks.filter(b=>!b.inSalt).sort((u,w)=>(w.estimate?.structPos??-1)-(u.estimate?.structPos??-1)); const A = c[0], B = c.find(x=>x.id!==A.id && Math.hypot(x.x-A.x,x.y-A.y)>=2 && Math.hypot(x.x-A.x,x.y-A.y)<=4) || c[1]; G.sectionA = A.id; G.sectionB = B.id; secRemember(A.id, B.id); setTool('select'); renderSection(); }
          else if(/guideDo\('drill',(\d+)\)/.test(call)){ const id = +/guideDo\('drill',(\d+)\)/.exec(call)[1], b = blocks[id], pl = drillPlan(b,'vertical'); if(!pl || !pl.equip) break; drillBlock(id,'vertical',pl.equip,b.playerEst, LABOPT.rigprog ? progAuto(b, Math.round(progTrueTD(b,'vertical')/10)*10) : undefined); }
          else if(/guideDo\('strati',(\d+)\)/.test(call)){ launchStrati(+/guideDo\('strati',(\d+)\)/.exec(call)[1]); }
          else if(/guideDo\('frac',(\d+)\)/.test(call)){ const id = +/guideDo\('frac',(\d+)\)/.exec(call)[1], b = blocks[id], pl = drillPlan(b,'frac'); if(!pl || !pl.equip) break; drillBlock(id,'frac',pl.equip,null, LABOPT.rigprog ? progAuto(b, Math.round(progTrueTD(b,'frac')/10)*10) : undefined); }
          else (0, eval)(call);
        }catch(e){ break; } flush(); }
        if(G.advOn && /lev/.test(strat)){ try{
          const prod = G.wells.filter(w=>w.status==='producing'), ws = waterState(), gs = gasState();
          const waterMonth = prod.reduce((a,w)=>a + (w.offshore ? 0 : wellEconomics(w).waterBbl), 0);
          if(!ws.swd && waterMonth*(WATER.truck-WATER.swd)*36 > WATER.swdCapex*1.3 && G.budget > WATER.swdCapex + 2e6) waterBuild('swd');
          const mcf = prod.reduce((a,w)=>a + wellEconomics(w).assocMcf, 0);
          if(!gs.plant && mcf*gasNetPrice()*36 > FLUID.gasPlantCapex*1.3 && G.budget > FLUID.gasPlantCapex + 2e6) gasBuild();
          for(const w of prod){ if(!w.maint && !w.offshore && driveGuess(w)==='solgas' && wellEconomics(w).waterBbl >= MAINT.minWater){ const gain = (DRIVE.solgas.boost-1)*w.production*(G.price-14)*36; if(gain > MAINT.capex*1.3 && G.budget > MAINT.capex + 2e6){ maintBuy(w.blockId); break; } } }
        }catch(e){} }
        if(!G.simple && G.infraOn){ try{ const st = infraState(); if(infraFactor() < 0.97){ const L = infraLoad(); if(L.liquid > L.procCap*0.97 && st.proc < INFRA.procCap.length-1 && G.budget > INFRA.procCapex[st.proc+1] + 2e6) infraUpgradeProc(); else if(L.oil > L.routeCap*0.97 && st.pipe < INFRA.pipeCap.length-1 && G.budget > INFRA.pipeCapex[st.pipe+1] + 2e6) infraBuildPipe(); } }catch(e){} }
        if(/frac/.test(strat) && !G.simple){ try{
          const free = b=>!b.inSalt && !b.isOffshore && !b.well && !b.dryHole && !G.drilling.some(d=>d.blockId===b.id);
          // 1) frac sur un bloc dont la Rock-Eval est favorable et dont la frac se rembourse en moins de 30 mois
          const ready = blocks.filter(b=>free(b) && b.studies.some(x=>x.type==='rockeval'));
          for(const b of ready){ const se = shaleEstimate(b); if(!se.ok) continue; const pl = drillPlan(b,'frac'); if(!pl || !pl.equip || G.budget < pl.cost + 2e6) continue;
            const ip = fracProdOf(se.q, se.thick, 2000, b), pj = projectWell(ip, G.price, false, !!b.estimate?.isGas, pl.cost, 120, SHALE_DECL); if(pj.payback===null || pj.payback>30) continue;
            drillBlock(b.id,'frac',pl.equip,null, LABOPT.rigprog ? progAuto(b, Math.round(progTrueTD(b,'frac')/10)*10) : undefined); flush(); break; }
          // 2) Rock-Eval sur un sondage avec carotte
          for(const b of blocks){ if(free(b) && b.strati && !b.studies.some(x=>x.type==='core')){ performStudy(b.id,'core'); break; } }
          for(const b of blocks){ if(free(b) && b.strati && b.studies.some(x=>x.type==='core') && !b.studies.some(x=>x.type==='rockeval')){ performStudy(b.id,'rockeval'); break; } }
          // 3) un nouveau sondage tant qu'il y en a moins de 3 en attente et que le budget le permet
          const pend = blocks.filter(b=>b.strati && free(b) && !b.studies.some(x=>x.type==='rockeval') ).length + G.drilling.filter(d=>d.method==='strati').length;
          if(pend < 2 && G.budget > 6e6 && G.month < 60){ const c = blocks.filter(b=>free(b) && !b.strati && b.studyLevel>=1 && !G.drilling.some(d=>d.blockId===b.id)).sort((u,w)=>(w.estimate?.structPos??-1)-(u.estimate?.structPos??-1))[pend+1] || null; if(c){ launchStrati(c.id); flush(); } }
        }catch(e){} }
        monthTick(); flush();
        if(document.getElementById('endScreen').style.display==='flex'){ ended = true; }
      }
      const dry = blocks.filter(b=>b.dryHole && b.dryHoleInfo), tech = dry.filter(b=>b.dryHoleInfo.techFail).length;
      const dr = [...G.wells.map(w=>blocks[w.blockId]), ...dry.map(x=>x)]; const tp = dr.length ? dr.reduce((t,b)=>t+b.trueProbability,0)/dr.length : 0, ep = dr.filter(b=>b.estAtDrill&&b.estAtDrill.p!=null); out.push({ tp, ep: ep.length? ep.reduce((t,b)=>t+b.estAtDrill.p,0)/ep.length : null, s, win: netWorth()>=m.winGoal && m.winGoal>0, nw: Math.round(netWorth()/1e5)/10, wells: G.wells.length, dry: dry.length, tech, months: G.month });
      document.getElementById('endScreen').style.display = 'none';
    }
    return out; }, [MODE, N, STRAT_BOT, OFF, process.env.BASIN || '']);
  const n = res.length, wins = res.filter(r=>r.win).length, dry = res.reduce((t,r)=>t+r.dry,0), tech = res.reduce((t,r)=>t+r.tech,0), wells = res.reduce((t,r)=>t+r.wells,0);
  const nws = res.map(r=>r.nw).sort((a,b)=>a-b);
  console.log(JSON.stringify({ mode:MODE, parties:n, victoires:wins, tauxVictoire:Math.round(wins/n*100)+' %', valeurNetteMediane:nws[Math.floor(n/2)]+' M$', pire:nws[0], meilleure:nws[n-1], puitsProductifsParPartie:+(wells/n).toFixed(1), puitsSecsParPartie:+(dry/n).toFixed(1), pannesMaterielParmiSecs: dry ? Math.round(tech/dry*100)+' %' : 'n/a', probaVraieMoyenneDesForages:+(res.reduce((t,r)=>t+r.tp,0)/n).toFixed(2), probaAnnonceeMoyenne:+(res.filter(r=>r.ep!=null).reduce((t,r)=>t+r.ep,0)/Math.max(1,res.filter(r=>r.ep!=null).length)).toFixed(2), moisMoyens: Math.round(res.reduce((t,r)=>t+r.months,0)/n) }));
  console.log('erreurs', JSON.stringify(errs.slice(0,3)));
  await br.close(); })();
