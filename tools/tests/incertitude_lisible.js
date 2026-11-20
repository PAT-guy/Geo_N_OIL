// Incertitude lisible (V5.46) : la fiche du bloc dit l'intervalle à 90 % en fréquence (« 9 fois sur 10 entre A et B ») et la coupe trace une bande autour du toit du réservoir.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1300,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const r = await pg.evaluate(async()=>{ const o={}; document.getElementById('geoSeed').value='4242'; menuConfig.mode='expert'; menuConfig.basinType='paris'; menuConfig.seed='4242'; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); setSpeed(0); G.budget=80e6; LABOPT.pick=false; G.labOpt.pick=false; performStudy(null,'gravity');
    const n=Math.sqrt(blocks.length)|0, byXY=new Map(blocks.map(b=>[b.x+','+b.y,b])); const a=byXY.get('1,2'), z=byXY.get((n-2)+',2'); G.sectionA=a.id; G.sectionB=z.id; performStudy(null,'seismic2d'); renderSection();
    const svg=document.getElementById('sectionSvg'), bands=svg.querySelectorAll('.sec-band'); o.bands=bands.length; o.bandTitle=bands[0]?.querySelector('title')?.textContent||''; o.label=/toit du réservoir : 9 fois sur 10/.test(svg.innerHTML);
    // la bande reste dans le tracé et a une hauteur
    if(bands[0]){ const pts=bands[0].getAttribute('points').trim().split(/\s+/).map(p=>p.split(',').map(Number)); const ys=pts.map(p=>p[1]); o.h=Math.max(...ys)-Math.min(...ys); o.nPts=pts.length; }
    // fiche d'un bloc krigé hors profil
    const kb=blocks.find(b=>!b.isOffshore&&!b.inSalt&&b.estimate?.depth===undefined&&gsKrig(b,'z')); const k=gsKrig(kb,'z'); selectedBlock=kb.id; renderGeoPanel(kb); const html=document.getElementById('geoContent').innerText.replace(/\s+/g,' ');
    const lo=Math.round((k.m-1.645*k.sd)/10)*10, hi=Math.round((k.m+1.645*k.sd)/10)*10; o.expect=`9 fois sur 10 entre ${lo} et ${hi} m`; o.fiche=html.includes(o.expect); o.ancien=/écart-type\)|±\d+ m \(écart/.test(html);
    // mode simple : pas de bande
    G.simple=true; renderSection(); o.simpleBands=document.getElementById('sectionSvg').querySelectorAll('.sec-band').length; G.simple=false; renderSection();
    // anglais
    document.documentElement.lang='en'; renderGeoPanel(kb); o.en=document.getElementById('geoContent').innerText.replace(/\s+/g,' ').includes(`9 times out of 10 between ${lo} and ${hi} m`); document.documentElement.lang='fr';
    return o; });
  ok(r.bands>=1 && r.h>4 && r.nPts>=4,'la coupe trace une bande autour du toit du réservoir ('+r.bands+' bande(s), '+Math.round(r.h)+' px de haut)');
  ok(/9 fois sur 10/.test(r.bandTitle) && r.label,'info-bulle et étiquette de la bande');
  ok(r.fiche && !r.ancien,'fiche du bloc : « '+r.expect+' », plus d\'écart-type brut');
  ok(r.simpleBands===0,'mode simple : pas de bande');
  ok(r.en,'version anglaise de la fourchette');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
