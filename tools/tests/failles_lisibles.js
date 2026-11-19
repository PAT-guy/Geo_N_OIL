// Failles lisibles (V5.32) : un saut de profondeur entre voisins n'est une faille que s'il dépasse le bruit de la mesure. Détection mesurée contre le tracé vrai des failles, carte, fiche du bloc, coupe.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1300,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const r = await pg.evaluate(async()=>{ const out={ probable:{n:0,tp:0}, possible:{n:0,tp:0}, old:{n:0,tp:0}, truth:0, maps:0 }; let sample=null;
    for(const [bt,sd] of [['paris','51'],['rift','52'],['permian','53'],['north_sea','54'],['aquitaine','55'],['passive','56'],['gulf_coast','57'],['foreland','58'],['rift','59'],['paris','60'],['rift','61'],['aquitaine','62']]){
      document.getElementById('geoSeed').value=sd; menuConfig.mode='expert'; menuConfig.basinType=bt; menuConfig.seed=sd; labOptLaunch(); await new Promise(r=>setTimeout(r,120)); setSpeed(0); G.budget=90e6; LABOPT.pick=false; G.labOpt.pick=false; performStudy(null,'gravity');
      if(out.maps===0){ out.noneBefore = gsFaultEdges().list.length; }
      const n=Math.sqrt(blocks.length)|0, idOf=(x,y)=>(blocks.find(b=>b.x===x&&b.y===y)||blocks[0]).id; for(const [a,b2] of [[idOf(1,2),idOf(n-2,2)],[idOf(1,5),idOf(n-2,5)],[idOf(1,n-3),idOf(n-2,n-3)]]){ G.sectionA=a; G.sectionB=b2; performStudy(null,'seismic2d'); }
      out.maps++; const F=LAST_FAULTS, side=(f,b)=>(b.x-f.px)*f.nx+(b.y-f.py)*f.ny, at=(x,y)=>blocks.find(b=>b.x===x&&b.y===y);
      const isTrue=(b,c)=>F.some(f=>Math.abs(f.throw)>60 && Math.sign(side(f,b))!==Math.sign(side(f,c)));
      for(const b of blocks){ for(const [dx,dy] of [[1,0],[0,1]]){ const c=at(b.x+dx,b.y+dy); if(!c||b.inSalt||c.inSalt||b.isOffshore||c.isOffshore) continue; const t=gsFaultTest(b,c); if(!t) continue; const tr=isTrue(b,c); if(tr) out.truth++;
        if(t.level==='probable'){ out.probable.n++; if(tr) out.probable.tp++; } if(t.level){ out.possible.n++; if(tr) out.possible.tp++; } if(t.jump>120){ out.old.n++; if(tr) out.old.tp++; } } }
    }
    // carte de démonstration : rift, graine 52 (plusieurs failles détectables)
    document.getElementById('geoSeed').value='52'; menuConfig.mode='expert'; menuConfig.basinType='rift'; menuConfig.seed='52'; labOptLaunch(); await new Promise(r=>setTimeout(r,500)); setSpeed(0); G.budget=90e6; LABOPT.pick=false; G.labOpt.pick=false; performStudy(null,'gravity');
    { const n=Math.sqrt(blocks.length)|0, idOf=(x,y)=>blocks.find(b=>b.x===x&&b.y===y).id; for(const [a,b2] of [[idOf(1,2),idOf(n-2,2)],[idOf(1,5),idOf(n-2,5)],[idOf(1,n-3),idOf(n-2,n-3)]]){ G.sectionA=a; G.sectionB=b2; performStudy(null,'seismic2d'); } const FE0=gsFaultEdges(); sample={ FE:FE0, e:FE0.list[0], n, idOf }; rerenderAllBlocks(); }
    // carte, fiche et coupe sur une carte à faille
    const { FE, e, n, idOf } = sample; out.demoOk=!!e; out.listN=FE.list.length; out.feDom=document.querySelectorAll('.block .fe').length; out.cls=[...document.querySelectorAll('.block .fe')].every(x=>x.classList.contains('probable')||x.classList.contains('possible'));
    out.titles=[...document.querySelectorAll('.block .fe')].every(x=>/Faille (probable|possible)/.test(x.getAttribute('title')||''));
    out.raised = blocks[e.raised].estimate.depth < blocks[e.lowered].estimate.depth;
    selectedBlock=e.a; renderGeoPanel(blocks[e.a]); out.card=/Faille (probable|possible) entre ce bloc et \(\d+,\d+\)/.test(document.getElementById('geoContent').textContent) && /compartiment (relevé|abaissé)/.test(document.getElementById('geoContent').textContent);
    out.legend=!!document.querySelector('#mapLegend .lg-mk') && /Faille probable \(trait plein\) ou possible \(pointillé\)/.test(document.getElementById('mapLegend').textContent);
    G.sectionA=idOf(1,5); G.sectionB=idOf(n-2,5); renderSection(); out.secFault=/F ~\d+m/.test(document.getElementById('sectionSvg').innerHTML); out.secText=/Faille (probable|possible)|failles détectées/.test(document.getElementById('sectionInterpret').textContent);
    // profils différents : erreurs indépendantes, le test est plus prudent
    const b1=blocks.find(b=>b.studies.some(s=>s.type==='seismic2d')); const c1=blocks.find(b=>b.id!==b1.id && b.studies.some(s=>s.type==='seismic2d') && b.studies.find(s=>s.type==='seismic2d').result.profile!==b1.studies.find(s=>s.type==='seismic2d').result.profile);
    if(c1){ const t=gsFaultTest(b1,c1); out.cross = t && t.same2d===false; }
    return out; });
  const prec = r.probable.tp/Math.max(1,r.probable.n), rec = r.probable.tp/Math.max(1,r.truth), precOld = r.old.tp/Math.max(1,r.old.n), recOld = r.old.tp/Math.max(1,r.truth);
  ok(r.noneBefore===0,'sans mesure, aucune faille n\'est affichée');
  ok(r.probable.n>=10 && prec>=0.45 && (r.probable.n-r.probable.tp) <= 0.4*(r.old.n-r.old.tp),'failles probables : '+Math.round(prec*100)+' % sont de vraies failles ('+r.probable.tp+'/'+r.probable.n+'), contre '+Math.round(precOld*100)+' % pour l\'ancien critère saut > 120 m ('+r.old.tp+'/'+r.old.n+')');
  ok(rec>=0.3,'rappel des failles probables : '+Math.round(rec*100)+' % des '+r.truth+' vraies failles entre blocs mesurés ('+Math.round(recOld*100)+' % pour l\'ancien critère, au prix de '+(r.old.n-r.old.tp)+' fausses alertes contre '+(r.probable.n-r.probable.tp));
  ok(r.listN>0 && r.feDom>=r.listN && r.cls && r.titles,'carte : un trait rouge par faille détectée, plein (probable) ou pointillé (possible), avec une infobulle qui chiffre le saut et son écart-type ('+r.feDom+' traits)');
  ok(r.raised && r.card,'fiche du bloc : carte « Faille » (rejet, écart-type, compartiment relevé ou abaissé, lien avec la roche-mère)');
  ok(r.legend,'légende de la carte : faille probable (trait plein) ou possible (pointillé)');
  ok(r.secFault && r.secText,'coupe : trait de faille et texte d\'interprétation fondés sur le même test');
  ok(r.cross!==false,'deux blocs de profils différents n\'ont pas la corrélation d\'un même profil');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
