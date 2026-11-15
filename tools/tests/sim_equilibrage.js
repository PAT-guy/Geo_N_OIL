// Mesure (sans verdict) : un joueur automatique qui suit le guide joue des parties complètes. Sert à regarder le taux de victoire, la valeur nette finale et le poids des pannes de matériel dans les échecs.
// Usage : node tools/tests/sim_equilibrage.js [mode] [nombre de parties]   (modes : decouverte, junior, expert ; défaut decouverte 40)
const { chromium } = require('playwright'); const path = require('path');
const MODE = process.argv[2] || 'decouverte', N = parseInt(process.argv[3] || '40', 10);
(async()=>{ const br = await chromium.launch(); const pg = await br.newPage(); const errs = [];
  pg.on('pageerror', e=>errs.push(e.message));
  await pg.addInitScript(()=>{ try{ localStorage.setItem('geoexplorer_tutorialSeen','1'); localStorage.setItem('geoexplorer_played','1'); }catch(e){} });
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(400);
  const res = await pg.evaluate(async ([mode, n])=>{
    const out = [];
    for(let s=1; s<=n; s++){
      menuConfig.mode = mode; menuConfig.daily = null; menuConfig.seed = s*97+5;
      if(mode==='decouverte'){ menuConfig.basinType='paris'; menuConfig.gridSize=8; menuConfig.offshore=false; menuConfig.financeMode=false; LABOPT = labNormOpt({ ...LAB_DEFAULT_OPT, ...LAB_PRESETS.decouverte.o, cheat:false, finance:false }); }
      else { menuConfig.basinType = ['paris','rift','aquitaine','passive'][s%4]; menuConfig.gridSize = 12; menuConfig.offshore = false; menuConfig.financeMode = true; LABOPT = labNormOpt({ ...LAB_DEFAULT_OPT, ...LAB_PRESETS.decouverte.o, finance:true }); }
      document.getElementById('menu').classList.add('hidden'); startGame(); setSpeed(0);
      const m = MODES[G.mode], maxM = (m.maxYears||25)*12; let ended = null, guard = 0;
      const flush = ()=>{ [drillRevealCur, ...drillRevealQueue].forEach(it=>{ try{ drillRevealFlush(it); }catch(e){} }); drillRevealQueue.length = 0; drillRevealPlaying = false; drillRevealBatch = []; drillRevealRecapOpen = false; document.getElementById('drillRevealModal')?.classList.remove('open'); };
      while(!ended && G.month < maxM + 2 && guard++ < 5000){
        for(let k=0;k<4;k++){ const g = guideCompute(); if(!g || !g.act || !g.act.ok) break; try{ (0, eval)(g.act.call); }catch(e){ break; } flush(); }
        monthTick(); flush();
        if(document.getElementById('endScreen').style.display==='flex'){ ended = true; }
      }
      const dry = blocks.filter(b=>b.dryHole && b.dryHoleInfo), tech = dry.filter(b=>b.dryHoleInfo.techFail).length;
      out.push({ s, win: netWorth()>=m.winGoal && m.winGoal>0, nw: Math.round(netWorth()/1e5)/10, wells: G.wells.length, dry: dry.length, tech, months: G.month });
      document.getElementById('endScreen').style.display = 'none';
    }
    return out; }, [MODE, N]);
  const n = res.length, wins = res.filter(r=>r.win).length, dry = res.reduce((t,r)=>t+r.dry,0), tech = res.reduce((t,r)=>t+r.tech,0), wells = res.reduce((t,r)=>t+r.wells,0);
  const nws = res.map(r=>r.nw).sort((a,b)=>a-b);
  console.log(JSON.stringify({ mode:MODE, parties:n, victoires:wins, tauxVictoire:Math.round(wins/n*100)+' %', valeurNetteMediane:nws[Math.floor(n/2)]+' M$', pire:nws[0], meilleure:nws[n-1], puitsProductifsParPartie:+(wells/n).toFixed(1), puitsSecsParPartie:+(dry/n).toFixed(1), pannesMaterielParmiSecs: dry ? Math.round(tech/dry*100)+' %' : 'n/a', moisMoyens: Math.round(res.reduce((t,r)=>t+r.months,0)/n) }));
  console.log('erreurs', JSON.stringify(errs.slice(0,3)));
  await br.close(); })();
