// Système pétrolier lisible : dans chaque partie, au moins un quart de la carte (une ou plusieurs provinces) a une roche-mère SOUS le
// réservoir et une couverture au-dessus. Les provinces sans roche-mère profonde restent possibles (zones stériles), mais pas partout.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const T = await pg.evaluate(()=>{ const o={maps:0,low:[],noSeal:[],special:0,sterile:0,minShare:1,nanProb:0,absentKitchen:0,byBasin:{}};
    for(const bt of ['random','rift','passive','foreland','paris','north_sea','aquitaine','gulf_coast']) for(let s=1;s<=60;s++){
      const gs = s%3===0?20:12, seed = s*977+13; generateGeology(gs, bt, true, seed); o.maps++;
      const ri = STRAT.findIndex(l=>l.role==='reservoir');
      const good = b => { const col = STRAT_PROVINCES[b.provinceIdx], r = col.findIndex(l=>l.role==='reservoir'); return !b.srcAbsent && col.some((l,i)=>l.role==='source' && i>r && !l.hiatus); };
      const share = blocks.filter(good).length / blocks.length; o.minShare = Math.min(o.minShare, share); if(share < 0.25) o.low.push([bt,seed,+share.toFixed(2)]);
      STRAT_PROVINCES.forEach((col,pi)=>{ const r=col.findIndex(l=>l.role==='reservoir'); if(!(col.slice(0,r).some(l=>l.role==='seal') || col[r-1]?.role==='source')) o.noSeal.push([bt,seed,pi]); });
      if(STRAT_PROVINCES.some(col=>col.some((l,i)=>l.role==='source' && i<col.findIndex(x=>x.role==='reservoir')))){ o.special++; o.byBasin[bt]=(o.byBasin[bt]||0)+1; if(blocks.some(b=>b.srcAbsent)) o.sterile++; }
      if(blocks.some(b=>!isFinite(b.trueProbability) || !isFinite(b.maturity))) o.nanProb++;
      if(blocks.some(b=>b.srcAbsent && b.genStrength>0.021)) o.absentKitchen++; }
    return o; });
  ok(T.low.length===0, 'chaque partie garde au moins 25 % de carte avec une roche-mère profonde fonctionnelle : minimum observé '+Math.round(T.minShare*100)+' % sur '+T.maps+' cartes '+JSON.stringify(T.low.slice(0,3)));
  ok(T.noSeal.length===0, 'toutes les provinces ont une couverture au-dessus du réservoir ('+T.noSeal.length+' manquantes)');
  ok(T.nanProb===0, 'aucune probabilité ni maturité invalide');
  ok(T.absentKitchen===0, 'une zone sans roche-mère profonde ne génère rien');
  ok(T.special>0 && T.special < T.maps*0.5, 'le cas particulier (roche-mère superficielle en plus) reste minoritaire : '+T.special+' cartes sur '+T.maps+' '+JSON.stringify(T.byBasin));
  ok(T.sterile>=T.special*0.2, 'des zones stériles existent dans une partie des cartes particulières : '+T.sterile+' sur '+T.special);
  ok(errs.length===0, 'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko? 'ECHECS: '+ko : 'TOUT OK'); process.exit(ko?1:0); })();
