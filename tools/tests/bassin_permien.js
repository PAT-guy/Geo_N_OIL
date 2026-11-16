// Bassin permien (V5.3) : colonne Delaware sous le sel de l'Ochoan avec roche-mère du Wolfcamp, à terre, majorité de blocs exploitables en frac, production avancée activée par défaut.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1280,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const R = await pg.evaluate(async()=>{ const o={};
    // interface
    o.btn = !!document.querySelector('#basinPicker button[data-val="permian"]'); o.quick = QUICK_BASINS.some(x=>x[0]==='permian'); o.name = BASIN_NAMES.permian; o.brief = /Wolfcamp/.test(BASIN_BRIEFS.permian) && /eau/i.test(BASIN_BRIEFS.permian);
    menuConfig.mode='junior'; menuConfig.basinType='permian'; labOptOpen('start'); o.advDefault = labOptDraft.advfluids===true; labOptClose(); menuConfig.basinType='paris'; labOptOpen('start'); o.advOther = labOptDraft.advfluids===false; labOptClose();
    // géologie
    document.getElementById('geoSeed').value='5'; menuConfig.mode='junior'; menuConfig.basinType='permian'; menuConfig.gridSize=12; menuConfig.offshore=false; LABOPT.advfluids=true; labOptLaunch(); await new Promise(r=>setTimeout(r,1000)); setSpeed(0); LABOPT.pick=false; checkEndConditions=function(){};
    const st={maps:0, off:0, noRes:0, oil:0, gas:0, shale:0, tot:0, srcMin:1e9, withSalt:0, maxP:[], names:{}, repro:true};
    for(let k=0;k<25;k++){ generateGeology(12,'permian',false,k*53+7); G.seedNum=k; G.basinType='permian'; st.maps++; blocks.forEach(b=>{ if(b.isOffshore) st.off++; if(!b.inSalt){ st.tot++; if(!b.horizons.some(h=>h.role==='reservoir')) st.noRes++; if(b.maturityClass==='Fenêtre à huile') st.oil++; if(b.maturityClass==='Surmature (gaz)') st.gas++; if(shaleTrue(b).ok) st.shale++; const sh=b.horizons.find(h=>h.role==='source'); if(sh) st.srcMin=Math.min(st.srcMin, sh.thicknessLocal??sh.thickness); b.horizons.forEach(h=>{ st.names[FRN(h.name)]=1; }); } }); if(blocks.some(b=>b.inSalt)) st.withSalt++; st.maxP.push(Math.max(...blocks.map(b=>b.trueProbability))); }
    o.st=st; o.names=Object.keys(st.names).filter(n=>/Wolfcamp|Barnett|Delaware|Cherry|Brushy|Bell Canyon|Salado|Castile|Rustler|Bone Spring|Avalon|Dockum|Ogallala|Pléistocène|Crétacé inférieur|socle/i.test(n)).length;
    // déterminisme
    generateGeology(12,'permian',false,99); const s1=blocks.map(b=>b.trueProbability+'|'+b.topOfReservoir).join(','); generateGeology(12,'permian',false,99); o.det = s1===blocks.map(b=>b.trueProbability+'|'+b.topOfReservoir).join(',');
    // bonus de shale du Permien
    G.basinType='permian'; const b0=blocks.find(b=>!b.inSalt&&!b.isOffshore); const pP=fracProdOf(60,50,2000,b0); G.basinType='aquitaine'; const pA=fracProdOf(60,50,2000,b0); o.bonus = Math.abs(pP/pA-1.45)<1e-9; G.basinType='permian';
    // partie jouable : une frac de bout en bout
    document.getElementById('geoSeed').value='77'; LABOPT.advfluids=true; labOptLaunch(); await new Promise(r=>setTimeout(r,1000)); setSpeed(0); LABOPT.pick=false; G.budget=1e9; G.price=80;
    const flush=()=>{ [drillRevealCur, ...drillRevealQueue].forEach(it=>{ try{ drillRevealFlush(it); }catch(e){} }); drillRevealQueue.length=0; drillRevealPlaying=false; drillRevealBatch=[]; drillRevealRecapOpen=false; document.getElementById('drillRevealModal')?.classList.remove('open'); };
    o.game = { basin:G.basinType, adv:G.advOn, simple:G.simple };
    const g=blocks.find(b=>!b.inSalt&&!b.isOffshore&&shaleTrue(b).ok); g.studyLevel=3; if(!g.estimate) g.estimate={structPos:0}; const pl=drillPlan(g,'frac'); drillBlock(g.id,'frac',pl.equip||'renforce',null); for(let i=0;i<24 && G.drilling.some(d=>d.blockId===g.id); i++) monthTick(); flush(); o.frac = !!g.well && g.well.method==='frac' && !!g.well.wp && g.well.wp.kind==='frac';
    return o; });
  const S=R.st;
  ok(R.btn && R.quick && /Permian|permien/i.test(R.name) && R.brief, 'interface : bouton du sélecteur de bassin, accueil rapide, nom, descriptif qui parle du Wolfcamp et de l\'eau');
  ok(R.advDefault && R.advOther, 'la production avancée est cochée par défaut pour le Permien, pas pour un autre bassin en Junior');
  ok(S.off===0 && S.noRes===0, 'à terre uniquement, un réservoir dans chaque colonne ('+S.maps+' cartes)');
  ok(S.oil/S.tot>0.7 && S.srcMin>=40, 'roche-mère mûre : '+Math.round(S.oil/S.tot*100)+' % en fenêtre à huile, '+Math.round(S.gas/S.tot*100)+' % en gaz ; épaisseur minimale '+Math.round(S.srcMin)+' m');
  ok(S.shale/S.tot>0.5, 'la frac est exploitable sur '+Math.round(S.shale/S.tot*100)+' % des blocs');
  ok(S.maxP.filter(p=>p>=0.25).length>=S.maps-1, 'au moins une province productive par carte (probabilité maximale ≥ 25 % sur '+S.maxP.filter(p=>p>=0.25).length+'/'+S.maps+' cartes)');
  ok(R.names>=8, 'la colonne porte les formations du Permien (Wolfcamp, Delaware, Salado, Rustler, Bone Spring…) : '+R.names+' noms reconnus');
  ok(R.det, 'génération déterministe par graine');
  ok(R.bonus, 'bonus de shale du Permien : production ×1,45 à qualité égale');
  ok(R.game.basin==='permian' && R.game.adv===true && R.game.simple===false && R.frac, 'partie permienne : production avancée active et une frac produit un puits avec profil de BSW de frac');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
