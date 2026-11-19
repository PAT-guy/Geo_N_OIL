// Étanchéité d'une faille (V5.33) : juxtaposition (fenêtre de fuite) et Shale Gouge Ratio calculés sur la colonne du compartiment relevé et le rejet mesuré ; diagramme d'Allan simplifié sur la fiche du bloc.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1300,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const r = await pg.evaluate(async()=>{ const out={}; generateGeology(12,'permian',false,7000); const b=blocks.find(x=>!x.inSalt&&x.horizons.some(h=>h.role==='reservoir'&&h.thicknessLocal>40));
    const hr=b.horizons.find(h=>h.role==='reservoir').thicknessLocal; const mk=(T,sd=20)=>({ raised:b.id, jump:T, sd });
    // colonne type : une argile au-dessus du réservoir
    const big=gsFaultSeal(mk(hr*3)); out.hr=hr; out.big=big.verdict; out.bigLeak=big.leakFrac;
    // petit rejet : le réservoir fait face à lui-même ; l'argile au-dessus colmate (SGR élevé)
    const small=gsFaultSeal(mk(hr*0.3)); out.smallLeak=small.leakFrac; out.smallSgr=small.sgr; out.smallV=small.verdict;
    // sans argile au-dessus : plus de colmatage, la faille fuit
    const keep=b.horizons.map(h=>h.vshale); b.horizons.forEach(h=>{ if(h.role!=='reservoir') h.vshale=10; }); const dry=gsFaultSeal(mk(hr*0.3, 2)); out.dryV=dry.verdict; out.drySgr=dry.sgr; b.horizons.forEach((h,i)=>{ h.vshale=keep[i]; });
    // le rejet critique est celui où la fenêtre de fuite s'ouvre
    out.crit=small.critT; const below=gsFaultSeal(mk(small.critT*0.5)), above=gsFaultSeal(mk(small.critT*1.5)); out.critOk = below.leakFrac>0.15 && above.leakFrac<=0.15;
    // un verdict qui change dans la marge d'erreur du rejet est annoncé incertain
    b.horizons.forEach(h=>{ if(h.role!=='reservoir') h.vshale=10; }); const edge=gsFaultSeal(mk(hr*0.85, 25)); out.robust=edge.robust; out.edgeV=edge.verdict; b.horizons.forEach((h,i)=>{ h.vshale=keep[i]; });
    // fiche : section, diagramme, lignes
    document.getElementById('geoSeed').value='52'; menuConfig.mode='expert'; menuConfig.basinType='rift'; menuConfig.seed='52'; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); setSpeed(0); G.budget=90e6; LABOPT.pick=false; G.labOpt.pick=false; performStudy(null,'gravity');
    const n=Math.sqrt(blocks.length)|0, idOf=(x,y)=>blocks.find(b=>b.x===x&&b.y===y).id; for(const [a,b2] of [[idOf(1,2),idOf(n-2,2)],[idOf(1,5),idOf(n-2,5)],[idOf(1,n-3),idOf(n-2,n-3)]]){ G.sectionA=a; G.sectionB=b2; performStudy(null,'seismic2d'); }
    const FE=gsFaultEdges(); const e=FE.list[0]; selectedBlock=e.a; renderGeoPanel(blocks[e.a]); const gc=document.getElementById('geoContent'), t=gc.textContent;
    out.sec=/Étanchéité de la faille/.test(t) && /Fenêtre de fuite/.test(t) && /SGR/.test(t) && /Rejet critique/.test(t); out.svg=!!gc.querySelector('svg[role="img"] line') && gc.querySelectorAll('svg[role="img"] rect').length>6; out.verdictTxt=/Faille (plutôt étanche|plutôt fuyante|incertaine)/.test(t); out.note=/n'applique pas encore l'étanchéité/.test(t);
    out.noSeal=!/seul le forage tranche/.test(t); 
    // bloc sans faille : pas de section
    const nf=blocks.find(b=>!gsFaultEdges().byBlock[b.id]); selectedBlock=nf.id; renderGeoPanel(nf); out.none=!/Étanchéité de la faille/.test(document.getElementById('geoContent').textContent);
    return out; });
  ok(r.big==='scelle' && r.bigLeak===0,'grand rejet (3 fois le réservoir) : le réservoir fait face à autre chose, la faille scelle par juxtaposition (réservoir '+Math.round(r.hr)+' m)');
  ok(r.smallLeak>0.5 && r.smallSgr>=0.25 && r.smallV==='scelle','petit rejet sous une argile : le réservoir fait face à lui-même ('+Math.round(r.smallLeak*100)+' %) mais l\'argile colmate (SGR '+Math.round(r.smallSgr*100)+' %), elle scelle');
  ok(r.dryV==='fuit' && r.drySgr<0.15,'petit rejet sans argile au-dessus : plus de colmatage, la faille fuit (SGR '+Math.round(r.drySgr*100)+' %)');
  ok(r.critOk,'le rejet critique ('+Math.round(r.crit)+' m) sépare bien fenêtre de fuite ouverte et fermée');
  ok(r.robust===false && r.edgeV==='incertain','un verdict qui change dans la marge d\'erreur du rejet est annoncé incertain');
  ok(r.sec && r.verdictTxt && r.note,'fiche du bloc : section « Étanchéité de la faille », verdict, fenêtre de fuite, SGR, rejet critique et mention de ce que le jeu n\'applique pas');
  ok(r.svg,'diagramme d\'Allan : deux colonnes décalées du rejet, plan de faille et barre de face à face');
  ok(r.noSeal && r.none,'plus de phrase « seul le forage tranche » ; pas de section sur un bloc sans faille détectée');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
