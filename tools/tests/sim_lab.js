// Simulation d'équilibrage du labo : parties de 25 ans jouées par des robots, sans interface.
// Usage : node sim_lab.js <parties> <préréglages> <stratégies> [<mode>]
//   5e argument facultatif : objectif de victoire en M$ (par défaut celui du niveau) ; 6e : multiplicateur du coût des études ; 7e : multiplicateur du coût des forages ; 8e : multiplicateur de production d'un puits vertical ; 9e : JSON d'options (offshore, uncertainty, budget en M$, years, probMult, price)
//   préréglages : decouverte,inter,complet,expert (suffixes -nodhi, -nopick, -nocal, -noreal pour couper une règle)      stratégies : oracle,sism100,sism60,sism30,random
//   guide / guideNN = joueur docile qui exécute à chaque étape l'action recommandée par le guide du jeu (NN % de bonnes cibles)
//   sismNN = joueur qui étudie (2D + 3D) puis fore les meilleurs blocs, avec NN % de chances de désigner le bon horizon
//   (après un puits manqué, il apprend le bon horizon grâce au log). oracle = connaît les vraies valeurs.
const { chromium } = require('playwright');
const [,, nGames='20', presets='decouverte,inter,complet', strategies='oracle,sism100,sism60,sism30,random', mode='junior', goalM='', studyMult='', drillMult='', prodMult='', extraJson=''] = process.argv;
const LABO = 'file://' + require('path').resolve(__dirname, '../../index.html');
(async()=>{
  const br = await chromium.launch(); const pg = await br.newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(LABO);
  const res = await pg.evaluate(({nGames,presets,strategies,mode,goalM,studyMult,drillMult,prodMult,extraJson})=>{
    const EX = extraJson ? JSON.parse(extraJson) : {};
    document.getElementById('tutorialModal').style.display='none';
    let ended=null;
    ['updateHud','renderBlock','drawSparkline','renderGeoPanel','renderStudiesPanel','renderSection','renderFinancePanel','addLog','toast','showDrillReveal','buildDebriefReport','renderGuide'].forEach(n=>{ window[n]=()=>{}; });
    window.showEnd = (r)=>{ ended=r; };
    const mulberry = (a)=>()=>{ a=(a+0x6D2B79F5)|0; let t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return((t^(t>>>14))>>>0)/4294967296; };
    const realRandom = Math.random;
    const lifetimeValue = (prod0, price, offshore, gas)=>{
      const fixed=offshore?OFFSHORE_OPEX:8000, varOp=(offshore?14:4)+6; const pr = gas?price*.18:price; let v=0;
      for(let m=0;m<400;m++){ const p=prod0*declineFactor(m); const net=p*pr - fixed - p*varOp; if(net<=0 || p<5) break; v+=net; }
      return v;
    };
    const bestDrill = (b, pEst, qEst, useTrue)=>{
      const depth = useTrue ? b.topOfReservoir : drillDepthEstimate(b);
      const res = b.horizons.find(l=>l.role==='reservoir');
      const th = useTrue ? (res?.thicknessLocal||0) : (STRAT.find(l=>l.role==='reservoir')?.thickness||40);
      const prod0 = (qEst/100)*th*PROD_BASE*METHODS.vertical.prodMult*prodSite(b);
      const V = lifetimeValue(prod0, G.price, b.isOffshore, useTrue ? b.isGas : false);
      let best=null;
      Object.entries(EQUIPMENT).forEach(([k,eq])=>{
        if(depth>eq.maxDepth) return;
        const cost = depth*eq.costM*(b.isOffshore?OFFSHORE_COST_MULT:1);
        const ev = pEst*eq.reliability*V - cost;
        if(!best || ev>best.ev) best={equip:k, cost, ev, V};
      });
      return best;
    };
    const play = (preset, strat, seed)=>{
      ended=null;
      Math.random = mulberry(seed*7919+13);
      const [base, ...flags] = preset.split('-'); const o = { ...LAB_PRESETS[base].o }; flags.forEach(f=>{ if(f.startsWith('no')) o[f.slice(2)] = false; });
      LABOPT = labNormOpt(o);
      menuConfig.seed=seed; menuConfig.mode=mode; menuConfig.basinType='random'; menuConfig.offshore=true; menuConfig.gridSize = mode==='expedition' ? 30 : 12; if(EX.offshore!==undefined) menuConfig.offshore = EX.offshore; if(EX.budget) MODES[mode].budget = EX.budget*1e6; if(EX.years) MODES[mode].maxYears = EX.years; menuConfig.financeMode=false; menuConfig.uncertainty = EX.uncertainty || 'medium'; if(EX.reliab) Object.values(EQUIPMENT).forEach(e=>{ e.reliability = EX.reliab; }); if(EX.declMult && typeof DECL!=='undefined') DECL.Di = 0.015*EX.declMult; if(EX.offProd!==undefined) OFFSHORE_PROD_MULT = EX.offProd; if(EX.offCost!==undefined) OFFSHORE_COST_MULT = EX.offCost; if(EX.offOpex!==undefined) OFFSHORE_OPEX = EX.offOpex; if(EX.price0) G.price = EX.price0;
      if(goalM) MODES[mode].winGoal = +goalM*1e6;
      if(typeof ADV!=='undefined') ADV.studyCostMult = studyMult ? +studyMult : 1;
      if(typeof ADV!=='undefined') ADV.drillCostMult = drillMult ? +drillMult : 1;
      METHODS.vertical.prodMult = prodMult ? +prodMult : 1;
      _doStartGame(); setSpeed(0);
      if(EX.probMult) blocks.forEach(b=>{ b.trueProbability = Math.min(0.92, b.trueProbability*EX.probMult); });
      if(EX.price) G.price = EX.price;
      const resIdx = STRAT.findIndex(l=>l.role==='reservoir');
      const acc = strat.startsWith('guide') ? (/^guide\d+$/.test(strat) ? +strat.slice(5)/100 : 1) : strat==='sismB' ? 1 : strat.startsWith('sism') ? +strat.slice(4)/100 : strat==='oracle' ? 1 : 0;
      let learned = false;
      const choosePick = ()=> (learned || Math.random() < acc) ? resIdx : Math.floor(Math.random()*STRAT.length);
      if(LABOPT.pick) G.labPick = strat==='random' ? Math.floor(Math.random()*STRAT.length) : choosePick();
      const M = MODES[mode]; const budget0=M.budget; const maxMonths = M.maxYears*12;
      const st = {studySpend:0, drillSpend:0, drilled:0, missed:0, calBonus:0, pickBonus:0};
      performStudy(null,'gravity'); st.studySpend += budget0-G.budget;
      const reserve = 0.4e6;
      const studied3d = new Set();
      const canAfford = (c)=> G.budget - c >= reserve;
      const drillOne = (b, d)=>{
        const b0=G.budget; drillBlock(b.id,'vertical',d.equip); const paid=b0-G.budget;
        if(paid>0){ st.drillSpend+=paid; st.drilled++; if(LABOPT.pick && G.labPick!==resIdx) st.missed++; return true; } return false;
      };
      const undrilled = ()=>blocks.filter(b=>!b.well && !b.dryHole && !G.drilling.some(d=>d.blockId===b.id));
      // ---- joueur docile : suit le guide du jeu (guideCompute) à la lettre, comme un joueur qui clique toujours sur l'action proposée ----
      GUIDE_STUDY_CAP = strat.startsWith('guideOff') ? 1e9 : /^guideC\d+/.test(strat) ? +/^guideC(\d+)/.exec(strat)[1]/100 : 0.35;
      const usedLines = new Set(); const GSZ = G.gridSize;
      const chooseProfile = ()=>{ // le joueur trace la coupe à travers les blocs les plus hauts (ocre foncé), en évitant les lignes déjà tracées
        const lines = []; for(let k=0;k<GSZ;k++){ lines.push({key:'r'+k, a:blocks[k*GSZ], b:blocks[k*GSZ+GSZ-1]}); lines.push({key:'c'+k, a:blocks[k], b:blocks[(GSZ-1)*GSZ+k]}); }
        const score = ln => { const pb = getProfileBlocks(ln.a.id, ln.b.id); const v = pb.map(o=>o.b.estimate?.structPos).filter(x=>x!==undefined); return v.length ? v.reduce((x,y)=>x+y,0)/v.length : -9; };
        const best = lines.filter(l=>!usedLines.has(l.key)).sort((x,y)=>score(y)-score(x))[0]; if(!best) return false;
        usedLines.add(best.key); G.sectionA = best.a.id; G.sectionB = best.b.id; return true; };
      const guideStep = ()=>{
        const g = guideCompute(); if(!g || !g.act || !g.act.ok) return false;
        const m = /guideDo\('(\w+)'(?:,(\d+))?\)/.exec(g.act.call);
        if(m){ const [, kind, id] = m; const b0 = G.budget;
          if(kind==='gravity'){ performStudy(null,'gravity'); st.studySpend += b0-G.budget; return true; }
          if(kind==='section'){ if(G.budget < 2.5e6) return false; return chooseProfile(); }
          if(kind==='seismic2d'){ if(G.budget < 1.5e6) return false; performStudy(G.sectionA,'seismic2d'); st.studySpend += b0-G.budget; return G.budget < b0; }
          if(kind==='seismic3d'){ if(G.budget < 1.5e6) return false; performStudy(+id,'seismic3d'); st.studySpend += b0-G.budget; return G.budget < b0; }
          if(kind==='drill'){ const b = blocks[+id]; const depth = drillDepthEstimate(b); const equip = depth > EQUIPMENT.standard.maxDepth ? 'renforce' : 'standard'; return drillOne(b, {equip}); }
          return false; }
        if(g.act.call==='labGoSection()'){ if(LABOPT.pick && G.labPick==null){ G.labPick = choosePick(); return true; } return false; }
        const c = /labOpenCal\((\d+)\)/.exec(g.act.call); if(c){ const b = blocks[+c[1]]; if(labCalOk(b)) return false; G.labCal = G.labCal||{}; G.labCal[b.id] = true; G.budget += LAB_CAL_BONUS; st.calBonus += LAB_CAL_BONUS; return true; }
        return false; };

      const act = ()=>{
        let slots = 3 - G.drilling.length; if(slots<=0) return;
        const cand = undrilled();
        if(strat.startsWith('guide')){ for(let k=0;k<20;k++){ if(!guideStep()) break; } return; }
        if(strat==='random'){
          for(let k=0;k<slots;k++){ const b = cand[Math.floor(Math.random()*cand.length)]; if(!b) break;
            const d = bestDrill(b, 0.12, 50, false); if(!d || !canAfford(d.cost)) continue; drillOne(b,d); }
        } else if(strat==='gravite'){
          const sorted = cand.filter(b=>b.estimate?.structPos!==undefined).sort((a,z)=>z.estimate.structPos-a.estimate.structPos);
          for(const b of sorted){ if(slots<=0) break; const d=bestDrill(b,0.12,50,false); if(!d||!canAfford(d.cost)) continue; if(drillOne(b,d)) slots--; }
        } else if(strat==='oracle'){
          const scored = cand.map(b=>({b, d:bestDrill(b,Math.min(0.95,b.trueProbability*discoveryBoost(b)),b.trueQuality,true)})).filter(x=>x.d && canAfford(x.d.cost)).sort((a,z)=>z.d.ev-a.d.ev);
          for(const x of scored){ if(slots<=0) break; if(x.d.ev<=0) break; if(drillOne(x.b,x.d)) slots--; }
        } else {
          const done = cand.filter(b=>b.estimate?.prob!==undefined && b.studies.some(s=>s.type==='seismic3d'));
          const scored = done.map(b=>({b, d:bestDrill(b,b.estimate.prob,b.estimate.quality??50,false)})).filter(x=>x.d && x.d.ev>0 && canAfford(x.d.cost)).sort((a,z)=>z.d.ev-a.d.ev);
          for(const x of scored){ if(slots<=0) break; if(drillOne(x.b,x.d)) slots--; }
          if(st.studySpend < (strat==='sismB' ? 0.6 : 0.35)*budget0){
            const next = cand.filter(b=>b.estimate?.structPos!==undefined && !studied3d.has(b.id)).sort((a,z)=>z.estimate.structPos-a.estimate.structPos)[0];
            if(next){
              const c2 = STUDIES.seismic2d.cost*(next.isOffshore?STUDIES.seismic2d.offMult:1), c3 = STUDIES.seismic3d.cost*(next.isOffshore?STUDIES.seismic3d.offMult:1);
              if(canAfford(c2+c3+1.5e6)){ const b0=G.budget; G.sectionA=G.sectionB=next.id; performStudy(next.id,'seismic2d'); performStudy(next.id,'seismic3d'); st.studySpend += b0-G.budget; studied3d.add(next.id); }
              else studied3d.add(next.id);
            }
          }
        }
      };
      let months=0, calSeen = new Set();
      while(!ended && months<maxMonths){
        act();
        const b0 = G.budget;
        monthTick(); months++;
        // le log d'un puits manqué apprend le bon horizon
        if(LABOPT.pick && !learned && blocks.some(b=>b.dryHole && b.studies.some(s=>s.type==='welllog'))){ if(G.labPick!==resIdx){ learned = true; G.labPick = resIdx; } }
        // un joueur qui sait caler réclame le bonus de calage pour chaque puits (sismique muette + calage obligatoire)
        if(LABOPT.cal && strat!=='random'){ blocks.forEach(b=>{ if((b.well||b.dryHole) && !calSeen.has(b.id)){ calSeen.add(b.id); G.labCal = G.labCal||{}; G.labCal[b.id]=true; G.budget += LAB_CAL_BONUS; st.calBonus += LAB_CAL_BONUS; } }); }
        G.wells.forEach(w=>{ if(w.status==='producing' && wellEconomics(w).net<0) closeWell(w.blockId); });
        const producing = G.wells.some(w=>w.status==='producing');
        if(!ended && !producing && G.drilling.length===0 && G.budget < 1.2e6) ended='bloque';
      }
      if(!ended) ended='temps';
      return {end:ended, months, ratio:G.budget/budget0, win:ended==='win', prod:G.wells.length, dry:blocks.filter(b=>b.dryHole).length, ...st};
    };
    const out=[];
    presets.split(',').forEach(preset=>strategies.split(',').forEach(strat=>{
      const rows=[]; for(let s=1;s<=+nGames;s++){ try{ rows.push(play(preset,strat,s*101)); }catch(e){ rows.push({err:String(e.stack||e).slice(0,300)}); } }
      const ok=rows.filter(r=>!r.err); const avg=a=>a.reduce((x,y)=>x+y,0)/(a.length||1); const med=a=>{const s=[...a].sort((x,y)=>x-y); return s[Math.floor(s.length/2)]||0;};
      out.push({preset, strat, n:ok.length, errs:rows.length-ok.length, err:(rows.find(r=>r.err)||{}).err,
        win:Math.round(100*avg(ok.map(r=>r.win?1:0))), gain:Math.round(100*avg(ok.map(r=>r.ratio>=1?1:0))), ratioMoy:+avg(ok.map(r=>r.ratio)).toFixed(2), bankrupt:Math.round(100*avg(ok.map(r=>r.end==='bankrupt'?1:0))), bloque:Math.round(100*avg(ok.map(r=>r.end==='bloque'?1:0))),
        ratioMed:+med(ok.map(r=>r.ratio)).toFixed(2), forages:+avg(ok.map(r=>r.drilled)).toFixed(1), puitsProd:+avg(ok.map(r=>r.prod)).toFixed(1), manques:+avg(ok.map(r=>r.missed)).toFixed(1),
        etudesM:+(avg(ok.map(r=>r.studySpend))/1e6).toFixed(1), foragesM:+(avg(ok.map(r=>r.drillSpend))/1e6).toFixed(1), bonusCalM:+(avg(ok.map(r=>r.calBonus))/1e6).toFixed(2)});
    }));
    Math.random = realRandom; return out;
  },{nGames,presets,strategies,mode,goalM,studyMult,drillMult,prodMult,extraJson});
  console.log('preset      strat    n  win% gain% bloq% ratioMed ratioMoy forages prod manqués étudesM foragesM bonusCalM');
  res.forEach(r=>console.log(`${r.preset.padEnd(11)} ${r.strat.padEnd(8)} ${String(r.n).padStart(2)} ${String(r.win).padStart(4)} ${String(r.gain).padStart(5)} ${String(r.bloque).padStart(5)} ${String(r.ratioMed).padStart(8)} ${String(r.ratioMoy).padStart(8)} ${String(r.forages).padStart(7)} ${String(r.puitsProd).padStart(4)} ${String(r.manques).padStart(7)} ${String(r.etudesM).padStart(7)} ${String(r.foragesM).padStart(8)} ${String(r.bonusCalM).padStart(9)}` + (r.errs? '  ERREURS:'+r.errs+' '+r.err:'')));
  console.log('erreurs page:', errs.slice(0,3)); await br.close();
})();
