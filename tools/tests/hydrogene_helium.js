// Mode Hydrogène et hélium (V5.24) : deux géologies tirées par la graine, ressource et cours propres, pureté du gaz, charge continue (hydrogène), fuite par la couverture, analyse du socle, sauvegarde.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1300,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  ok(await pg.evaluate(()=>!!document.querySelector('#quickModes .q-mode[data-mode="h2he"]') && !!document.querySelector('.mode-card[data-mode="h2he"]') && !!document.querySelector('#basinPicker button[data-val="hydrogen"]') && !!document.querySelector('#basinPicker button[data-val="helium"]')),'accueil : mode Hydrogène et hélium, bassins Hydrogène et Hélium');
  const m = await pg.evaluate(()=>({ cfg:MODES.h2he, name:MODE_NAMES.h2he }));
  ok(m.cfg.budget===10e6 && m.cfg.winGoal===30e6 && m.cfg.maxYears===20 && m.cfg.basinChoices.length===2,'mode : 10 M$, objectif 30 M$, 20 ans, deux bassins possibles '+m.name);
  // le tirage du bassin suit la graine
  const start = async (seed)=>pg.evaluate(async sd=>{ document.getElementById('geoSeed').value=String(sd); menuConfig.mode='h2he'; menuConfig.basinType='random'; menuConfig.seed=String(sd); labOptLaunch(); await new Promise(r=>setTimeout(r,900)); setSpeed(0); return { basin:G.basinType, res:G.resource, fin:G.financeMode, gas:blocks.every(b=>b.isGas), unit:document.querySelector('#hudPrice + .hud-unit').textContent, price:document.getElementById('hudPrice').textContent, alertHidden:getComputedStyle(document.getElementById('btnPriceAlert')).display==='none' }; }, seed);
  const sA = await start(1001), sB = await start(1002), sA2 = await start(1001);
  ok(sA.basin!==sB.basin && sA.basin===sA2.basin && ['hydrogen','helium'].includes(sA.basin),'la graine fixe le bassin (hydrogène ou hélium), de façon reproductible '+[sA.basin,sB.basin,sA2.basin]);
  ok(sA.gas && (sA.res==='h2'||sA.res==='he') && sB.gas,'tous les blocs sont à gaz et la ressource de la partie est définie '+sA.res+' / '+sB.res);
  const h2g = sA.res==='h2' ? sA : sB, heg = sA.res==='he' ? sA : sB;
  ok(h2g.unit==='$/kg' && h2g.price.replace(',','.')==='1.70' && heg.unit==='$/Mcf' && heg.price==='400' && h2g.alertHidden,'en-tête : cours en $/kg (hydrogène) ou en $/Mcf (hélium), alerte de prix du brut masquée '+JSON.stringify([h2g.unit,h2g.price,heg.unit,heg.price]));
  // pureté, fuite, charge continue, économie
  const r = await pg.evaluate(()=>{ const out={};
    for(const bt of ['hydrogen','helium']){ generateGeology(12, bt, false, 777); const k=RESOURCE_BASINS[bt]; G.resource=k; const pu=blocks.map(b=>blockPurity(b)); out[bt]={ min:Math.min(...pu), max:Math.max(...pu), again:blocks.slice(0,20).every(b=>blockPurity(b)===blockPurity(b)) }; }
    // fuite : même facteurs, couverture moyenne, p plus faible quand la puissance est 1,6
    ROSE_SEAL_POW=1; const p1=roseP(.8,.8,.5,.8); ROSE_SEAL_POW=1.6; const p2=roseP(.8,.8,.5,.8); const p3=roseP(.8,.8,.95,.8); ROSE_SEAL_POW=1; out.leak={p1,p2,p3};
    // charge continue : plancher de 20 % pour l'hydrogène, épuisement pour l'hélium
    out.decl={ h2:declineFactor(400, RESOURCES.h2.decl), he:declineFactor(400, RESOURCES.he.decl), he0:declineFactor(0, RESOURCES.he.decl) };
    // économie : revenu = production × cours × pureté
    G.resource='he'; generateGeology(12,'helium',false,777); G.price=80; const b=blocks[10]; const w={ blockId:b.id, status:'producing', production:1000, comps:[{q0:1000,t0:0}], monthsActive:0, isGas:true, res:'he', purity:0.05, offshore:false, cost:1e6 }; const e=wellEconomicsRaw(w);
    out.eco={ rev:e.revenue, expect:1000*400*0.05, opexVar:(e.opex-8000)/1000, expectVar:RESOURCES.he.varOp };
    G.price=40; out.eco2=wellEconomicsRaw(w).revenue; G.price=80;
    // frac refusée
    G.mode='junior'; G.simple=false; const bb=blocks.find(x=>!x.isOffshore && !x.inSalt); G.budget=50e6; performStudy(null,'gravity'); const nd=G.drilling.length; drillBlock(bb.id,'frac','standard'); out.fracRefused=G.drilling.length===nd;
    return out; });
  ok(r.hydrogen.min>=0.35 && r.hydrogen.max<=0.97 && r.hydrogen.max>0.8,'pureté de l\'hydrogène : 35 à 97 % '+r.hydrogen.min.toFixed(2)+' à '+r.hydrogen.max.toFixed(2));
  ok(r.helium.min>=0.003 && r.helium.max<=0.09 && r.helium.max>0.03,'teneur en hélium : 0,3 à 9 % '+(r.helium.min*100).toFixed(1)+' à '+(r.helium.max*100).toFixed(1)+' %');
  ok(r.leak.p2<r.leak.p1*0.8 && r.leak.p3>r.leak.p2,'l\'hydrogène fuit : une couverture médiocre coûte plus cher qu\'en pétrole, une excellente le garde '+JSON.stringify([r.leak.p1.toFixed(3),r.leak.p2.toFixed(3),r.leak.p3.toFixed(3)]));
  ok(r.decl.h2>=0.2-1e-9 && r.decl.h2<0.21 && r.decl.he<0.2 && r.decl.he0===1,'charge continue : plancher de 20 % pour l\'hydrogène, l\'hélium s\'épuise '+JSON.stringify(r.decl));
  ok(Math.abs(r.eco.rev-r.eco.expect)<1 && Math.abs(r.eco.opexVar-r.eco.expectVar)<1e-6,'économie : revenu = gaz brut × cours × teneur, coût variable propre à la ressource '+JSON.stringify(r.eco));
  ok(Math.abs(r.eco2-r.eco.rev/2)<1,'le revenu suit le cours du marché (indice 40 : moitié)');
  ok(r.fracRefused,'pas de fracturation de shale pour ces ressources');
  // forage, analyse du socle, puits avec pureté
  const d = await pg.evaluate(async()=>{ document.getElementById('geoSeed').value='1001'; menuConfig.mode='h2he'; menuConfig.basinType='random'; menuConfig.seed='1001'; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); setSpeed(0); G.budget=30e6; LABOPT.pick=false; G.labOpt.pick=false; performStudy(null,'gravity');
    const c=blocks.filter(b=>!b.inSalt&&!b.isOffshore).sort((a,z)=>z.trueProbability-a.trueProbability); let well=null; for(const b of c.slice(0,10)){ drillBlock(b.id,'vertical','renforce'); for(let i=0;i<40&&G.drilling.length;i++) monthTick(); drillRevealQueue.length=0; drillRevealPlaying=false; document.getElementById('drillRevealModal')?.classList.remove('open'); document.getElementById('alertModal')?.classList.remove('open'); if(b.well){ well=b; break; } }
    if(!well) return { err:'aucun puits' }; const w=well.well; performStudy(well.id,'rockeval'); selectedBlock=well.id; renderGeoPanel(well); renderStudiesPanel(well);
    return { res:w.res, purity:w.purity, inRange:w.purity>=0.003 && w.purity<=0.97, mult:w.production, floor:!!(w.comps[0].dc), rockeval:well.estimate && well.estimate.rockeval && well.estimate.rockeval.res===true, geoHtml:document.getElementById('geoContent').innerHTML.includes('Analyse du gaz du socle'), studyName:STUDIES.rockeval.name, hud:document.getElementById('hudPrice').textContent }; });
  ok(!d.err,'un puits productif est obtenu pour le test '+(d.err||''));
  ok(d.res===G_res(d) && d.inRange && d.floor,'le puits porte sa ressource, sa pureté et sa courbe de déclin propre '+JSON.stringify([d.res,d.purity&&d.purity.toFixed(3)]));
  function G_res(x){ return x.res; }
  ok(d.rockeval && d.geoHtml && /socle/.test(d.studyName),'l\'étude de géochimie devient l\'analyse du gaz du socle : « '+d.studyName+' »');
  // sauvegarde et chargement : la ressource et la puissance de couverture sont rétablies
  const sv = await pg.evaluate(()=>{ const k=G.resource, sp=ROSE_SEAL_POW; saveGame(); ROSE_SEAL_POW=1; G.resource='oil'; loadGame(); return { k, kAfter:G.resource, sp, spAfter:ROSE_SEAL_POW }; });
  ok(sv.kAfter===sv.k && sv.spAfter===sv.sp,'sauvegarde : ressource et puissance de couverture rétablies au chargement '+JSON.stringify(sv));
  const sv2 = await pg.evaluate(async()=>{ document.getElementById('geoSeed').value='1002'; menuConfig.mode='h2he'; menuConfig.basinType='random'; menuConfig.seed='1002'; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); setSpeed(0); const k=G.resource, sp=ROSE_SEAL_POW; saveGame(); ROSE_SEAL_POW=1; G.resource='oil'; loadGame(); return { k, kAfter:G.resource, sp, spAfter:ROSE_SEAL_POW }; });
  ok(sv2.k==='h2' && sv2.sp===1.6 && sv2.kAfter==='h2' && sv2.spAfter===1.6,'sauvegarde d\'une partie d\'hydrogène : la fuite par la couverture (puissance 1,6) est rétablie '+JSON.stringify(sv2));
  // levé de gaz du sol (V5.25) : propre au mode, sans forage, dit la charge du socle et signale une couverture suspecte
  const sg = await pg.evaluate(async()=>{ document.getElementById('geoSeed').value='1002'; menuConfig.mode='h2he'; menuConfig.basinType='random'; menuConfig.seed='1002'; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); setSpeed(0); G.budget=30e6; performStudy(null,'gravity');
    const land = blocks.filter(b=>!b.inSalt && !b.isOffshore && b.genStrength!=null); const rich = land.slice().sort((a,z)=>z.genStrength-a.genStrength)[0], poor = land.slice().sort((a,z)=>a.genStrength-z.genStrength)[0];
    const b0 = G.budget; performStudy(rich.id,'soilgas'); const cost = b0-G.budget; performStudy(poor.id,'soilgas'); selectedBlock=rich.id; renderGeoPanel(rich); renderStudiesPanel(rich);
    const kn = blockKnowledge(rich).find(k=>/Socle/.test(k.n)); const again = G.budget; performStudy(rich.id,'soilgas');
    // une série de blocs : le signal suit la charge
    const srt = land.slice().sort((a,z)=>a.genStrength-z.genStrength), n3 = Math.floor(srt.length/3); const mean = arr => arr.reduce((t,b)=>t+STUDIES.soilgas.do(b, makeRng(7+b.id)).raw,0)/arr.length; const hiMean0 = mean(srt.slice(-n3)), loMean0 = mean(srt.slice(0,n3));
    const html = blockStudiesHtml(rich);
    return { cost, richDone:rich.studies.some(s=>s.type==='soilgas'), poorDone:poor.studies.some(s=>s.type==='soilgas'), knSt:kn&&kn.st, knTxt:kn&&kn.t, noDouble:again===G.budget, hiMean:hiMean0, loMean:loMean0, hasRow:/Levé de gaz du sol|Soil gas survey/.test(html), name:STUDIES.soilgas.name }; });
  ok(sg.cost===38e3 && sg.richDone && sg.poorDone && sg.noDouble,'levé de gaz du sol : 38 k$, sans forage, une seule fois par bloc '+sg.cost);
  ok(sg.knSt==='ind' && /Gaz du sol/.test(sg.knTxt||''),'la carte « Socle (charge) » affiche l\'anomalie : '+sg.knTxt);
  ok(sg.hasRow && sg.hiMean>sg.loMean+0.15,'le signal suit la charge du socle (tiers riche '+sg.hiMean.toFixed(2)+' contre tiers pauvre '+sg.loMean.toFixed(2)+') et figure dans la liste des études');
  const oil0 = await pg.evaluate(async()=>{ document.getElementById('geoSeed').value='55'; menuConfig.mode='junior'; menuConfig.basinType='paris'; menuConfig.seed='55'; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); setSpeed(0); return !/Levé de gaz du sol|Soil gas survey/.test(blockStudiesHtml(blocks[5])); });
  ok(oil0,'le levé de gaz du sol n\'apparaît pas en jeu pétrolier');
  // un jeu pétrolier reste inchangé
  const oil = await pg.evaluate(async()=>{ document.getElementById('geoSeed').value='55'; menuConfig.mode='junior'; menuConfig.basinType='paris'; menuConfig.seed='55'; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); setSpeed(0); return { res:G.resource, unit:document.querySelector('#hudPrice + .hud-unit').textContent, sp:ROSE_SEAL_POW, price:document.getElementById('hudPrice').textContent, st:STUDIES.rockeval.name, alert:getComputedStyle(document.getElementById('btnPriceAlert')).display!=='none' }; });
  ok(oil.res==='oil' && oil.unit==='$/bbl' && oil.sp===1 && oil.alert && /Rock-Eval/.test(oil.st),'jeu pétrolier inchangé : brut en $/bbl, Rock-Eval, alerte de prix');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
