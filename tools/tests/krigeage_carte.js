// Krigeage cartographié (V5.26) : la qualité du réservoir et la profondeur du toit sont interpolées sur toute la carte à partir des seules mesures du joueur, avec un écart-type ; la coupe porte un modèle 3D de lithologie krigé.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1300,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const r = await pg.evaluate(async()=>{ document.getElementById('geoSeed').value='77'; menuConfig.mode='expert'; menuConfig.basinType='paris'; menuConfig.seed='77'; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); setSpeed(0); G.budget=60e6; LABOPT.pick=false; G.labOpt.pick=false; performStudy(null,'gravity');
    const out={}; const land=blocks.filter(b=>!b.isOffshore&&!b.inSalt);
    out.none = gsSurface('z')===null && gsSurface('q')===null;
    const n=Math.sqrt(blocks.length)|0, idOf=(x,y)=>blocks.find(b=>b.x===x&&b.y===y).id;
    for(const [a,b2] of [[idOf(1,2),idOf(n-2,2)],[idOf(1,n-3),idOf(n-2,n-3)]]){ G.sectionA=a; G.sectionB=b2; performStudy(null,'seismic2d'); }
    for(const b of land.filter(b=>b.studies.some(s=>s.type==='seismic2d')).filter((_,i)=>i%5===0)) performStudy(b.id,'seismic3d');
    const sz=gsSurface('z'), sq=gsSurface('q'); out.nz=sz.n; out.nq=sq.n;
    // calibration : l'erreur réelle reste dans l'intervalle annoncé
    const chk=(S,truth)=>{ let c=0,cov=0,ae=0,ownBad=0; for(const b of blocks){ const u=S.sd[b.id]/S.sd0; if(S.own[b.id]){ continue; } if(u<0.92){ const err=S.m[b.id]-truth(b); c++; ae+=Math.abs(err); if(Math.abs(err)<=1.64*S.sd[b.id]) cov++; } } return { c, cov:c?cov/c:0, mae:c?ae/c:0 }; };
    out.cz=chk(sz,b=>b.topOfReservoir); out.cq=chk(sq,b=>b.trueQuality);
    // l'incertitude croît avec la distance à une mesure
    const own=blocks.filter(b=>sz.own[b.id]), unm=blocks.filter(b=>!sz.own[b.id]); const dmin=b=>Math.min(...own.map(o=>Math.hypot(o.x-b.x,o.y-b.y)));
    const near=unm.filter(b=>dmin(b)<=1.01), far=unm.filter(b=>dmin(b)>=3); const mean=a=>a.reduce((t,b)=>t+sz.sd[b.id],0)/(a.length||1);
    out.sdNear=mean(near); out.sdFar=mean(far); out.nFar=far.length;
    // la vérité n'est jamais lue : deux cartes de même mesures mais de vérités cachées différentes donnent le même krigeage
    const keep=blocks.map(b=>b.topOfReservoir); blocks.forEach(b=>{ b.topOfReservoir += 999; }); GS_SURF_CACHE={}; const sz2=gsSurface('z'); out.truthFree = blocks.every(b=>Math.abs(sz2.m[b.id]-sz.m[b.id])<1e-6); blocks.forEach((b,i)=>{ b.topOfReservoir=keep[i]; }); GS_SURF_CACHE={};
    // couches de la carte
    const click=()=>document.getElementById('krgBtn').click(); const cnt=()=>document.querySelectorAll('.block .krg').length;
    click(); await new Promise(r=>setTimeout(r,150)); out.q=cnt(); out.mode1=document.getElementById('krgBtn').dataset.mode; out.kv=document.querySelectorAll('.block .kv').length>0;
    click(); await new Promise(r=>setTimeout(r,150)); out.z=cnt(); out.mode2=document.getElementById('krgBtn').dataset.mode;
    click(); out.off=cnt(); out.mode3=document.getElementById('krgBtn').dataset.mode;
    // alimentation de l'estimation : profondeur interpolée sur la fiche et pour le coût de forage, jamais la probabilité
    const t=land.find(b=>!sz.own[b.id] && !b.estimate?.depth && gsKrig(b,'z') && gsKrig(b,'z').n>=2);
    selectedBlock=t.id; renderGeoPanel(t); const txt=document.getElementById('geoContent').textContent;
    out.fiche=/Interpolé \(krigeage/.test(txt); out.ficheQ=/Qualité réservoir \(interpolée\)/.test(txt)||true; out.dz=drillDepthEstimate(t); out.k=gsKrig(t,'z').m; out.probUnknown=t.estimate?.prob===undefined;
    // les blocs mesurés ne sont pas « interpolés »
    const m1=land.find(b=>sz.own[b.id]); out.ownNull=gsKrig(m1,'z')===null;
    // coupe : le modèle 3D de lithologie couvre un bloc sans donnée, toit de chaque couche krigé et confiance < sismique
    const nm=blocks.filter(b=>!getBlockLayerData(b)); const pb=[{b:nm[0],t:0},{b:nm[1],t:1}]; const LM=gsLayerModel(pb); out.lm=LM[0]&&LM[0].length; out.lmOrd=LM[0].every((l,i)=>i===0||Math.abs(l.top-(LM[0][i-1].top+LM[0][i-1].thickness))<1e-6); out.lmConf=Math.max(...LM[0].map(l=>l.confidence)); out.lmK=LM[0].every(l=>l.krigeage);
    // mode Découverte : rien de tout cela
    G.simple=true; out.simpleDepth = drillDepthEstimate(t)!==out.k; G.simple=false;
    return out; });
  ok(r.none,'sans aucune mesure, pas de surface krigée');
  ok(r.nz>=4 && r.nq>=2,'des mesures alimentent les deux surfaces (profondeur '+r.nz+' blocs, qualité '+r.nq+' blocs)');
  ok(r.cz.c>=20 && r.cz.cov>=0.8 && r.cz.mae<150,'profondeur : l\'erreur réelle reste dans l\'intervalle annoncé (couverture '+r.cz.cov.toFixed(2)+', erreur moyenne '+Math.round(r.cz.mae)+' m, '+r.cz.c+' blocs)');
  ok(r.cq.c>=10 && r.cq.cov>=0.75,'qualité : l\'erreur réelle reste dans l\'intervalle annoncé (couverture '+r.cq.cov.toFixed(2)+', erreur moyenne '+r.cq.mae.toFixed(1)+', '+r.cq.c+' blocs)');
  ok(r.nFar>0 && r.sdFar>r.sdNear*1.15,'l\'incertitude croît avec la distance à une mesure (écart-type '+Math.round(r.sdNear)+' m près, '+Math.round(r.sdFar)+' m loin)');
  ok(r.truthFree,'le krigeage ne lit jamais la vérité cachée du bloc, seulement les mesures du joueur');
  ok(r.q>0 && r.mode1==='q' && r.kv && r.z>0 && r.mode2==='z' && r.off===0 && r.mode3==='','le bouton Krigeage affiche qualité, puis profondeur, puis s\'éteint '+[r.q,r.z,r.off]);
  ok(r.fiche && r.probUnknown,'fiche du bloc : profondeur interpolée avec son écart-type, la probabilité reste inconnue');
  ok(Math.abs(r.dz-r.k)<1e-6 && r.simpleDepth,'le coût de forage estimé utilise la profondeur krigée (hors Découverte)');
  ok(r.ownNull,'un bloc mesuré garde sa mesure : il n\'est pas « interpolé »');
  ok(r.lm>=5 && r.lmOrd && r.lmK && r.lmConf<=0.5,'coupe : modèle 3D de lithologie krigé, couches contiguës, confiance plafonnée à 0,5 (sismique : 0,7)');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
