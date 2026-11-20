// Krigeage de la profondeur (V5.45) : les intervalles à 90 % couvrent-ils la vérité cachée ? Gravimétrie, un profil 2D, puis 2, 5 ou 10 sismiques d'un bloc au hasard ; vérité = profondeur réelle des blocs non mesurés.
// Avant V5.45 : couverture de 86 % (écart-type des résidus standardisés 1,15 ; 77 % avec 2 sismiques ponctuelles). Après : 91 % (0,98 ; 84 à 86 % avec 2).
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1100,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const r = await pg.evaluate(async()=>{ const BAS=['permian','rift','aquitaine','passive'], all=[];
    for(const bt of BAS) for(let s=0;s<6;s++){ const seed=String(9000+s*11+BAS.indexOf(bt)); document.getElementById('geoSeed').value=seed; menuConfig.mode='expert'; menuConfig.basinType=bt; menuConfig.seed=seed; labOptLaunch(); await new Promise(r=>setTimeout(r,60)); setSpeed(0); G.budget=80e6; LABOPT.pick=false; G.labOpt.pick=false; performStudy(null,'gravity');
      const n=Math.sqrt(blocks.length)|0, byXY=new Map(blocks.map(b=>[b.x+','+b.y,b])); const a=byXY.get('1,2'), z=byXY.get((n-2)+',2'); G.sectionA=a.id; G.sectionB=z.id; performStudy(null,'seismic2d');
      const K=[2,5,10][s%3], rng=makeRng(seedToInt(seed+'|m')); for(let k=0;k<K;k++){ const c=blocks.filter(b=>!b.isOffshore&&!b.inSalt&&b.estimate?.depth===undefined); const pick=c[Math.floor(rng()*c.length)]; G.sectionA=pick.id; G.sectionB=pick.id; G._single=true; performStudy(null,'seismic2d'); G._single=false; }
      blocks.filter(b=>!b.isOffshore&&!b.inSalt&&b.estimate?.depth===undefined).forEach(b=>{ const k=gsKrig(b,'z'); if(k) all.push({ K, z:(b.topOfReservoir-k.m)/k.sd }); }); }
    const f=a=>({ n:a.length, cov:a.filter(r=>Math.abs(r.z)<=1.645).length/a.length, sd:Math.sqrt(a.reduce((t,r)=>t+r.z*r.z,0)/a.length) });
    return { all:f(all), K2:f(all.filter(r=>r.K===2)), K5:f(all.filter(r=>r.K===5)), K10:f(all.filter(r=>r.K===10)) }; });
  ok(r.all.n>400,'assez de blocs krigés pour juger ('+r.all.n+')');
  ok(r.all.cov>=0.86 && r.all.cov<=0.96,'couverture à 90 % : '+(r.all.cov*100).toFixed(0)+' % (entre 86 et 96 %)');
  ok(r.all.sd>=0.85 && r.all.sd<=1.12,'écart-type des résidus standardisés : '+r.all.sd.toFixed(2)+' (autour de 1)');
  ok(r.K2.cov>=0.80,'peu de données (2 sismiques ponctuelles) : couverture '+(r.K2.cov*100).toFixed(0)+' % (77 % avant)');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
