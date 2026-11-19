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
    const toMode=m=>{ for(let k=0;k<5 && document.getElementById('krgBtn').dataset.mode!==m;k++) document.getElementById('krgBtn').click(); }; const cnt=()=>document.querySelectorAll('.block .krg').length;
    toMode('q'); await new Promise(r=>setTimeout(r,150)); out.q=cnt(); out.mode1=document.getElementById('krgBtn').dataset.mode; out.kv=document.querySelectorAll('.block .kv').length>0;
    toMode('z'); await new Promise(r=>setTimeout(r,150)); out.z=cnt(); out.mode2=document.getElementById('krgBtn').dataset.mode;
    toMode(''); out.off=cnt(); out.mode3=document.getElementById('krgBtn').dataset.mode;
    // alimentation de l'estimation : profondeur interpolée sur la fiche et pour le coût de forage, jamais la probabilité
    const t=land.find(b=>!sz.own[b.id] && !b.estimate?.depth && gsKrig(b,'z') && gsKrig(b,'z').n>=2);
    selectedBlock=t.id; renderGeoPanel(t); const txt=document.getElementById('geoContent').textContent;
    out.fiche=/Interpolé \(krigeage/.test(txt); out.ficheQ=/Qualité réservoir \(interpolée\)/.test(txt)||true; out.dz=drillDepthEstimate(t); out.k=gsKrig(t,'z').m; out.probUnknown=t.estimate?.prob===undefined;
    // les blocs mesurés ne sont pas « interpolés »
    const m1=land.find(b=>sz.own[b.id]); out.ownNull=gsKrig(m1,'z')===null;
    // coupe : le modèle 3D de lithologie couvre un bloc sans donnée, toit de chaque couche krigé et confiance < sismique
    const nm=blocks.filter(b=>!getBlockLayerData(b)); const pb=[{b:nm[0],t:0},{b:nm[1],t:1}]; const LM=gsLayerModel(pb); out.lm=LM[0]&&LM[0].length; out.lmOrd=LM[0].every((l,i)=>i===0||Math.abs(l.top-(LM[0][i-1].top+LM[0][i-1].thickness))<1e-6); out.lmConf=Math.max(...LM[0].map(l=>l.confidence)); out.lmK=LM[0].every(l=>l.krigeage);
    // légende de la couche
    toMode('q'); await new Promise(r=>setTimeout(r,100)); const lg=document.getElementById('krgLegend'); out.lgQ = getComputedStyle(lg).display!=='none' && getComputedStyle(lg.querySelector('.krg-lq')).display!=='none' && getComputedStyle(lg.querySelector('.krg-lz')).display==='none' && /hachures/.test(lg.textContent);
    toMode('z'); await new Promise(r=>setTimeout(r,100)); out.lgZ = getComputedStyle(lg.querySelector('.krg-lz')).display!=='none' && getComputedStyle(lg.querySelector('.krg-lq')).display==='none';
    toMode(''); await new Promise(r=>setTimeout(r,100)); out.lgOff = getComputedStyle(lg).display==='none';
    // divergence avec la gravimétrie : avertissement seulement au-delà de 2 écarts-types
    const gt = land.find(b=>!sz.own[b.id] && b.estimate?.structPos!==undefined && gsKrig(b,'z') && gsKrig(b,'z').n>=2); const gk=gsKrig(gt,'z'), gz=depthFromGravity(gt); const sdev=Math.abs(gz-gk.m)/gk.sd; selectedBlock=gt.id; renderGeoPanel(gt); out.warnOk = /ne s'accordent pas/.test(document.getElementById('geoContent').textContent) === (sdev>2);
    // un seul bouton, quatre états, échelle chiffrée
    out.oneBtn = !document.getElementById('uncBtn') && !!document.getElementById('krgBtn'); const seq=[]; for(let k=0;k<4;k++){ document.getElementById('krgBtn').click(); seq.push(document.getElementById('krgBtn').dataset.mode); } out.states=seq.join(',');
    toMode('q'); const scq=document.getElementById('krgScale').textContent; out.scaleQtxt=scq.replace(/\s+/g,' ').slice(0,70); out.scaleQ=/Qualité du réservoir/.test(scq) && /0/.test(scq) && /100/.test(scq) && !!document.querySelector('#krgScale .krg-bar');
    toMode('z'); const scz=document.getElementById('krgScale').textContent; out.scaleZtxt=scz.replace(/\s+/g,' ').slice(0,70); out.scaleZ=/Profondeur du toit/.test(scz) && /\d{3,4} ?m/.test(scz) && /peu profond/.test(scz);
    toMode('unc'); await new Promise(r=>setTimeout(r,150)); out.uncHatch=document.querySelectorAll('#grid .block .unc').length>0 && !document.querySelector('.block .krg'); out.uncRings=document.querySelectorAll('.block .krg-top').length; toMode(''); out.uncRings = out.uncRings;
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
  ok(r.lgQ && r.lgZ && r.lgOff,'légende : une ligne lisible (couleur = valeur, hachures = incertitude) selon la couche, masquée quand la couche est éteinte');
  ok(r.oneBtn && r.states==='unc,q,z,','un seul bouton « Cartes » à quatre états (incertitude, qualité, profondeur, éteint) et plus de bouton Incertitude séparé '+r.states);
  ok(r.scaleQ && r.scaleZ,'échelle de couleurs chiffrée sous la légende : qualité 0 à 100, profondeur en mètres du moins profond au plus profond '+JSON.stringify([r.scaleQtxt,r.scaleZtxt]));
  ok(r.uncHatch && r.uncRings,'état incertitude : hachures sur la carte et suggestions de mesure ('+r.uncRings+' anneaux)');
  ok(r.warnOk,'divergence avec la gravimétrie signalée seulement au-delà de 2 écarts-types');
  const nbr = await pg.evaluate(async()=>{ const out={}; const nb=gsNextBest('z'); out.n=nb.length; out.sep=nb.every((a,i)=>nb.every((b,j)=>i===j||Math.hypot(a.x-b.x,a.y-b.y)>=3)); out.sorted=nb.every((a,i)=>i===0||nb[i-1].pct>=a.pct-1e-9); out.noWell=nb.every(x=>!blocks[x.id].well&&!blocks[x.id].dryHole&&blocks[x.id].estimate?.prob===undefined);
    // la formule du gain est exacte : ajouter vraiment la mesure retire la part annoncée de variance pondérée
    const wts=()=>blocks.map(b=>{ if(b.well||b.dryHole) return 0.02; const e=b.estimate; return e&&e.prob!==undefined?e.prob:e&&e.structPos!==undefined?clamp(0.25+0.5*e.structPos,0.05,0.7):0.25; });
    const tot=()=>{ const S=gsSurface('z'), w=wts(); let t=0; for(let i=0;i<blocks.length;i++){ const u=S.sd[i]/S.sd0; t+=w[i]*u*u; } return t; };
    const t0=tot(), top=nb[0], b=blocks[top.id], S=gsSurface('z'), old=b.estimate; const sdMeas=Math.sqrt(0.5)*S.sd0;
    b.estimate={ ...(old||{}), depth:S.m[b.id], depthErr:sdMeas*Math.sqrt(3) }; GS_SURF_CACHE={}; const t1=tot(); b.estimate=old; GS_SURF_CACHE={};
    out.annonce=top.pct; out.reel=100*(t0-t1)/t0;
    // affichage : anneaux et pastilles seulement quand la couche est active, hors Découverte ; une pastille sélectionne le bloc
    out.offBefore=document.querySelectorAll('.block .krg-top').length+document.querySelectorAll('#krgTop button').length;
    { for(let k=0;k<5 && document.getElementById('krgBtn').dataset.mode!=='q';k++) document.getElementById('krgBtn').click(); } await new Promise(r=>setTimeout(r,150)); out.rings=document.querySelectorAll('.block .krg-top').length; out.chips=document.querySelectorAll('#krgTop button').length;
    const first=document.querySelector('#krgTop button'); const idc=+first.getAttribute('onclick').match(/\d+/)[0]; first.click(); await new Promise(r=>setTimeout(r,150)); out.picked=selectedBlock===idc;
    G.simple=true; krgUpdateTop(); out.simpleChips=document.querySelectorAll('#krgTop button').length; G.simple=false;
    for(let k=0;k<5 && document.getElementById('krgBtn').dataset.mode!=='';k++) document.getElementById('krgBtn').click(); await new Promise(r=>setTimeout(r,100)); out.offAfter=document.querySelectorAll('.block .krg-top').length+document.querySelectorAll('#krgTop button').length;
    return out; });
  ok(nbr.n===3 && nbr.sep && nbr.sorted && nbr.noWell,'où mesurer : trois blocs distants d\'au moins 3 cases, classés, ni forés ni déjà en 3D '+JSON.stringify([nbr.n,nbr.sep,nbr.sorted,nbr.noWell]));
  ok(Math.abs(nbr.reel-nbr.annonce)<=0.2*nbr.annonce+0.3,'le gain annoncé est exact : mesurer le bloc retire bien '+nbr.reel.toFixed(2)+' % d\'incertitude pondérée pour '+nbr.annonce.toFixed(2)+' % annoncés');
  ok(nbr.offBefore===0 && nbr.rings===3 && nbr.chips===3 && nbr.picked && nbr.simpleChips===0 && nbr.offAfter===0,'anneaux et pastilles : absents couche éteinte et en Découverte, trois quand la couche est active, la pastille sélectionne le bloc '+JSON.stringify([nbr.offBefore,nbr.rings,nbr.chips,nbr.picked,nbr.simpleChips,nbr.offAfter]));
  const lr = await pg.evaluate(async()=>{ document.getElementById('geoSeed').value='91'; menuConfig.mode='expert'; menuConfig.basinType='permian'; menuConfig.seed='91'; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); setSpeed(0); G.budget=90e6; LABOPT.pick=false; G.labOpt.pick=false; performStudy(null,'gravity');
    const n=Math.sqrt(blocks.length)|0, idOf=(x,y)=>blocks.find(b=>b.x===x&&b.y===y).id; for(const [a,b2] of [[idOf(1,2),idOf(n-2,2)],[idOf(1,5),idOf(n-2,5)],[idOf(1,n-3),idOf(n-2,n-3)]]){ G.sectionA=a; G.sectionB=b2; performStudy(null,'seismic2d'); }
    const land=blocks.filter(b=>!b.isOffshore&&!b.inSalt&&b.studies.some(s=>s.type==='seismic2d')); land.slice(0,14).forEach(b=>performStudy(b.id,'seismic3d'));
    const out={}; out.loo=gsLOO('q'); const D=GS_SURF.q.data(); out.n=D.d.length;
    // formule exacte contre calcul par retrait un à un (qualité : moyenne fixe, sans tendance)
    let maxd=0; for(let i=0;i<D.d.length;i++){ const rest=D.d.filter((_,k)=>k!==i); const f=gsKrigeFit(rest,[{x:D.d[i].x,y:D.d[i].y}],D.sd0,D.opt)[0]; const brute=D.d[i].v-f.m; maxd=Math.max(maxd,Math.abs(brute-out.loo.err[i])); } out.maxd=maxd;
    // fiabilité réelle de l'intervalle sur les blocs non mesurés, contre la couverture annoncée par la validation croisée
    const S=gsSurface('q'); let c=0,h=0; for(const b of blocks){ if(S.own[b.id]) continue; if(S.sd[b.id]/S.sd0>0.92) continue; c++; if(Math.abs(S.m[b.id]-b.trueQuality)<=1.64*S.sd[b.id]) h++; } out.real=h/c; out.c=c;
    for(let k=0;k<5 && document.getElementById('krgBtn').dataset.mode!=='q';k++) document.getElementById('krgBtn').click(); out.txt=document.getElementById('krgScale').textContent;
    const z=gsLOO('z'); out.zloo=z?{n:z.n,cov:z.cov}:null;
    return out; });
  ok(lr.n>=8 && lr.loo && lr.maxd<1e-6,'validation croisée : la formule exacte de Dubrule retrouve le retrait un à un sur '+lr.n+' mesures (écart max '+(lr.maxd&&lr.maxd.toExponential(1))+')');
  ok(lr.loo && lr.loo.cov>=0.6 && lr.loo.cov<=1 && lr.loo.rmsZ>0.3 && lr.loo.rmsZ<2.5 && Math.abs(lr.real-lr.loo.cov)<=0.25,'la couverture annoncée par la validation croisée ('+Math.round(lr.loo.cov*100)+' %) est proche de la couverture réelle sur la carte ('+Math.round(lr.real*100)+' %, '+lr.c+' blocs)');
  ok(/Validation croisée sur vos \d+ mesures/.test(lr.txt) && /intervalle à 90 %/.test(lr.txt),'l\'échelle affiche le résultat : '+lr.txt.replace(/\s+/g,' ').slice(-120));
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
