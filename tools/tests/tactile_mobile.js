// Téléphone (iPhone 13 simulé, tactile) : cibles >= 40 px, en-tête sans chevauchement, guide replié, tap sur un point de coupe
const { chromium, devices } = require('playwright');
const path = require('path');
(async()=>{
  const br=await chromium.launch(); const errs=[]; let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  for(const [nom,w,h] of [['390',390,844],['360',360,740]]){
    const ctx=await br.newContext({...devices['iPhone 13'],viewport:{width:w,height:h}}); const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.message));
    await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
    await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(300);
    await pg.tap('#startBtn'); await pg.waitForTimeout(200);
    const pick = await pg.evaluate(()=>[...document.querySelectorAll('.lab-pick')].filter(e=>e.offsetParent).map(e=>e.getBoundingClientRect().height));
    ok(pick.length>0 && Math.min(...pick)>=39.5, nom+' : chips des options >= 40 px ('+Math.min(...pick)+')');
    await pg.tap('#labOptGo'); await pg.waitForTimeout(500);
    await pg.evaluate(()=>{ setSpeed(0); G.budget=30e6; });
    const r = await pg.evaluate(()=>{ const q=s=>document.querySelector(s).getBoundingClientRect(); const c=q('#btnPriceAlert'), v=q('#btnSpeedCycle'), m=q('#btnMenu'); const g=document.getElementById('hudGoalTxt'), bud=document.querySelector('.hud-budget').getBoundingClientRect();
      const inter=(a,b)=>!(a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom);
      return { cloche:[c.width,c.height], vitesse:[v.width,v.height], menu:[m.width,m.height], budgetVsVitesse:inter(bud,v), budgetVsMenu:inter(bud,m), debord: document.documentElement.scrollWidth>innerWidth }; });
    ok(r.cloche[0]>=39.5&&r.cloche[1]>=39.5, nom+' : cloche '+r.cloche.map(Math.round));
    ok(r.vitesse[1]>=39.5, nom+' : vitesse '+r.vitesse.map(Math.round)); ok(r.menu[1]>=39.5, nom+' : menu '+r.menu.map(Math.round));
    const rogne = await pg.evaluate(()=>{ const e=document.querySelector('.hud-budget-top'), b=document.querySelector('.hud-budget'); return e.scrollWidth>b.clientWidth+1; });
    ok(!rogne, nom+' : montant du budget non rogné');
    ok(!r.budgetVsVitesse && !r.budgetVsMenu, nom+' : budget/objectif sans chevauchement'); ok(!r.debord, nom+' : pas de débordement horizontal');
    // guide replié par défaut, déplié au tap
    const g1 = await pg.evaluate(()=>{ const t=document.querySelector('.guide-text'); return t? getComputedStyle(t).display : 'absent'; });
    ok(g1==='none', nom+' : texte du guide replié par défaut ('+g1+')');
    await pg.tap('.guide-mini'); const g2 = await pg.evaluate(()=>getComputedStyle(document.querySelector('.guide-text')).display); ok(g2==='block', nom+' : tap sur la ligne du guide le déplie ('+g2+')');
    await pg.tap('.guide-mini');
    const chk = await pg.evaluate(()=>{ const l=document.querySelector('.lab-secchk'); const i=document.getElementById('secLineChk').getBoundingClientRect(); return l? [l.getBoundingClientRect().height, i.width]:null; });
    ok(chk && chk[0]>=39.5 && chk[1]>=20, nom+' : case Trait de coupe '+(chk&&chk.map(Math.round)));
    // coupe : points
    await pg.evaluate(()=>{ performStudy(null,'gravity'); const land=blocks.filter(b=>!b.isOffshore); const rows={}; land.forEach(b=>(rows[b.y]=rows[b.y]||[]).push(b)); const rr=Object.values(rows).sort((a,z)=>z.length-a.length)[0].sort((a,z)=>a.x-z.x); G.sectionA=rr[0].id; G.sectionB=rr[rr.length-1].id; window.__row=rr.map(b=>b.id); performStudy(null,'seismic2d'); showMobileScreen('section'); renderSection(); });
    await pg.waitForTimeout(300);
    const id = await pg.evaluate(()=>window.__row[3]);
    const hit = await pg.evaluate(id=>{ const c=[...document.querySelectorAll('#sectionSvg rect.sel-hit')].find(e=>(e.getAttribute('onclick')||'').includes('selectBlockFromSection('+id+')')); const r=c.getBoundingClientRect(); return [r.width, r.height, r.x+r.width/2, r.y+r.height/2]; }, id);
    ok(hit[1]>=39.5, nom+' : zone de frappe d\'un point de coupe '+Math.round(hit[0])+' x '+Math.round(hit[1])+' px (hauteur >= 40)');
    await pg.touchscreen.tap(hit[2]+4, hit[3]-4); await pg.waitForTimeout(200);
    ok(await pg.evaluate(id=>selectedBlock===id, id), nom+' : tap décalé de 4 px sélectionne bien le bloc');
    await pg.screenshot({path:'/tmp/tactile_'+nom+'.png'});
    await ctx.close(); }
  console.log('erreurs JS', errs); console.log(ko? 'ECHECS: '+ko : 'TOUT OK'); await br.close(); process.exit(ko||errs.length?1:0); })();
