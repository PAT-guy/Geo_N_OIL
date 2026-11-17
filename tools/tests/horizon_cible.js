// Désignation de l'horizon cible (V5.9) : un clic sur un réflecteur désigne la couche qui commence là, un second clic ne retire plus la cible, retrait explicite, sélecteur H1..Hn.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1400,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_menu','full')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(300);
  await pg.click('.menu-tab[data-tab="world"]'); await pg.click('#basinPicker button[data-val="paris"]'); await pg.fill('#geoSeed','2024'); await pg.click('#startBtn'); await pg.evaluate(()=>labOptPreset('complet')); await pg.click('#labOptGo'); await pg.waitForTimeout(500);
  await pg.evaluate(()=>{ setSpeed(0); G.budget=30e6; performStudy(null,'gravity'); const land=blocks.filter(b=>!b.isOffshore); const rows={}; land.forEach(b=>(rows[b.y]=rows[b.y]||[]).push(b)); const r=Object.values(rows).sort((a,z)=>z.length-a.length)[0].sort((a,z)=>a.x-z.x); G.sectionA=r[0].id; G.sectionB=r[r.length-1].id; window.__row=r.map(b=>b.id); performStudy(null,'seismic2d'); switchTab('section'); renderSection(); });
  await pg.waitForTimeout(300);
  // pixel du toit de la couche k, 1 px au-dessus (donc dans la couche k-1)
  const target = await pg.evaluate(()=>{ const svg=document.getElementById('sectionSvg'); const info=JSON.parse(svg.getAttribute('data-lab')); const rect=svg.querySelector('rect[onclick="labPickAt(event)"]');
    const bi=Math.floor(info.b.length/2); const col=info.b[bi]; const k=col.L.findIndex((l,i)=>i>=2&&l[1]>=30); if(k<0) return null;
    const px=info.m[0]+col.t*info.m[2], py=info.m[1]+((col.L[k][0]-info.d[0])/(info.d[1]-info.d[0]))*info.m[3]-1;
    const pt=svg.createSVGPoint(); pt.x=px; pt.y=py; const s=pt.matrixTransform(svg.getScreenCTM()); return {x:s.x,y:s.y,k}; });
  ok(!!target,'une couche profonde repérable sur la coupe');
  await pg.mouse.click(target.x,target.y); await pg.waitForTimeout(200);
  ok(await pg.evaluate(()=>G.labPick)===target.k,'clic sur un réflecteur : désigne la couche qui commence à cette ligne (H'+(target.k+1)+')');
  await pg.mouse.click(target.x,target.y); await pg.waitForTimeout(200);
  ok(await pg.evaluate(()=>G.labPick)===target.k,'un second clic sur le même horizon ne retire pas la cible');
  await pg.evaluate(()=>{ labSetPick(G.labPick); }); ok(await pg.evaluate(()=>G.labPick)!==null,'le bouton du tableau ne retire plus non plus la cible');
  ok(await pg.evaluate(()=>document.querySelectorAll('#sectionInterpret .lab-chips .lab-pick').length)>=STRAT_N(),'sélecteur H1..Hn affiché') ;
  function STRAT_N(){ return 3; }
  await pg.evaluate(()=>labClearPick()); ok(await pg.evaluate(()=>G.labPick)===null,'retrait explicite de la cible');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
