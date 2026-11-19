// V5.22 : graphique du programme de forage lisible (zones sûre et hors fenêtre, étiquette par section, légende sous le graphique, rien de coupé) et étiquette de l'horizon visé centrée sur sa ligne (pas un point haut au-dessus d'un horizon plat).
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1400,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_menu','full')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(300);
  await pg.click('.menu-tab[data-tab="world"]'); await pg.click('#basinPicker button[data-val="paris"]'); await pg.fill('#geoSeed','2024'); await pg.click('#startBtn'); await pg.evaluate(()=>labOptPreset('complet')); await pg.click('#labOptGo'); await pg.waitForTimeout(500);
  // 1. programme de forage
  const P = await pg.evaluate(()=>{ setSpeed(0); G.budget=30e6; LABOPT.rigprog=true; performStudy(null,'gravity'); const b=blocks.filter(x=>!x.inSalt&&!x.isOffshore).sort((a,z)=>z.trueProbability-a.trueProbability)[0]; progOpen(b.id,'vertical','standard',null); progSetK(2);
    const svg=document.getElementById('progSvg'), vb=svg.viewBox.baseVal, txt=[...svg.querySelectorAll('text')].map(t=>({s:t.textContent, y:+t.getAttribute('y')}));
    const fills=[...svg.querySelectorAll('path')].map(p=>p.getAttribute('fill')).filter(Boolean);
    return { vbH:vb.height, texts:txt.map(t=>t.s), maxY:Math.max(...txt.map(t=>t.y)), fills, sections:[...svg.querySelectorAll('text')].filter(t=>/boue|mud/.test(t.textContent) && /\d\.\d\d/.test(t.textContent)).length, rects:svg.querySelectorAll('rect').length }; });
  ok(P.maxY < P.vbH-1,'rien n\'est coupé : le texte le plus bas (y='+P.maxY+') reste dans le graphique (hauteur '+P.vbH+')');
  ok(P.fills.some(f=>/30,160,85/.test(f)) && P.fills.filter(f=>/200,60,50/.test(f)).length>=2,'trois zones : fenêtre sûre en vert, hors fenêtre en rouge de chaque côté');
  ok(P.texts.some(t=>/fenêtre sûre/.test(t)) && P.texts.some(t=>/hors fenêtre/.test(t)) && P.texts.some(t=>/pression des pores/.test(t)) && P.texts.some(t=>/fracturation/.test(t)),'légende : pores, fracturation, fenêtre sûre, hors fenêtre');
  ok(P.sections===3,'une étiquette de boue par section (3 sections) '+P.sections);
  ok(P.texts.some(t=>/profondeur \(m\)/.test(t)) && P.texts.some(t=>/densité de boue équivalente/.test(t)),'axes nommés');
  const warn = await pg.evaluate(()=>{ { const b0=blocks[PROGUI.blockId]; let w=1.0; for(; w>0.5; w=Math.round((w-0.05)*100)/100){ PROGUI.prog.mud[0]=w; if(progForecast(b0, PROGUI.prog, PROGUI.TD)[0].kick<0) break; } PROGUI.prog.mud[0]=w; } progRefresh(); const a=[...document.querySelectorAll('#progSvg text')].some(t=>/⚠/.test(t.textContent)); PROGUI.prog=progAuto(blocks[PROGUI.blockId], PROGUI.TD); progRefresh(); const b=[...document.querySelectorAll('#progSvg text')].some(t=>/⚠/.test(t.textContent)); return { a, b }; });
  ok(warn.a===true,'une boue sous la pression des pores affiche « ⚠ venue » sur sa section '+JSON.stringify(warn));
  await pg.evaluate(()=>progClose());
  // 2. étiquette de l'horizon visé
  const L = await pg.evaluate(()=>{ G.budget=30e6; const land=blocks.filter(b=>!b.isOffshore); const rows={}; land.forEach(b=>(rows[b.y]=rows[b.y]||[]).push(b)); const r=Object.values(rows).sort((a,z)=>z.length-a.length)[0].sort((a,z)=>a.x-z.x); G.sectionA=r[0].id; G.sectionB=r[r.length-1].id; performStudy(null,'seismic2d'); switchTab('section'); labSetPick(3); renderSection();
    const svg=document.getElementById('sectionSvg'); const line=[...svg.querySelectorAll('path')].find(p=>p.getAttribute('stroke')==='var(--amber)' && p.getAttribute('stroke-width')==='2.4'); const pill=[...svg.querySelectorAll('rect')].find(r=>r.getAttribute('fill')==='var(--amber)' && r.getAttribute('height')==='11');
    if(!line||!pill) return { err:'absent', line:!!line, pill:!!pill }; const nums=line.getAttribute('d').match(/-?\d+(\.\d+)?/g).map(Number); const ly=nums[nums.length-1]; const cy=+pill.getAttribute('y') + 5.5; return { ly, cy, text:[...svg.querySelectorAll('text')].find(t=>/🎯/.test(t.textContent))?.textContent }; });
  ok(!L.err && Math.abs(L.ly-L.cy)<=1.5,'étiquette de l\'horizon visé centrée sur la fin de sa ligne (ligne '+L.ly+', étiquette '+L.cy+')');
  ok(/🎯 H4/.test(L.text||''),'étiquette : '+L.text);
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
