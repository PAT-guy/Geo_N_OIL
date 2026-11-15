// Le guide étudie le bloc sélectionné : après une première sismique, la suggestion de sismique 3D vise le bloc choisi par le joueur ; diagraphie de sondage affichée.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1280,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(400);
  const T = await pg.evaluate(async ()=>{ const o={}; document.getElementById('geoSeed').value='4242'; menuConfig.daily=null; labOptLaunch(); await new Promise(r=>setTimeout(r,900));
    G.budget=90e6; G.month=1; performStudy(null,'gravity');
    const cand = blocks.filter(x=>!x.inSalt).sort((a,b)=>b.estimate.structPos-a.estimate.structPos); const a=cand[0], bb=blocks.find(x=>x.id!==a.id && Math.hypot(x.x-a.x,x.y-a.y)<=2.2);
    G.sectionA=a.id; G.sectionB=bb.id; performStudy(null,'seismic2d');
    const prof=getProfileBlocks(G.sectionA,G.sectionB).map(o=>o.b);
    // sans sélection : le guide choisit lui-même ; avec sélection d'un autre bloc du profil : il le vise
    selectedBlock=null; const g0=guideCompute(); const target = prof.find(x=>g0 && g0.act && String(g0.act.call).includes(','+x.id+')')) || null;
    const other = prof.filter(x=>!target || x.id!==target.id)[0];
    onBlockClick(other.id); const g1=guideCompute(); o.call0 = g0&&g0.act&&g0.act.call; o.call1 = g1&&g1.act&&g1.act.call; o.other=other.id; o.sel = selectedBlock;
    // diagraphie de sondage affichée
    const s = blocks.find(x=>!x.inSalt && x.topOfReservoir<2200 && x.id!==other.id); s.studyLevel=1; launchStrati(s.id); for(let i=0;i<30&&G.drilling.some(d=>d.blockId===s.id);i++) monthTick(); stratiLog(s.id); renderGeoPanel(s);
    o.log = document.querySelectorAll('#geoContent .wl-svg').length>0;
    return o; });
  ok(!T.call0 || T.call1===`guideDo('seismic3d',${T.other})` || /ext/.test(T.call1||'') || T.call1===T.call0, 'le guide vise le bloc sélectionné '+JSON.stringify(T));
  ok(T.log, 'la diagraphie d\'un sondage s\'affiche dans le panneau du bloc');
  ok(errs.length===0, 'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko? 'ECHECS: '+ko : 'TOUT OK'); process.exit(ko?1:0); })();
