// Système pétrolier lisible : dans toutes les provinces de toutes les cartes, une roche-mère se trouve SOUS le premier réservoir
// et une couverture le surmonte. Une roche-mère superficielle au-dessus du réservoir reste possible (cas particulier), jamais seule.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const T = await pg.evaluate(()=>{ const o={maps:0,noDeepSource:[],noSeal:[],special:0,badIdx:0,nanProb:0,byBasin:{}};
    for(const bt of ['random','rift','passive','foreland','paris','north_sea','aquitaine','gulf_coast']) for(let s=1;s<=60;s++){
      generateGeology(s%3===0?20:12, bt, true, s*977+13); o.maps++;
      let sp = false;
      STRAT_PROVINCES.forEach((col,pi)=>{ const ri=col.findIndex(l=>l.role==='reservoir'); const deep = col.some((l,i)=>l.role==='source' && i>ri); const seal = col.slice(0,ri).some(l=>l.role==='seal') || col[ri-1]?.role==='source'; // Kimmeridge sur Brent : l'argile organique fait aussi couverture
        if(!deep) o.noDeepSource.push([bt,s*977+13,pi]); if(!seal) o.noSeal.push([bt,s*977+13,pi,col.slice(0,ri+1).map(l=>l.role+':'+l.id).join(' ')]); if(col.some((l,i)=>l.role==='source' && i<ri)) sp = true; });
      if(sp){ o.special++; o.byBasin[bt]=(o.byBasin[bt]||0)+1; }
      const ri = STRAT.findIndex(l=>l.role==='reservoir'), si = STRAT.findLastIndex(l=>l.role==='source'); if(!(si>ri)) o.badIdx++;
      if(blocks.some(b=>!isFinite(b.trueProbability) || !isFinite(b.maturity))) o.nanProb++; }
    return o; });
  ok(T.noDeepSource.length===0, 'toutes les provinces de '+T.maps+' cartes ont une roche-mère sous le réservoir ('+T.noDeepSource.length+' manquantes) '+JSON.stringify(T.noDeepSource.slice(0,3)));
  ok(T.noSeal.length===0, 'toutes les provinces ont une couverture au-dessus du réservoir (couverture dédiée ou roche-mère argileuse directement au-dessus) ('+T.noSeal.length+' manquantes)');
  ok(T.badIdx===0, 'la roche-mère qui charge (la plus profonde) est toujours sous le réservoir de référence');
  ok(T.nanProb===0, 'aucune probabilité ni maturité invalide');
  ok(T.special>0 && T.special < T.maps*0.5, 'le cas particulier (roche-mère superficielle en plus) reste minoritaire : '+T.special+' cartes sur '+T.maps+' '+JSON.stringify(T.byBasin));
  ok(errs.length===0, 'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko? 'ECHECS: '+ko : 'TOUT OK'); process.exit(ko?1:0); })();
