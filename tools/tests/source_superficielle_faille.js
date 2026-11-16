// Roche-mère superficielle au-dessus du réservoir : elle ne charge que par contact de faille (rejet de plus de 60 m, bloc à moins de 0,75 case du tracé),
// selon sa propre maturité ; jamais sur les cartes sans roche-mère superficielle ; l'explication est affichée après forage.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const T = await pg.evaluate(()=>{ const o={maps:0,special:0,vf:0,blocksSpecial:0,badCond:0,badCharge:0,leak:0,txt:0,nan:0,mapsWithVf:0,gen:[]};
    for(const bt of ['random','rift','passive','foreland','north_sea','paris','aquitaine','gulf_coast','permian']) for(let s=1;s<=60;s++){
      const r = generateGeology(12, bt, true, s*4391+7); o.maps++;
      const hasUpper = STRAT_PROVINCES.some(col=>col.some((l,i)=>l.role==='source' && !l.deepSource && i<col.findIndex(x=>x.role==='reservoir')));
      let vfHere = 0;
      blocks.forEach(b=>{ if(!isFinite(b.srcFactor) || !isFinite(b.trueProbability)) o.nan++;
        if(!hasUpper){ if(b.viaFault || b.upperGen>0) o.leak++; return; }
        o.blocksSpecial++;
        if(b.viaFault){ o.vf++; vfHere++; const near = r.faults.some(f=>Math.abs(f.throw)>60 && Math.abs((b.x-f.px)*f.nx+(b.y-f.py)*f.ny)<=0.75);
          if(!near || !(b.upperGen>0.15)) o.badCond++; if(b.srcFactor < Math.min(0.9, b.upperGen*0.7) - 1e-9) o.badCharge++; o.gen.push(b.upperGen);
          b.dryHole=true; const k=blockKnowledge(b).find(z=>z.n==='Roche-mère'); if(k && /superficielle/.test(k.t)) o.txt++; b.dryHole=false; } });
      if(hasUpper){ o.special++; if(vfHere) o.mapsWithVf++; } }
    return o; });
  ok(T.leak===0, 'aucun contact de faille ni génération superficielle sur les '+(T.maps-T.special)+' cartes sans roche-mère superficielle');
  ok(T.vf>0 && T.mapsWithVf>0, 'sur '+T.special+' cartes avec roche-mère superficielle, '+T.vf+' blocs sont chargés par contact de faille ('+T.mapsWithVf+' cartes)');
  ok(T.badCond===0, 'chaque bloc chargé ainsi touche une faille de plus de 60 m (moins de 0,75 case) et la roche-mère superficielle génère (> 0,15)');
  ok(T.badCharge===0, 'la charge de ces blocs vaut au moins 70 % de la génération de la roche-mère superficielle');
  ok(T.vf/T.blocksSpecial < 0.3, 'l\'effet reste local : '+Math.round(100*T.vf/T.blocksSpecial*10)/10+' % des blocs des cartes concernées');
  ok(T.txt===T.vf, 'l\'explication « roche-mère superficielle, au contact de la faille » est affichée sur chaque bloc concerné ('+T.txt+'/'+T.vf+')');
  ok(T.nan===0, 'aucune charge ni probabilité invalide');
  ok(errs.length===0, 'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko? 'ECHECS: '+ko : 'TOUT OK'); process.exit(ko?1:0); })();
