// Sondage stratigraphique : carte dédiée toujours disponible, diagraphie payante séparée, lithologie sur la coupe seulement après diagraphie, guide, tutoriel à jour.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const T = await pg.evaluate(async ()=>{
    const o={}; document.getElementById('geoSeed').value='4242'; menuConfig.daily=null; labOptLaunch(); await new Promise(r=>setTimeout(r,900));
    LABOPT.strati = false; // l'ancienne option ne doit plus compter
    const b = blocks.find(x=>!x.inSalt && x.topOfReservoir<2200); b.studyLevel = 1; selectedBlock = b.id; G.budget = 40e6; G.month = 1;
    renderStudiesPanel(b); const panel = document.getElementById('studiesPanel') || document.body;
    o.card = !!document.getElementById('stratiCard') && !!document.getElementById('stratiBtn');
    o.noMethod = ![...document.querySelectorAll('#drillMethod option')].some(op=>op.value==='strati');
    o.opt = !/Sondage stratigraphique disponible/.test(document.body.innerHTML);
    const b0 = G.budget; launchStrati(b.id); const paid = b0 - G.budget; o.paid = paid>0;
    o.inDrilling = G.drilling.some(d=>d.blockId===b.id && d.method==='strati');
    for(let i=0;i<30 && G.drilling.some(d=>d.blockId===b.id); i++) monthTick(); // fin du sondage
    o.done = b.strati===true; o.noLog = !b.studies.some(s=>s.type==='welllog'); o.notDrilled = !labDrilled(b);
    renderStudiesPanel(b); o.logBtn = !!document.getElementById('stratiLogBtn');
    o.coreOk = (document.getElementById('studiesPanel')||document.body).innerHTML.includes("performStudy("+b.id+",'core')");
    // la diagraphie donne les courbes du log mais ne dévoile pas la lithologie sur la coupe ; c'est la carotte qui le fait
    const b1 = G.budget; stratiLog(b.id); o.logPaid = Math.round(b1 - G.budget) === Math.round(stratiLogCost(b)) && stratiLogCost(b)>0;
    o.hasLog = b.studies.some(s=>s.type==='welllog'); o.logOnlyNotDrilled = !labDrilled(b);
    const bc = G.budget; performStudy(b.id,'core'); o.corePaid = bc > G.budget; o.nowDrilled = labDrilled(b);
    const b2 = G.budget; stratiLog(b.id); o.noDouble = G.budget === b2;
    renderStudiesPanel(b); o.logDone = /Diagraphie réalisée/.test(document.body.innerHTML);
    // guide : sondage foré sans log -> diagraphie proposée
    blocks[0].studies.push({type:'gravity', cost:0, result:{}, month:1, revealed:true}); const c = blocks.find(x=>x.id!==b.id && !x.inSalt); c.strati = true; c.studyLevel = 1; const g = guideCompute(); o.guideLog = !!(g && /carotte/i.test(g.text) && /guideDo\('core'/.test(g.act.call)); c.strati = false;
    // sandbox : gratuit
    G.mode='sandbox'; o.sandFree = stratiLogCost(b)===0; G.mode='junior';
    return o; });
  ok(T.card, 'la carte « Sondage » est visible même avec l\'ancienne option désactivée');
  ok(T.noMethod && T.opt, 'le sondage n\'est plus caché dans la liste des méthodes ni dans les options de laboratoire');
  ok(T.paid && T.inDrilling, 'lancer le sondage coûte et ouvre un forage de type sondage');
  ok(T.done && T.noLog && T.notDrilled, 'un sondage terminé ne donne pas le log et ne compte pas encore sur la coupe');
  ok(T.logBtn && T.coreOk, 'la diagraphie est proposée à part, la carotte reste possible tout de suite');
  ok(T.logPaid && T.hasLog && T.logOnlyNotDrilled, 'la diagraphie est payante et ne dévoile pas la lithologie sur la coupe');
  ok(T.corePaid && T.nowDrilled, 'la carotte est payante et dévoile la lithologie du sondage sur la coupe');
  ok(T.noDouble && T.logDone, 'la diagraphie ne se paie qu\'une fois');
  ok(T.guideLog, 'le guide propose la carotte d\'un sondage non carotté');
  ok(T.sandFree, 'diagraphie gratuite en bac à sable');
  const tut = await pg.evaluate(()=>{ document.getElementById('openTutorialBtn')?.click(); let s=''; for(let i=0;i<14;i++){ s += document.getElementById('tutoSlideBody').innerHTML; const n=document.getElementById('tutoNextBtn'); if(!n || /Terminer|Finish/.test(n.textContent)) break; n.click(); } return { strati:/carte <b>Sondage<\/b>/.test(s), aband:/abandon<\/b> \(12 %/.test(s), rig:/console de forage<\/b> \(pilotage/.test(s), daily:/Défi du jour<\/b>/.test(s) }; });
  ok(tut.strati && tut.aband && tut.rig && tut.daily, 'le tutoriel décrit le sondage, l\'abandon, la console de forage et le défi du jour '+JSON.stringify(tut));
  ok(errs.length===0, 'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko? 'ECHECS: '+ko : 'TOUT OK'); process.exit(ko?1:0); })();
