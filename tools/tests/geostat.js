// Géostatistique (V4.91) : noyau (krigeage exact aux données, variance, simulation conditionnelle), mini-jeu « Portée et variogramme »,
// couche Incertitude, fourchette de production P90/P50/P10 et campagne planifiée. Rien de tout cela ne modifie la vraie géologie ni les estimations.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1280,height:800}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  // 1. noyau
  const K = await pg.evaluate(()=>{ const o={}; let s=12345; const rng=()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; };
    const pts=[{x:1,y:1,noise:0},{x:4,y:2,noise:0},{x:2,y:6,noise:0},{x:7,y:7,noise:0}], vals=[1.2,-0.7,0.4,2.0];
    const tg=[{x:1,y:1},{x:4,y:2},{x:30,y:30},{x:2.5,y:1.5}];
    const r=GEO.krige(pts,tg,'gauss',3.3), est=r.W.map(w=>w.reduce((a,wi,i)=>a+wi*vals[i],0));
    o.exact=[Math.abs(est[0]-1.2)<1e-3, Math.abs(est[1]+0.7)<1e-3, r.V[0]<1e-3, r.V[1]<1e-3];
    o.far = [Math.abs(est[2])<1e-3, r.V[2]>0.999];
    o.mid = r.V[3]>0.01 && r.V[3]<1;
    // bruit : la variance au point mesuré augmente avec le bruit
    const rn=GEO.krige(pts.map(p=>({...p,noise:0.3})),[{x:1,y:1}],'gauss',3.3); o.noise = rn.V[0]>0.05 && rn.V[0]<0.4;
    // simulation conditionnelle : honore les données sans bruit, et sa moyenne / variance retrouvent celles du krigeage
    const sims=GEO.condSim(pts,vals,tg,'gauss',3.3,1500,rng); o.cs0 = sims.every(v=>Math.abs(v[0]-1.2)<0.1 && Math.abs(v[1]+0.7)<0.1);
    const m3=sims.reduce((a,v)=>a+v[3],0)/sims.length, v3=sims.reduce((a,v)=>a+(v[3]-m3)**2,0)/sims.length;
    o.csm = [Math.abs(m3-est[3])<0.08, Math.abs(v3-r.V[3])<0.08*Math.max(1,r.V[3]*10), +m3.toFixed(2), +est[3].toFixed(2), +v3.toFixed(3), +r.V[3].toFixed(3)];
    return o; });
  ok(K.exact.every(Boolean), 'krigeage exact aux puits sans bruit : valeur et variance nulle '+JSON.stringify(K.exact));
  ok(K.far.every(Boolean) && K.mid && K.noise, 'loin de tout puits : moyenne et variance totale ; entre deux : variance partielle ; avec du bruit : variance au puits non nulle '+JSON.stringify([K.far,K.mid,K.noise]));
  ok(K.cs0, 'simulation conditionnelle honore les données');
  ok(K.csm[0] && K.csm[1], 'simulation conditionnelle : moyenne et variance retrouvent celles du krigeage '+JSON.stringify(K.csm));
  // 2. mini-jeu
  const M = await pg.evaluate(async()=>{ const o={}; const G0=window.__gs; let s=777; const rng=()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; };
    // la carte avec les vrais paramètres bat la moyenne partout et un mauvais modèle, sur 40 manches
    let win=0, beat=0, mb=0, md=0, tot=40; for(let i=0;i<tot;i++){ const R=G0.makeRound(rng); const best=G0.rmse(G0.krigedMap(R,R.aT,R.nuT),R.truth), naive=Math.sqrt(R.truth.reduce((a,v)=>a+v*v,0)/R.truth.length), bad=G0.rmse(G0.krigedMap(R,1,0),R.truth); if(best<naive) win++; if(best<=bad+1e-9) beat++; mb+=best; md+=bad; }
    o.win=win; o.beat=beat; o.tot=tot; o.mBest=mb/tot; o.mBad=md/tot;
    document.getElementById('gsOpenBtn').click(); await new Promise(r=>setTimeout(r,100));
    o.open = document.getElementById('gsGameModal').classList.contains('open'); o.vario = document.querySelectorAll('#gsVario circle').length;
    const R=G0.R; const set=(id,v)=>{ const e=document.getElementById(id); e.value=v; e.dispatchEvent(new Event('input')); }; set('gsRange', R.aT); set('gsNug', Math.round(R.nuT*100/5)*5);
    document.getElementById('gsAct').click(); o.fb = document.getElementById('gsFb').textContent; o.two = document.getElementById('gsTrueBox').style.display!=='none';
    o.blocksTouched = typeof G!=='undefined' && G.wells ? G.wells.length : 0; return o; });
  ok(M.win>=M.tot-1 && M.mBest<M.mBad, 'mini-jeu : la carte aux vrais paramètres bat « moyenne partout » ('+M.win+'/'+M.tot+') et, en moyenne, un mauvais modèle (erreur '+M.mBest.toFixed(3)+' contre '+M.mBad.toFixed(3)+')');
  ok(M.open && M.vario>=3, 'mini-jeu : s\'ouvre et trace des points expérimentaux ('+M.vario+')');
  ok(M.two && /\d+ %/.test(M.fb) && /Vrais paramètres/.test(M.fb), 'mini-jeu : validation révèle la vérité et explique le score');
  // 3. partie Junior : incertitude, fourchette, campagne
  const J = await pg.evaluate(async()=>{ const o={}; document.getElementById('gsGameModal').classList.remove('open'); document.getElementById('geoSeed').value='4321'; menuConfig.mode='junior'; menuConfig.basinType='paris'; menuConfig.gridSize=12; menuConfig.offshore=false; labOptLaunch(); await new Promise(r=>setTimeout(r,1000)); setSpeed(0);
    const cand = blocks.filter(b=>!b.inSalt && !b.isOffshore); const A=cand[40], B=cand[41], Cb=cand[100];
    const snap = blocks.map(b=>b.trueProbability+'|'+b.trueQuality).join(',');
    o.noData = gsUncertainty().every(v=>v===1);
    G.budget=1e9; selectedBlock=A.id; A.studyLevel=3; B.studyLevel=3; performStudy(A.id,'seismic3d'); performStudy(B.id,'seismic3d'); o.has=A.studies.some(s=>s.type==='seismic3d')&&!!A.estimate?.quality;
    const u=gsUncertainty(); o.uA = u[A.id]; o.uNear = u[blocks.find(b=>Math.hypot(b.x-A.x,b.y-A.y)>1.9&&Math.hypot(b.x-A.x,b.y-A.y)<2.2&&b.id!==B.id).id]; o.uFar = u[Cb.id];
    o.order = o.uA < o.uNear && o.uNear <= o.uFar + 1e-9; o.farOne = o.uFar > 0.9;
    // la couche : bouton, hachures
    document.getElementById('uncBtn').click(); o.btn = document.getElementById('uncBtn').classList.contains('on'); o.hatched = document.querySelectorAll('#grid .block .unc').length;
    o.opNear = +A.el.querySelector('.unc')?.style.opacity, o.opFar = +Cb.el.querySelector('.unc')?.style.opacity;
    document.getElementById('uncBtn').click();
    // fourchette P90<P50<P10 sur un bloc étudié
    selectedBlock=A.id; ensureEst(A).p = 0.4; const post = gsQualityPosterior(A); o.post = post && post.sd>0; const rg=gsProdRange(A, 1000); o.rg = rg && rg.p90<rg.p50 && rg.p50<rg.p10;
    // un puits voisin mesuré resserre l'écart-type du bloc A
    const sd0 = gsQualityPosterior(A).sd; const nb=blocks.find(b=>Math.hypot(b.x-A.x,b.y-A.y)>0.9&&Math.hypot(b.x-A.x,b.y-A.y)<1.1&&!b.inSalt); nb.estimate={quality:A.estimate.quality, qualErr:0, prob:.3}; const sd1=gsQualityPosterior(A).sd; o.sd=[+sd0.toFixed(2), +sd1.toFixed(2)]; o.tight = sd1<sd0;
    // campagne : au moins deux blocs planifiés, déterministe, ordre des quantiles
    A.planned=true; B.planned=true; ensureEst(B).p=0.4; const c1=gsCampaign(), c2=gsCampaign(); o.camp = c1 && c1.p90<=c1.p50 && c1.p50<=c1.p10 && c1.n===2; o.det = JSON.stringify(c1)===JSON.stringify(c2);
    A.planned=false; B.planned=false; o.one = gsCampaign()===null;
    // quatre blocs contigus contre quatre blocs éloignés, estimations identiques : le groupe contigu doit montrer plus de risque (voisinage, qualité corrélée) et un P90 plus bas
    const land=blocks.filter(x=>!x.inSalt&&!x.isOffshore), set=x=>{ x.studyLevel=3; x.estimate={prob:0.3,probErr:0.05,quality:50,qualErr:5,depth:2000,isGas:false}; x.planned=false; x.studies=[]; };
    land.forEach(set); const c0=land.find(x=>land.some(y=>y.x===x.x+1&&y.y===x.y)&&land.some(y=>y.x===x.x&&y.y===x.y+1)&&land.some(y=>y.x===x.x+1&&y.y===x.y+1));
    const clus=[c0, land.find(y=>y.x===c0.x+1&&y.y===c0.y), land.find(y=>y.x===c0.x&&y.y===c0.y+1), land.find(y=>y.x===c0.x+1&&y.y===c0.y+1)];
    const far=[]; for(const x of land){ if(far.every(y=>Math.hypot(x.x-y.x,x.y-y.y)>=6)) far.push(x); if(far.length===4) break; }
    clus.forEach(x=>x.planned=true); const cc=gsCampaign(1500); clus.forEach(x=>x.planned=false); far.forEach(x=>x.planned=true); const cf=gsCampaign(1500); far.forEach(x=>x.planned=false);
    o.farN=far.length; o.cl=cc&&[cc.p90,cc.p50,cc.ruin]; o.fr=cf&&[cf.p90,cf.p50,cf.ruin]; o.clustered = !!(cc&&cf&&far.length===4&&cc.p50<cf.p50&&cc.ruin>cf.ruin);
    // le panneau de forage affiche la fourchette
    selectedBlock=A.id; renderGeoPanel(A); renderStudiesPanel(A); updateDrillSummary(A.id); o.panel = /P90/.test(document.getElementById('drillSummary')?.textContent||'');
    o.same = snap===blocks.map(b=>b.trueProbability+'|'+b.trueQuality).join(','); return o; });
  ok(J.has && J.noData && J.order && J.farOne, 'incertitude : 1 sans mesure, plus faible au bloc mesuré qu\'à deux cases, retour à 1 loin de tout '+JSON.stringify([J.uA,J.uNear,J.uFar]));
  ok(J.btn && J.hatched>100 && J.opNear<J.opFar, 'la couche hachure la carte, moins fort sur les blocs mesurés ('+J.opNear+' contre '+J.opFar+')');
  ok(J.post && J.rg, 'fourchette de production : P90 < P50 < P10');
  ok(J.tight, 'un voisin mesuré resserre l\'écart-type de la qualité du bloc '+JSON.stringify(J.sd));
  ok(J.camp && J.det && J.one, 'campagne planifiée : P90 ≤ P50 ≤ P10, déterministe, absente avec un seul bloc');
  ok(J.clustered, 'campagne : quatre blocs contigus ont un gain médian plus bas et plus de chances de perdre que quatre blocs éloignés, à estimations identiques (contigus '+JSON.stringify(J.cl)+', éloignés '+JSON.stringify(J.fr)+')');
  ok(J.panel, 'le panneau de forage affiche la fourchette P90 / P10');
  ok(J.same, 'la vraie géologie (probabilité et qualité de chaque bloc) est inchangée');
  // 4. Découverte : couche et fourchette absentes
  const D = await pg.evaluate(async()=>{ menuConfig.mode='decouverte'; document.getElementById('geoSeed').value='808'; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); return { btn: document.getElementById('uncBtn').getClientRects().length>0 }; });
  ok(!D.btn, 'Découverte : pas de bouton Incertitude');
  ok(errs.length===0, 'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
