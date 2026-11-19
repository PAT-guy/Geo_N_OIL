// Mesure (sans verdict) : ce que montrent la gravimétrie et la sismique 2D correspond-il au piège réel ? (V5.44)
// Pour chaque bassin et chaque graine : (1) gravimétrie : structPos affiché contre le facteur de piège réel (corrélation, précision et rappel de « haut structural » pour un piège utile, trapFactor >= 0,5) ;
// (2) relief local vrai (profondeur du réservoir moins la moyenne des 8 voisins) comme référence : ce qu'une gravimétrie locale pourrait montrer ; (3) sismique 2D : sur des profils tirés au hasard, la crête déclarée « Anticlinal » ou « Haut structural » est-elle un bloc à piège utile ?
// Usage : node tools/tests/sim_structure_piege.js [graines par bassin]   (défaut 8)
const { chromium } = require('playwright'); const path = require('path');
const N = parseInt(process.argv[2] || '8', 10);
(async()=>{ const br = await chromium.launch(); const pg = await br.newPage(); const errs = [];
  pg.on('pageerror', e=>errs.push(e.message));
  await pg.addInitScript(()=>{ try{ localStorage.setItem('geoexplorer_tutorialSeen','1'); localStorage.setItem('geoexplorer_played','1'); }catch(e){} });
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(400);
  const res = await pg.evaluate(async (N)=>{
    const out = [], BAS = ['paris','permian','rift','north_sea','aquitaine','passive'];
    const auc = (sc,y)=>{ const P=[],Q=[]; sc.forEach((v,i)=>(y[i]>=0.5?P:Q).push(v)); if(!P.length||!Q.length) return null; let w=0; for(const p of P) for(const q of Q) w += p>q ? 1 : p===q ? 0.5 : 0; return w/(P.length*Q.length); };
    const corr = (a,b)=>{ const n=a.length, ma=a.reduce((s,v)=>s+v,0)/n, mb=b.reduce((s,v)=>s+v,0)/n; let sab=0,saa=0,sbb=0; for(let i=0;i<n;i++){ sab+=(a[i]-ma)*(b[i]-mb); saa+=(a[i]-ma)**2; sbb+=(b[i]-mb)**2; } return sab/Math.sqrt(saa*sbb||1); };
    for(const bt of BAS){ const acc = { bt, n:0, xs:[], xl:[], ys:[], gHi:{tp:0,fp:0,fn:0}, lHi:{tp:0,fp:0,fn:0}, seis:{crest:0,useful:0,all:0,usefulAll:0}, hiNoClosure:[] };
      for(let s=0;s<N;s++){
        const seed = String(7000 + s*13 + BAS.indexOf(bt)); document.getElementById('geoSeed').value = seed; menuConfig.mode='expert'; menuConfig.basinType=bt; menuConfig.seed=seed; labOptLaunch(); await new Promise(r=>setTimeout(r,60)); setSpeed(0); G.budget = 80e6; LABOPT.pick=false; G.labOpt.pick=false;
        performStudy(null,'gravity');
        const land = blocks.filter(b=>!b.isOffshore && !b.inSalt); const byXY = new Map(blocks.map(b=>[b.x+','+b.y, b]));
        land.forEach(b=>{ const sp = b.estimate?.structPos; if(sp===undefined) return;
          const nb=[]; for(let dx=-1;dx<=1;dx++) for(let dy=-1;dy<=1;dy++){ if(!dx&&!dy) continue; const o=byXY.get((b.x+dx)+','+(b.y+dy)); if(o) nb.push(o.topOfReservoir); } if(nb.length<5) return;
          const rel = nb.reduce((t,v)=>t+v,0)/nb.length - b.topOfReservoir;   // > 0 : plus haut que ses voisins
          const useful = b.trapFactor >= 0.5; acc.n++; acc.xs.push(sp); acc.xl.push(rel); acc.ys.push(b.trapFactor);
          const gh = sp > 0.2, lh = rel > 15;
          if(gh&&useful) acc.gHi.tp++; else if(gh) acc.gHi.fp++; else if(useful) acc.gHi.fn++;
          if(lh&&useful) acc.lHi.tp++; else if(lh) acc.lHi.fp++; else if(useful) acc.lHi.fn++;
          if(gh && b.trapFactor<0.3) acc.hiNoClosure.push(+b.trapFactor.toFixed(2)); });
        // sismique 2D : profils au hasard
        const rng = makeRng(seedToInt(seed+'|profils')), n = Math.sqrt(blocks.length)|0;
        for(let k=0;k<6;k++){ const y = 1+Math.floor(rng()*(n-2)), a = byXY.get('1,'+y), z = byXY.get((n-2)+','+y); if(!a||!z) continue; G.sectionA=a.id; G.sectionB=z.id; performStudy(null,'seismic2d');
          const pb = getProfileBlocks(a.id, z.id).filter(o=>!o.b.isOffshore); const pts = pb.filter(o=>o.b.estimate?.depth!==undefined); if(pts.length<4) continue;
          const tops = pts.map(o=>o.b.estimate.depth), mx = Math.min(...tops), i = tops.indexOf(mx);   // sommet = profondeur minimale
          if(!(i>0 && i<pts.length-1)) continue; const range = Math.max(...tops)-mx; if(range<80) continue; const clos = Math.min(Math.max(...tops.slice(0,i)), Math.max(...tops.slice(i+1))) - mx; if(clos<40) continue;   // même règle que interpretSection (V5.44) : sommet intérieur, relief de 80 m, fermeture de 40 m sur le profil
          acc.seis.crest++; if(pts[i].b.trapFactor>=0.5) acc.seis.useful++; }
        land.forEach(b=>{ acc.seis.all++; if(b.trapFactor>=0.5) acc.seis.usefulAll++; });
      }
      const pr = c=>c.tp+c.fp ? +(c.tp/(c.tp+c.fp)).toFixed(2) : null, rc = c=>c.tp+c.fn ? +(c.tp/(c.tp+c.fn)).toFixed(2) : null;
      out.push({ bt, blocs:acc.n, corrGrav:+corr(acc.xs,acc.ys).toFixed(2), aucGrav:+auc(acc.xs,acc.ys).toFixed(2), corrLocal:+corr(acc.xl,acc.ys).toFixed(2), gravHaut:{ precision:pr(acc.gHi), rappel:rc(acc.gHi) }, localHaut:{ precision:pr(acc.lHi), rappel:rc(acc.lHi) }, baseUtile:+(acc.seis.usefulAll/acc.seis.all).toFixed(2), crêtes2D:acc.seis.crest, crêteUtile:acc.seis.crest ? +(acc.seis.useful/acc.seis.crest).toFixed(2) : null, hautSansPiege:acc.hiNoClosure.length });
    }
    return out; }, N);
  console.log(JSON.stringify(res,null,1)); console.log('erreurs', JSON.stringify(errs.slice(0,4)));
  await br.close(); })();
