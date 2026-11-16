// Fracturation de la roche-mère (V4.92) : méthode « Horizontal + frac » (Junior et au-delà, à terre), qualité tirée de TOC, maturité, fragilité et épaisseur,
// déclin de shale, coût du drain et des étages, aucun effet de voisinage conventionnel, échec explicite sur roche-mère immature ou pauvre.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1280,height:800}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const R = await pg.evaluate(async()=>{ const o={}; document.getElementById('geoSeed').value='2468'; menuConfig.mode='junior'; menuConfig.basinType='aquitaine'; menuConfig.gridSize=12; menuConfig.offshore=false; labOptLaunch(); await new Promise(r=>setTimeout(r,1000)); setSpeed(0); LABOPT.pick=false;
    const flush=()=>{ [drillRevealCur, ...drillRevealQueue].forEach(it=>{ try{ drillRevealFlush(it); }catch(e){} }); drillRevealQueue.length=0; drillRevealPlaying=false; drillRevealBatch=[]; drillRevealRecapOpen=false; document.getElementById('drillRevealModal')?.classList.remove('open'); };
    const snap = blocks.map(b=>b.trueProbability+'|'+b.trueQuality).join(',');
    const land = blocks.filter(b=>!b.inSalt && !b.isOffshore), good = land.filter(b=>shaleTrue(b).ok), bad = land.filter(b=>{ const s=shaleTrue(b); return !s.ok && (s.why==='immature'||s.why==='toc'||s.why==='thin'); });
    o.nGood=good.length; o.nBad=bad.length; if(!good.length||!bad.length) return o;
    // fragilité : bornes et continuité spatiale
    const br = land.map(b=>shaleBrittle(b)); o.britRange = br.every(v=>v>=0.3 && v<=0.85); let dd=0,nn=0; land.forEach(b=>{ const n2=land.find(z=>z.x===b.x+1&&z.y===b.y); if(n2){ dd+=Math.abs(shaleBrittle(b)-shaleBrittle(n2)); nn++; } }); o.britSmooth = dd/nn < 0.12; o.britDet = land.slice(0,20).every(b=>shaleBrittle(b)===shaleBrittle(b));
    // méthode proposée en Junior
    G.budget=1e9; const g0=good[0]; g0.studyLevel=3; if(!g0.estimate) g0.estimate={structPos:0}; selectedBlock=g0.id; renderStudiesPanel(g0); const sel=document.getElementById('drillMethod'); o.opt=[...sel.options].map(x=>x.value); document.getElementById('drillMethod').value='frac'; updateDrillSummary(g0.id);
    o.sumNoRE = /Rock-Eval/.test(document.getElementById('drillSummary').textContent); o.latShown = document.getElementById('fracLat').style.display!=='none';
    // coût : drain + étages > horizontal, profondeur de la roche-mère plus grande que celle du réservoir
    o.deeper = fracDepthEstimate(g0) > drillDepthEstimate(g0); o.dearer = drillPlan(g0,'frac').cost > drillPlan(g0,'horizontal').cost;
    // forage d'un bloc exploitable
    const pickFar = (arr, not)=>arr.find(b=>!not.some(z=>Math.hypot(z.x-b.x,z.y-b.y)<4)) || arr[arr.length-1];
    const b1=g0, b2=pickFar(bad,[b1]); b2.studyLevel=3; const nb = land.find(z=>z.id!==b1.id && Math.hypot(z.x-b1.x,z.y-b1.y)>0.9 && Math.hypot(z.x-b1.x,z.y-b1.y)<1.1 && !z.well && !z.dryHole);
    const boost0 = discoveryBoost(nb);
    const pl = drillPlan(b1,'frac'); o.plan=!!pl.equip; const bud0=G.budget; drillBlock(b1.id,'frac',pl.equip||'renforce',null); o.paid = bud0-G.budget; o.expectCost = pl.cost; for(let i=0;i<24 && G.drilling.some(d=>d.blockId===b1.id); i++) monthTick(); flush();
    o.well = !!b1.well && b1.well.method==='frac'; o.dc = !!(b1.well && b1.well.comps[0].dc); o.ip = b1.well ? Math.round(b1.well.comps[0].q0) : 0;
    o.shaleIp = b1.fracInfo ? Math.round(b1.fracInfo.ip) : 0; o.boostAfter = discoveryBoost(nb); o.boostSame = Math.abs(boost0-o.boostAfter)<1e-9;
    // déclin raide : après 12 mois, entre 25 et 45 % du débit initial (conventionnel : plus de 80 %)
    if(b1.well){ const w=b1.well; w.monthsActive=12; const r12=wellRate(w)/w.comps[0].q0; o.r12=+r12.toFixed(2); w.monthsActive=0; }
    const dcConv = declineFactor(12); o.conv12=+dcConv.toFixed(2);
    // forage d'un bloc non exploitable
    const pl2=drillPlan(b2,'frac'); drillBlock(b2.id,'frac',pl2.equip||'renforce',null); for(let i=0;i<24 && G.drilling.some(d=>d.blockId===b2.id); i++) monthTick(); flush();
    o.dry = !!b2.dryHole && b2.dryHoleInfo.method==='frac' && !!b2.fracInfo && !!b2.fracInfo.why; o.why = b2.fracInfo?.why;
    o.revealHtml = fracRevealHtml(b2,false); o.revealOk = /Pas de production/.test(o.revealHtml) && /TOC/.test(o.revealHtml);
    // offshore et Découverte refusées
    const off = blocks.find(b=>b.isOffshore); o.offRefused = true; if(off){ off.studyLevel=3; const n0=G.drilling.length; drillBlock(off.id,'frac','renforce',null); o.offRefused = G.drilling.length===n0; }
    o.same = snap===blocks.map(b=>b.trueProbability+'|'+b.trueQuality).join(',');
    return o; });
  ok(R.nGood>0 && R.nBad>0, 'la carte offre des blocs exploitables ('+R.nGood+') et non exploitables ('+R.nBad+')');
  ok(R.britRange && R.britSmooth && R.britDet, 'fragilité : entre 30 et 85 %, continue dans l\'espace, déterministe');
  ok(R.opt && R.opt.includes('frac') && R.opt.includes('horizontal'), 'Junior propose « Horizontal + fracturation » '+JSON.stringify(R.opt));
  ok(R.sumNoRE && R.latShown, 'sans Rock-Eval, le résumé le dit et le choix de drain apparaît');
  ok(R.deeper && R.dearer, 'la roche-mère est visée plus profond et la frac coûte plus qu\'un drain horizontal');
  ok(R.well && R.dc && R.ip>0 && R.ip===R.shaleIp, 'forage sur roche-mère exploitable : puits fracturé productif à déclin de shale ('+R.ip+' par mois)');
  ok(Math.abs(R.paid-R.expectCost)<1, 'le coût payé égale le coût du plan ('+Math.round(R.paid)+')');
  ok(R.r12>=0.25 && R.r12<=0.45 && R.conv12>0.8, 'déclin : '+R.r12+' du débit initial après 12 mois (conventionnel '+R.conv12+')');
  ok(R.boostSame, 'une frac réussie ne rend pas les voisins conventionnels plus prometteurs');
  ok(R.dry && R.revealOk, 'bloc non exploitable : puits sec avec cause « '+R.why+' » expliquée');
  ok(R.offRefused, 'frac refusée en mer');
  ok(R.same, 'la vraie géologie est inchangée');
  const D = await pg.evaluate(async()=>{ menuConfig.mode='decouverte'; document.getElementById('geoSeed').value='808'; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); const b=blocks.find(x=>!x.inSalt); b.studyLevel=3; selectedBlock=b.id; renderStudiesPanel(b); return [...document.getElementById('drillMethod').options].map(x=>x.value); });
  ok(!D.includes('frac') && !D.includes('horizontal'), 'Découverte : ni horizontal ni frac '+JSON.stringify(D));
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
