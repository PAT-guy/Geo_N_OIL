// V5.23 : chaque graphique porte le nom et l'unité de ses axes (abscisse et ordonnée) : coupe sismique à interpréter, figures du quiz Fluides, essai de puits (Horner), courbe du budget, console de forage, fenêtre de boue du programme.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1300,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const txt = async sel => pg.evaluate(s=>[...document.querySelectorAll(s+' text')].map(t=>t.textContent), sel);
  // 1. coupe sismique à interpréter
  await pg.evaluate(()=>document.getElementById('seiOpenBtn').click()); await pg.waitForTimeout(300);
  const sei = await txt('#seiSvg');
  ok(sei.some(t=>/Profondeur \(m\)/.test(t)) && sei.some(t=>/Colonne/.test(t)),'coupe sismique à interpréter : « Profondeur (m) » en ordonnée, « Colonne » en abscisse');
  ok(await pg.evaluate(()=>{ const s=document.getElementById('seiSvg'), vb=s.viewBox.baseVal; return [...s.querySelectorAll('text')].every(t=>+t.getAttribute('y')<=vb.height); }),'coupe sismique : rien n\'est coupé en bas');
  await pg.evaluate(()=>document.getElementById('seiGameModal').classList.remove('open'));
  // 2. figures du quiz Fluides et de l'Atelier d'analyses
  const figs = await pg.evaluate(()=>{ const f=(gen,kind)=>{ for(let k=0;k<80;k++){ const q=gen().find(x=>x.kind===kind); if(q) return q; } };
    const a=f(window.__qz.qzGenFluids,'fluide-meca'), b=f(window.__qz.qzGenAnalyses,'analyse-essai'); const d=document.createElement('div'); d.innerHTML=a.fig+(b?b.fig:''); const out=[...d.querySelectorAll('svg')].map(s=>[...s.querySelectorAll('text')].map(t=>t.textContent)); return out; });
  const fl = figs[0]||[];
  ok(fl.filter(t=>/Temps \(mois\)/.test(t)).length===3 && fl.some(t=>/Pression \(%\)/.test(t)) && fl.some(t=>/GOR \(scf\/bbl\)/.test(t)) && fl.some(t=>/BSW\) \(%\)/.test(t)),'figures du quiz Fluides : trois panneaux, abscisse « Temps (mois) », ordonnée nommée avec son unité');
  ok(['0','30','60'].every(v=>fl.filter(t=>t===v).length>=3) && fl.some(t=>t==='50') && fl.some(t=>t==='100'),'graduations sur les deux axes (0, 30, 60 mois ; valeurs en ordonnée)');
  const ho = figs[1]||[];
  ok(ho.some(t=>/Pression \(psi\)/.test(t)) && ho.some(t=>/Temps de Horner/.test(t)) && ['1','10','100'].every(v=>ho.includes(v)),'essai de puits : « Pression (psi) » en ordonnée, « Temps de Horner » gradué en abscisse');
  // 3. courbe du budget en fin de partie
  const bud = await pg.evaluate(async()=>{ document.getElementById('geoSeed').value='2024'; menuConfig.mode='junior'; menuConfig.basinType='paris'; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); setSpeed(0); G.budget=30e6; for(let i=0;i<40;i++) monthTick(); drillRevealQueue.length=0; document.getElementById('alertModal')?.classList.remove('open'); try{ showEnd('test'); }catch(e){} return [...document.querySelectorAll('#endChartBox svg text')].map(t=>t.textContent); });
  ok(bud.some(t=>/Années de jeu/.test(t)) && bud.some(t=>/Budget \(M\$\)/.test(t)) && bud.some(t=>/Brut \(\$\/bbl\)/.test(t)),'courbe du budget : « Années de jeu », « Budget (M$) » et « Brut ($/bbl) » avec ses deux valeurs extrêmes');
  // 4. fenêtre de boue du programme de forage
  const prog = await pg.evaluate(()=>{ document.getElementById('endScreen').style.display='none'; LABOPT.rigprog=true; performStudy(null,'gravity'); const b=blocks.filter(x=>!x.inSalt&&!x.isOffshore).sort((a,z)=>z.trueProbability-a.trueProbability)[0]; progOpen(b.id,'vertical','standard',null); return [...document.querySelectorAll('#progSvg text')].map(t=>t.textContent); });
  ok(prog.some(t=>/profondeur \(m\)/.test(t)) && prog.some(t=>/densité de boue équivalente \(sg\)/.test(t)),'fenêtre de boue : « profondeur (m) » et « densité de boue équivalente (sg) »');
  await pg.evaluate(()=>progClose());
  // 5. console de forage (fenêtre de boue en direct)
  const rig = await pg.evaluate(async()=>{ document.getElementById('rigOpenBtn').click(); await new Promise(r=>setTimeout(r,500)); return [...document.querySelectorAll('#rgChart svg text')].map(t=>t.textContent); });
  ok(rig.some(t=>/prof\. \(m\)/.test(t)) && rig.some(t=>/densité équivalente \(sg\)/.test(t)),'console de forage : ordonnée « prof. (m) » et abscisse « densité équivalente (sg) »');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
