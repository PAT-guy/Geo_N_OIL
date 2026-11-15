// Numéro d'horizon (H1, H2...) visible sur la coupe : en marge de chaque couche et dans la fiche d'une couche cliquée, même en sismique muette (sans nom de roche).
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1280,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(400);
  const T = await pg.evaluate(async ()=>{ document.getElementById('geoSeed').value='4242'; menuConfig.daily=null; labOptLaunch(); await new Promise(r=>setTimeout(r,900));
    LABOPT.mute = true; G.budget=90e6; G.month=1; performStudy(null,'gravity'); const b=blocks.find(x=>!x.inSalt && x.topOfReservoir<2200), nb=blocks.find(x=>x.id!==b.id && Math.hypot(x.x-b.x,x.y-b.y)<=1.5);
    b.studyLevel=1; G.sectionA=b.id; G.sectionB=nb.id; performStudy(null,'seismic2d'); renderSection();
    const svg=document.getElementById('sectionSvg'); const tags=[...svg.querySelectorAll('text')].filter(t=>/^H\d+$/.test(t.textContent)).length;
    const poly=svg.querySelector('.sec-layer-poly'); const rect=poly.getBoundingClientRect(); poly.dispatchEvent(new MouseEvent('click',{bubbles:true, clientX:rect.left+rect.width/2, clientY:rect.top+rect.height/2}));
    const lbl=document.getElementById('sectionLayerLabel'); return { tags, label: lbl ? lbl.textContent : null, name: poly.dataset.layerName, li: poly.dataset.li }; });
  ok(T.tags>=3, 'numéros H1, H2... en marge de la coupe ('+T.tags+')');
  ok(T.label && /^H\d+/.test(T.label), 'la fiche de la couche cliquée commence par son numéro '+JSON.stringify(T));
  ok(errs.length===0, 'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko? 'ECHECS: '+ko : 'TOUT OK'); process.exit(ko?1:0); })();
