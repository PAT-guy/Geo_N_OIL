// Atelier d'analyses (V5.12) : huit questions par manche (volumes, déclin, essai de puits, risque), quatre choix distincts, bonne réponse recalculée indépendamment, mauvaises réponses = erreurs nommées.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:390,height:844}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const r = await pg.evaluate(()=>{ const kinds={}, bad=[]; let mn=99; for(let i=0;i<80;i++){ const rd=window.__qz.qzBuildRound(window.__qz.QUIZ_BANKS.analyses); mn=Math.min(mn,rd.length); rd.forEach(q=>{ kinds[q.kind]=(kinds[q.kind]||0)+1; if(!(q.choices.length===4 && new Set(q.choices).size===4 && q.correct>=0 && q.correct<4 && q.explain && !/Infinity|NaN/.test(q.choices.join('')+q.explain))) bad.push(q.kind+' '+q.choices.join('/')); }); } return { kinds, bad, mn }; });
  ok(r.mn===8,'chaque manche compte 8 questions '+r.mn);
  ok(['analyse-volume','analyse-declin','analyse-essai','analyse-risque'].every(k=>r.kinds[k]===160),'2 questions de chaque famille par manche '+JSON.stringify(r.kinds));
  ok(r.bad.length===0,'4 choix distincts, valeurs finies '+r.bad.slice(0,2).join(' ; '));
  // volumes : recalcul indépendant à partir des données affichées
  const v = await pg.evaluate(()=>{ let wrong=0, n=0; const num=t=>parseFloat(String(t).replace(/\s/g,'').replace('−','-').replace(',','.').replace(/[^\d.\-]/g,'')); for(let i=0;i<120;i++){ const q=window.__qz.qzGenAnalyses().find(x=>x.kind==='analyse-volume'); const f=Object.fromEntries(q.facts.map(a=>[a[0],num(a[1])])); const vals=Object.values(f); const [A,h,phi,sw,bo,rf]=vals; const st=A*1e6*h*phi/100*(1-sw/100)/bo*6.2898/1e6; const want=/STOIIP/.test(q.ask)?st:st*rf/100; const got=num(q.choices[q.correct]); n++; if(Math.abs(got-want)/want>0.02) wrong++; } return {wrong,n}; });
  ok(v.wrong===0,'volumes : la réponse correcte suit surface × épaisseur × porosité × (1 − Sw) ÷ Bo '+JSON.stringify(v));
  const rk = await pg.evaluate(()=>{ let wrong=0; const num=t=>parseFloat(String(t).replace(/[^\d]/g,'')); for(let i=0;i<120;i++){ const q=window.__qz.qzGenAnalyses().find(x=>x.kind==='analyse-risque' && /globale/.test(x.ask)); if(!q) continue; const prod=q.facts.map(a=>num(a[1])/100).reduce((a,b)=>a*b,1); if(Math.abs(num(q.choices[q.correct])/100-prod)>0.006) wrong++; } return wrong; });
  ok(rk===0,'risque : la bonne réponse est le produit des facteurs '+rk);
  const ess = await pg.evaluate(()=>{ let wrong=0,n=0; const num=t=>parseFloat(String(t).replace(/\s/g,'').replace(',','.').replace(/[^\d.]/g,'')); for(let i=0;i<150;i++){ const q=window.__qz.qzGenAnalyses().find(x=>x.kind==='analyse-essai'); const [qq,mu,B,h,m]=q.facts.map(a=>num(a[1])); const k=162.6*qq*B*mu/(m*h); n++; if(Math.abs(num(q.choices[q.correct])-k)>Math.max(0.02*k,0.6)) wrong++; } return {wrong,n}; });
  ok(ess.wrong===0,'essai de puits : k = 162,6 q Bo µ ÷ (m h) '+JSON.stringify(ess));
  const dec = await pg.evaluate(()=>{ let wrong=0,n=0; const num=t=>parseFloat(String(t).replace(/\s/g,'').replace(',','.').replace(/[^\d.]/g,'')); for(let i=0;i<150;i++){ const q=window.__qz.qzGenAnalyses().find(x=>x.kind==='analyse-declin' && /EUR/.test(x.ask)); if(!q) continue; const qi=num(q.facts[0][1]), dAn=num(q.facts[1][1]), qa=num(q.facts[2][1]); const D=-Math.log(1-dAn/100)/12, eur=(qi-qa)*30.4/D/1e3; n++; if(Math.abs(num(q.choices[q.correct])-eur)/eur>0.02) wrong++; } return {wrong,n}; });
  ok(dec.wrong===0 && dec.n>0,'déclin : EUR exponentielle recalculée '+JSON.stringify(dec));
  ok(await pg.evaluate(()=>!!document.querySelector('.mg-card[data-quiz="analyses"]') && !!document.querySelector('#quickTrain button[data-quiz="analyses"]')),'carte et bouton rapide présents');
  await pg.evaluate(()=>window.__qz.open('analyses')); await pg.waitForTimeout(200);
  ok(await pg.evaluate(()=>document.getElementById('quizModal').classList.contains('open') && document.documentElement.scrollWidth<=innerWidth+1),'le quiz s\'ouvre sans débordement sur téléphone');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
