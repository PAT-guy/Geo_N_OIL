// Grande coupe (V5.42) : le volet « Options du bloc » met l'écran des études (sismique, carotte, sondage, forage avec choix du matériel) dans la vue agrandie, sans la quitter.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1920,height:1080}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1'); localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(400);
  const T = await pg.evaluate(async ()=>{ const o={}; document.getElementById('geoSeed').value='4242'; menuConfig.daily=null; labOptLaunch(); await new Promise(r=>setTimeout(r,900));
    G.budget=90e6; G.month=1; performStudy(null,'gravity');
    const b = blocks.find(x=>!x.inSalt && x.topOfReservoir<2200); const nb = blocks.find(x=>x.id!==b.id && Math.hypot(x.x-b.x,x.y-b.y)<=1.5);
    b.studyLevel=1; G.sectionA=b.id; G.sectionB=nb.id; performStudy(null,'seismic2d'); renderSection();
    openBigView('section'); await new Promise(r=>setTimeout(r,200));
    const bar=document.getElementById('bvActions'); o.btnNoSel = /Touchez un point/.test(bar.textContent);
    selectBlockFromSection(b.id); await new Promise(r=>setTimeout(r,200));
    const home = document.getElementById('studiesContent').parentNode.id;
    const opt=[...document.querySelectorAll('#bvActions button')].find(x=>/options/i.test(x.textContent)); o.hasBtn=!!opt; opt.click(); await new Promise(r=>setTimeout(r,300));
    const dr=document.getElementById('bvDrawer'); o.drawer=getComputedStyle(dr).display!=='none'; o.inside=!!dr.querySelector('#studiesContent'); o.txt=dr.textContent.replace(/\s+/g,' ').slice(0,200);
    o.studies=/Carotte|Rock|Sismique|Forage|Forer/i.test(dr.textContent); const r=dr.getBoundingClientRect(); o.w=Math.round(r.width); o.rightOfStage = document.getElementById('bvBody').getBoundingClientRect().right <= r.left+2;
    // une étude lancée depuis le volet met la coupe à jour
    const before=G.budget; const btn=[...dr.querySelectorAll('button')].find(x=>/Sismique|seismic|Sondage|Survey/i.test(x.textContent) && !x.disabled); o.coreBtn=!!btn; if(btn){ btn.click(); await new Promise(r=>setTimeout(r,300)); o.spent = G.budget<before; }
    bvCloseOptions(); o.home = document.getElementById('studiesContent').parentNode.id===home; o.drawerClosed = getComputedStyle(dr).display==='none';
    openBigView('section'); await new Promise(r=>setTimeout(r,100)); bvOpenOptions(); closeBigView(); o.homeAfterClose = document.getElementById('studiesContent').parentNode.id===home;
    return o; });
  ok(T.btnNoSel && T.hasBtn,'bouton d\'options présent dans la grande coupe '+JSON.stringify({a:T.btnNoSel,b:T.hasBtn}));
  ok(T.drawer && T.inside && T.studies,'le volet s\'ouvre avec l\'écran des études complet '+T.txt.slice(0,90));
  ok(T.rightOfStage && T.w>=300,'la coupe est réduite à côté du volet, rien n\'est recouvert ('+T.w+' px)');
  ok(T.coreBtn && T.spent,'une étude se lance depuis le volet '+JSON.stringify({c:T.coreBtn,s:T.spent,t:T.txt}));
  ok(T.home && T.drawerClosed && T.homeAfterClose,'l\'écran des études revient à sa place à la fermeture du volet ou de la vue');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
