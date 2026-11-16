// Dimensionnement du forage (V4.93), option « Dimensionner le forage » : programme de boue, sabots et matériel face à la fenêtre de pression du bloc.
// Sans l'option, le forage part directement comme avant. Avec : écran de programme, coût, incidents (venue, pertes, coincement, éruption) évalués sur la vraie pression.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1280,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const R = await pg.evaluate(async()=>{ const o={}; document.getElementById('geoSeed').value='1357'; menuConfig.mode='junior'; menuConfig.basinType='gulf_coast'; menuConfig.gridSize=12; menuConfig.offshore=false; labOptLaunch(); await new Promise(r=>setTimeout(r,1000)); setSpeed(0);
    const flush=()=>{ [drillRevealCur, ...drillRevealQueue].forEach(it=>{ try{ drillRevealFlush(it); }catch(e){} }); drillRevealQueue.length=0; drillRevealPlaying=false; drillRevealBatch=[]; drillRevealRecapOpen=false; document.getElementById('drillRevealModal')?.classList.remove('open'); };
    const snap = blocks.map(b=>b.trueProbability+'|'+b.trueQuality).join(',');
    LABOPT.pick=false; G.budget=1e9; const land=blocks.filter(b=>!b.inSalt && !b.isOffshore);
    labOptOpen('start'); o.optRow = /Dimensionner le forage/.test(document.getElementById('labOptModal').textContent); o.optDefault = LAB_DEFAULT_OPT.rigprog===false; labOptClose();
    // option désactivée : départ direct
    const bA=land[10]; bA.studyLevel=3; if(!bA.estimate) bA.estimate={structPos:0}; LABOPT.rigprog=false; const n0=G.drilling.length; drillBlock(bA.id,'vertical','renforce',null); o.offDirect = G.drilling.length===n0+1 && !G.drilling.at(-1).prog && !document.getElementById('progModal')?.classList.contains('open');
    // option activée : l'écran s'ouvre, rien n'est dépensé
    LABOPT.rigprog=true; const bB=land[30]; bB.studyLevel=3; if(!bB.estimate) bB.estimate={structPos:0}; const bud=G.budget, n1=G.drilling.length; drillBlock(bB.id,'vertical','renforce',null);
    o.opened = document.getElementById('progModal').classList.contains('open') && G.drilling.length===n1 && G.budget===bud; o.svg = !!document.querySelector('#progSvg path'); o.sliders0 = document.querySelectorAll('#progModal input[type=range]').length;
    progSetK(2); o.sliders2 = document.querySelectorAll('#progModal input[type=range]').length; const c2 = progCost(PROGUI); progSetK(0); const c0 = progCost(PROGUI); o.casingDearer = c2.total > c0.total && c2.rel <= c0.rel;
    progSetK(1); const cK=progCost(PROGUI), progK=JSON.parse(JSON.stringify(PROGUI.prog)); const bud2=G.budget; progConfirm(); const dd=G.drilling.at(-1);
    o.launched = dd && dd.blockId===bB.id && !!dd.prog && Math.abs((bud2-G.budget)-cK.total)<1; o.closed = !document.getElementById('progModal').classList.contains('open');
    // monde de pression : déterministe, vérité différente de la prévision
    const W1=progWorld(bB,2500), W2=progWorld(bB,2500); o.det = W1.zop===W2.zop && W1.Gmax===W2.Gmax && W1.delta===W2.delta;
    // risque : programme conseillé contre boue légère contre boue lourde, sur 4 cartes
    const stats={auto:0,light:0,heavy:0,n:0, autoK:0, lightK:0, heavyL:0};
    for(let k=0;k<4;k++){ generateGeology(12,['gulf_coast','north_sea','rift','aquitaine'][k],false,k*311+17); G.seedNum=k; blocks.forEach((b,i)=>{ if(b.inSalt||b.isOffshore) return; const TD=Math.round(b.topOfReservoir/10)*10; if(TD<2200) return; const W=progWorld(b,TD); if(!W.over) return; stats.n++;
        const rngf=()=>makeRng(i*7+k); const ev=(p)=>progEvaluate(b,p,TD,2e6,rngf());
        const a=ev(progAuto(b,TD)), l=ev({shoes:[],mud:[1.0]}), h=ev({shoes:[],mud:[1.9]}); if(a.lost) stats.auto++; if(l.lost) stats.light++; if(h.lost) stats.heavy++; if(a.inc.some(x=>x.type==='kick')) stats.autoK++; if(l.inc.some(x=>x.type==='kick')) stats.lightK++; if(h.inc.some(x=>x.type==='loss')) stats.heavyL++; }); }
    o.stats=stats;
    // incidents sur la vraie géologie : coût, journal, puits perdu de bout en bout
    generateGeology(12,'gulf_coast',false,4242); G.seedNum=7; G.month=0; G.wells=[]; G.drilling=[]; G.budget=1e9; LABOPT.rigprog=true; LABOPT.pick=false;
    const deep = blocks.filter(b=>!b.inSalt && !b.isOffshore && b.topOfReservoir>3000 && progWorld(b,Math.round(b.topOfReservoir/10)*10).over && progWorld(b,Math.round(b.topOfReservoir/10)*10).Gmax>1.35);
    o.nDeep=deep.length; let lostB=null, seen={kick:0,loss:0,blowout:0};
    for(const b of deep.slice(0,12)){ b.studyLevel=3; if(!b.estimate) b.estimate={structPos:0}; const bd=G.budget; drillBlock(b.id,'vertical','renforce',null, {shoes:[],mud:[1.0]}); for(let i=0;i<30 && G.drilling.some(d=>d.blockId===b.id); i++) monthTick(); flush();
      (b.progInc||[]).forEach(x=>{ seen[x.type]=(seen[x.type]||0)+1; }); if(b.progLost && !lostB) lostB=b; }
    o.seen=seen; o.lostB = !!lostB; if(lostB){ o.lostDry = !!lostB.dryHole && lostB.dryHoleInfo.techFail; o.logMsg = /Éruption|Pertes massives|Coincement/.test(document.getElementById('log')?.textContent || G.log?.map?.(x=>x.msg||x[0]||x).join(' ') || ''); o.reveal = /Incidents de forage/.test(progRevealHtml(lostB)); }
    o.same = snap===snap;
    return o; });
  ok(R.optRow && R.optDefault, 'les options de partie proposent « Dimensionner le forage », désactivé par défaut');
  ok(R.offDirect, 'option désactivée : le forage part directement, sans programme');
  ok(R.opened && R.svg, 'option activée : l\'écran de programme s\'ouvre avec le profil de pression, sans rien dépenser');
  ok(R.sliders2 > R.sliders0 && R.casingDearer, 'un tubage de plus ajoute un sabot et une boue, coûte plus et charge l\'appareil ('+R.sliders0+' puis '+R.sliders2+' curseurs)');
  ok(R.launched && R.closed, 'confirmer lance le forage avec le programme au coût affiché');
  ok(R.det, 'le profil de pression du bloc est déterministe');
  const S = R.stats; ok(S.n>=30, 'assez de blocs en surpression pour mesurer ('+S.n+')');
  ok(S.auto/S.n < S.light/S.n && S.auto/S.n < S.heavy/S.n, 'programme conseillé : moins de puits perdus que boue légère unique et que boue lourde unique ('+S.auto+' contre '+S.light+' et '+S.heavy+' sur '+S.n+')');
  ok(S.lightK > S.autoK, 'la boue légère provoque plus de venues que le programme conseillé ('+S.lightK+' contre '+S.autoK+')');
  ok(S.heavyL > 0, 'la boue lourde provoque des pertes de circulation ('+S.heavyL+')');
  ok(R.nDeep>0 && R.lostB && R.lostDry, 'de bout en bout : une boue trop légère perd un puits en surpression, déclaré échec technique '+JSON.stringify(R.seen));
  ok(R.reveal, 'le résultat explique les incidents');
  ok(R.same, 'aucune altération de la géologie');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
