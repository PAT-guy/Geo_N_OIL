// Mesure (sans verdict) : le krigeage guide-t-il vers de meilleures mesures ? (V5.29)
// Pour chaque graine et chaque bassin : gravimétrie, un premier profil de sismique 2D identique pour tous, puis K sismiques 2D d'un bloc, placées selon une stratégie :
//   hasard (bloc libre tiré au sort), structure (le haut structural de la gravimétrie, comme le fait le guide), krigeage (le premier bloc de gsNextBest, recalculé après chaque mesure).
// On compare ensuite l'erreur de la profondeur krigée par rapport à la VÉRITÉ cachée, sur tous les blocs non mesurés, et sur les 20 % de blocs les plus prometteurs (probabilité vraie).
// Usage : node tools/tests/sim_krigeage_mesure.js [nombre de graines par bassin] [K]    (défaut 12 graines, K = 6)
const { chromium } = require('playwright'); const path = require('path');
const N = parseInt(process.argv[2] || '12', 10), K = parseInt(process.argv[3] || '6', 10);
(async()=>{ const br = await chromium.launch(); const pg = await br.newPage(); const errs = [];
  pg.on('pageerror', e=>errs.push(e.message));
  await pg.addInitScript(()=>{ try{ localStorage.setItem('geoexplorer_tutorialSeen','1'); localStorage.setItem('geoexplorer_played','1'); }catch(e){} });
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(400);
  const res = await pg.evaluate(async ([N, K])=>{
    const out = [], BAS = ['paris','permian','rift','north_sea','aquitaine','passive'];
    for(const bt of BAS) for(let s=0;s<N;s++){
      const row = { bt }; const seed = String(5000 + s*7 + BAS.indexOf(bt));
      for(const strat of ['hasard','structure','krigeage']){
        document.getElementById('geoSeed').value = seed; menuConfig.mode='expert'; menuConfig.basinType=bt; menuConfig.seed=seed; labOptLaunch(); await new Promise(r=>setTimeout(r,60)); setSpeed(0); G.budget = 80e6; LABOPT.pick=false; G.labOpt.pick=false;
        performStudy(null,'gravity');
        const n = Math.sqrt(blocks.length)|0, idOf = (x,y)=>(blocks.find(b=>b.x===x&&b.y===y)||blocks[0]).id;
        G.sectionA = idOf(1,2); G.sectionB = idOf(n-2,2); performStudy(null,'seismic2d');
        const rng = makeRng(seedToInt(seed+'|'+strat)), elig = () => blocks.filter(b=>!b.isOffshore && !b.inSalt && !b.well && !b.dryHole && b.estimate?.depth===undefined);
        for(let k=0;k<K;k++){
          const c = elig(); if(!c.length) break; let pick;
          if(strat==='hasard') pick = c[Math.floor(rng()*c.length)];
          else if(strat==='structure') pick = c.slice().sort((u,w)=>(w.estimate?.structPos??-1)-(u.estimate?.structPos??-1))[0];
          else { const nb = gsNextBest('z').filter(x=>c.some(b=>b.id===x.id)); pick = nb.length ? blocks[nb[0].id] : c[Math.floor(rng()*c.length)]; }
          G.sectionA = pick.id; G.sectionB = pick.id; G._single = true; performStudy(null,'seismic2d'); G._single = false;
        }
        const S = gsSurface('z'); if(!S){ row[strat] = null; continue; }
        const land = blocks.filter(b=>!b.isOffshore && !b.inSalt), top = land.slice().sort((u,w)=>w.trueProbability-u.trueProbability).slice(0, Math.max(3, Math.round(land.length*0.2)));
        const err = arr => { let c=0,t=0; arr.forEach(b=>{ if(S.own[b.id]) return; t += Math.abs(S.m[b.id]-b.topOfReservoir); c++; }); return c ? t/c : null; };
        row[strat] = { all: err(land), top: err(top), n: S.n };
      }
      out.push(row);
    }
    return out; }, [N, K]);
  const agg = (strat, key) => { const v = res.map(r=>r[strat] && r[strat][key]).filter(x=>x!=null); return v.length ? v.reduce((t,x)=>t+x,0)/v.length : null; };
  const f = x => x==null ? 'n/a' : Math.round(x)+' m';
  console.log(JSON.stringify({ cas:res.length, K, erreurMoyenneToutesCases:{ hasard:f(agg('hasard','all')), structure:f(agg('structure','all')), krigeage:f(agg('krigeage','all')) }, erreurMoyenneSur20PourCentLesPlusPrometteurs:{ hasard:f(agg('hasard','top')), structure:f(agg('structure','top')), krigeage:f(agg('krigeage','top')) } }));
  const wins = (a,b,key) => res.filter(r=>r[a]&&r[b]&&r[a][key]!=null&&r[b][key]!=null).reduce((t,r)=>t+(r[a][key]<r[b][key]?1:0),0);
  console.log(JSON.stringify({ krigeagePlusPrecisQue:{ hasard:wins('krigeage','hasard','all')+'/'+res.length, structure:wins('krigeage','structure','all')+'/'+res.length }, krigeagePlusPrecisSurLesPrometteurs:{ hasard:wins('krigeage','hasard','top')+'/'+res.length, structure:wins('krigeage','structure','top')+'/'+res.length } }));
  console.log('erreurs', JSON.stringify(errs.slice(0,3)));
  await br.close(); })();
