// Traits de coupe : toutes les coupes restent visibles sur la carte, masquables d'un bouton, rouvrables d'un clic.
// Boutons de travaux sous la coupe : sondage, diagraphie, forage sans quitter la coupe.
const { chromium, devices } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const ctx = await br.newContext({...devices['iPhone 13']}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const T = await pg.evaluate(async ()=>{
    const o={}; document.getElementById('geoSeed').value='777'; menuConfig.daily=null; labOptLaunch(); await new Promise(r=>setTimeout(r,900));
    G.budget = 80e6; G.month = 1; LABOPT.pick = false; // la désignation de cible n'est pas l'objet de ce test
    const ids = [[0,5],[20,30],[40,60]].map(([a,b])=>[a,b]);
    for(const [a,b] of ids){ setTool('section'); onBlockClick(a); onBlockClick(b); }
    o.hist = (G.sectionsHistory||[]).length; o.dedupe = (()=>{ const n=G.sectionsHistory.length; secRemember(0,5); secRemember(5,0); return G.sectionsHistory.length===n; })();
    showMobileScreen('map'); labDrawSecLine(); const svg = document.getElementById('secLineSvg');
    o.lines = svg ? svg.querySelectorAll('g[data-sec]').length : 0; o.cur = svg ? svg.querySelectorAll('marker-end, line[marker-end]').length : 0;
    // masquage par le bouton
    labToggleSecLine(false); o.hidden = !document.getElementById('secLineSvg'); labToggleSecLine(true); o.shown = !!document.getElementById('secLineSvg');
    // nouvelle coupe en cours de tracé : les précédentes restent
    showMobileScreen('map'); setTool('section'); onBlockClick(60); labDrawSecLine(); o.whileDrawing = document.getElementById('secLineSvg').querySelectorAll('g[data-sec]').length;
    onBlockClick(61); o.after = G.sectionsHistory.length; showMobileScreen('section');
    // rouvrir une ancienne coupe
    secReopen(0,5); o.reopen = G.sectionA===0 && G.sectionB===5;
    // boutons sur la coupe
    const prof = getProfileBlocks(G.sectionA, G.sectionB), b = prof.find(p=>!p.b.inSalt).b; b.studyLevel = 0; selectedBlock = b.id; renderSection();
    const bar = document.getElementById('sectionActions'); o.barStudy = bar.style.display==='flex' && /Sismique 3D/.test(bar.textContent);
    b.studyLevel = 1; renderSection(); o.barBtns = [...bar.querySelectorAll('button')].map(x=>x.textContent.trim().slice(0,12));
    o.btnH = Math.min(...[...bar.querySelectorAll('button')].map(x=>x.getBoundingClientRect().height));
    const b0 = G.budget; launchStrati(b.id); o.strati = G.drilling.some(d=>d.blockId===b.id && d.method==='strati') && G.budget<b0;
    for(let i=0;i<30 && G.drilling.some(d=>d.blockId===b.id); i++) monthTick(); renderSection(); o.barLog = /Carotte \(lithologie\)/.test(bar.textContent) && /Diagraphie/.test(bar.textContent);
    performStudy(b.id,'core'); stratiLog(b.id); secActionsRender(); o.barDrill = /Forer/.test(bar.textContent) && /Sondage carotté/.test(bar.textContent);
    const b1 = G.budget; secDrill(b.id); o.drilled = G.drilling.some(d=>d.blockId===b.id && d.method==='vertical') && G.budget<b1;
    selectedBlock = null; renderSection(); o.barHidden = bar.style.display==='none';
    return o; });
  ok(T.hist===3 && T.dedupe, 'chaque coupe tracée est mémorisée une seule fois ('+T.hist+')');
  ok(T.lines===3, 'les trois traits de coupe sont visibles sur la carte ('+T.lines+')');
  ok(T.hidden && T.shown, 'le bouton masque puis réaffiche tous les traits');
  ok(T.whileDrawing===3 && T.after===4, 'pendant le tracé d\'une nouvelle coupe, les précédentes restent visibles');
  ok(T.reopen, 'un clic sur une ancienne coupe la rouvre');
  ok(T.barStudy, 'sous la coupe, un bloc sans étude propose d\'abord une étude');
  ok(T.barBtns.some(x=>/Sondage/.test(x)) && T.barBtns.some(x=>/Forer/.test(x)) && T.btnH>=40, 'sondage et forage sont proposés avec leur coût, boutons de 40 px au moins '+JSON.stringify(T.barBtns)+' '+Math.round(T.btnH));
  ok(T.strati && T.barLog && T.barDrill, 'le sondage se lance, puis la carotte et la diagraphie, puis le forage, depuis la coupe');
  ok(T.drilled, 'le forage lancé depuis la coupe débite le budget et ouvre un forage vertical');
  ok(T.barHidden, 'la barre disparaît quand aucun bloc n\'est sélectionné');
  ok(errs.length===0, 'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko? 'ECHECS: '+ko : 'TOUT OK'); process.exit(ko?1:0); })();
