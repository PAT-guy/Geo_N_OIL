// Tutoriel, glossaire et guide à jour (V5.35) : bouton Cartes, krigeage, failles piège ou drain, étanchéité ; le guide signale une faille contre le bloc proposé.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1300,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const r = await pg.evaluate(async()=>{ const out={}; const openTuto=()=>{ document.getElementById('tutoModal') && 0; };
    // diapositives : on ouvre le tutoriel et on les parcourt
    const btn=document.getElementById('openTutorialBtn'); out.fn=!!btn; if(btn) btn.click();
    const titles=[], bodies=[]; for(let i=0;i<20;i++){ titles.push(document.getElementById('tutoSlideTitle').textContent); bodies.push(document.getElementById('tutoSlideBody').textContent); const nb=document.getElementById('tutoNextBtn'); if(/Terminer|Finish/.test(nb.textContent)) break; nb.click(); }
    out.titles=titles; out.all=bodies.join(' | ');
    // glossaire et réalité
    document.getElementById('geoSeed').value='12'; labOptLaunch(); await new Promise(r=>setTimeout(r,800)); document.getElementById('pauseMenu').classList.add('open'); showPauseView('glossary'); const g=document.getElementById('glossaryContent'); out.gl=g.textContent; out.real=[...g.querySelectorAll('#realitySection .glossary-term')].map(t=>[t.querySelector('.gl-tag').className, t.textContent.slice(0,60)]);
    document.getElementById('pauseMenu').classList.remove('open');
    // guide : bloc proposé touchant une faille
    let fe0=null; for(let sd=52; sd<140 && !fe0; sd++){ document.getElementById('geoSeed').value=String(sd); menuConfig.mode='expert'; menuConfig.basinType='rift'; menuConfig.seed=String(sd); labOptLaunch(); await new Promise(r=>setTimeout(r,300)); setSpeed(0); G.budget=90e6; LABOPT.pick=false; G.labOpt.pick=false; performStudy(null,'gravity');
      const n=Math.sqrt(blocks.length)|0, idOf=(x,y)=>blocks.find(b=>b.x===x&&b.y===y).id; for(const [a,b2] of [[idOf(1,2),idOf(n-2,2)],[idOf(1,5),idOf(n-2,5)],[idOf(1,n-3),idOf(n-2,n-3)]]){ G.sectionA=a; G.sectionB=b2; performStudy(null,'seismic2d'); } fe0=gsFaultEdges().list[0]; }
    const fe=fe0; const b=blocks[fe.a]; const h=guideGeoHint(b); out.hint=h; out.hintFault=/Ce bloc touche une faille (probable|possible)/.test(h) && /compartiment (relevé|abaissé)/.test(h); out.hintMap=/Le bouton Cartes montre en orange/.test(h);
    const plain=blocks.find(x=>!gsFaultEdges().byBlock[x.id]); out.hintPlain=!/Ce bloc touche une faille/.test(guideGeoHint(plain));
    G.simple=true; out.hintSimple=guideGeoHint(b)===''; G.simple=false;
    const gc=guideCompute(); out.guide=!!gc && typeof gc.text==='string';
    return out; });
  ok(r.fn && r.titles.length>=14,'le tutoriel s\'ouvre et compte '+r.titles.length+' diapositives');
  ok(r.titles.some(t=>/Incertitude et krigeage/.test(t)) && r.titles.some(t=>/Les failles : piège ou drain/.test(t)) && r.titles.some(t=>/Production avancée/.test(t)&&!/incertitude/.test(t)),'diapositives « Incertitude et krigeage » et « Les failles : piège ou drain » ajoutées, « Production avancée » recentrée '+JSON.stringify(r.titles.slice(4,9)));
  ok(/bouton Cartes|Cartes/.test(r.all) && /validation croisée/.test(r.all) && /anneaux orange/.test(r.all) && /prévu et le réel/.test(r.all),'le tutoriel décrit le bouton Cartes, les anneaux orange, la validation croisée et le prévu contre réel');
  ok(/trait rouge/.test(r.all) && /plein/.test(r.all) && /pointillé/.test(r.all) && /fenêtre de fuite/.test(r.all) && /SGR/.test(r.all) && /piège ou drain|piège ou un <b>drain|piège<\/b> ou un/.test(r.all),'le tutoriel explique les traits de faille, l\'étanchéité (fenêtre de fuite, SGR) et le rôle piège ou drain');
  ok(/une marche, pas une rampe/.test(r.all) && /aveugle/.test(r.all) && /s'arrête sur sa longueur/.test(r.all) && /Faille finie, faille aveugle/.test(r.gl) && r.real.some(x=>/Failles finies et aveugles dans le jeu/.test(x[1])&&/gl-jeu/.test(x[0])),'tutoriel et glossaire : marche contre rampe, failles finies et aveugles (réglage de jeu nommé dans « Réel ou simplifié ? »)');
  ok(!/bouton Incertitude de la carte hachure/.test(r.all) && !/bouton Krigeage/.test(r.all),'plus de trace des anciens boutons Incertitude et Krigeage');
  ok(/Krigeage/.test(r.gl) && /Rejet, compartiment relevé et abaissé/.test(r.gl) && /Piège de faille et drain/.test(r.gl) && /Shale Gouge Ratio/.test(r.gl),'glossaire : krigeage, rejet, piège de faille et drain, SGR et diagramme d\'Allan');
  ok(r.real.some(x=>/Krigeage de la carte/.test(x[1])&&/gl-approx/.test(x[0])) && r.real.some(x=>/Faille probable ou possible/.test(x[1])) && r.real.some(x=>/Étanchéité d'une faille/.test(x[1])&&/gl-approx/.test(x[0])) && r.real.some(x=>/Faille piège ou drain dans le jeu/.test(x[1])&&/gl-jeu/.test(x[0])),'« Réel ou simplifié ? » : krigeage, test de faille, étanchéité (approximations) et réglage de jeu des pièges et drains');
  ok(r.hintFault && r.hintMap && r.hintPlain && r.hintSimple && r.guide,'guide : signale une faille contre le bloc proposé (relevé ou abaissé) et rappelle les anneaux orange ; rien sur un bloc sans faille ni en Découverte');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
