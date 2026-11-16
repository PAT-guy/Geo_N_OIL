// Calibration de la fourchette géostatistique de qualité réservoir : sur 7 bassins, avec 25 blocs étudiés en sismique 3D par carte, l'intervalle P90 à P10 doit contenir la vraie qualité
// à peu près 80 % du temps et l'estimation combinée avec les voisins doit être plus proche de la vérité que l'estimation propre du bloc.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(400);
  const R = await pg.evaluate(()=>{ const out={}; let C=0,N=0;
    for(const bt of ['paris','rift','aquitaine','passive','north_sea','gulf_coast','foreland']){ let cov=0,n=0,eo=0,ep=0;
      for(let k=0;k<8;k++){ G.basinType=bt; generateGeology(12,bt,false,k*977+5); G.seedNum=k; blocks.forEach(b=>{b.studies=[];b.estimate=undefined;});
        const cand=blocks.filter(b=>!b.inSalt&&b.trueQuality>0).filter((b,i)=>(i*7+k*3)%5===0).slice(0,25);
        cand.forEach((b,i)=>{ const x=STUDIES.seismic3d.do(b, makeRng(k*100+i)); b.estimate={quality:x.qualityEst,qualErr:x.qualErr,prob:.3}; b.studies=[{type:'seismic3d',result:x}]; });
        cand.forEach(b=>{ const p=gsQualityPosterior(b); if(!p) return; n++; if(Math.abs(b.trueQuality-p.m)<=1.2816*p.sd) cov++; eo+=(b.estimate.quality-b.trueQuality)**2; ep+=(p.m-b.trueQuality)**2; }); }
      out[bt]={ cov:cov/n, own:Math.sqrt(eo/n), post:Math.sqrt(ep/n), n }; C+=cov; N+=n; }
    out.pooled=C/N; return out; });
  const bts=Object.keys(R).filter(k=>k!=='pooled');
  ok(bts.every(k=>R[k].post<R[k].own), 'l\'estimation combinée avec les voisins est plus proche de la vérité que l\'estimation propre, dans les 7 bassins '+bts.map(k=>k+' '+R[k].own.toFixed(2)+'→'+R[k].post.toFixed(2)).join(', '));
  ok(R.pooled>0.7 && R.pooled<0.9, 'l\'intervalle P90 à P10 couvre la vérité '+Math.round(R.pooled*100)+' % du temps (cible 80 %)');
  ok(bts.every(k=>R[k].cov>0.62 && R[k].cov<0.95), 'couverture entre 62 et 95 % dans chaque bassin '+bts.map(k=>k+' '+Math.round(R[k].cov*100)).join(', '));
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
