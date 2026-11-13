// Répétition espacée : une question fixe ratée revient en priorité, une erreur dans le jeu est mémorisée,
// une bonne réponse l'efface, les questions générées ne polluent pas la mémoire.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(400);
  const T = await pg.evaluate(()=>{
    const Q = window.__qz, B = Q.QUIZ_BANKS, key = Object.keys(B).find(k=>B[k].questions.length>=9);
    const idOf = q => { let h=0; const t=String(q.q||q.ask||''); for(let i=0;i<t.length;i++) h=(h*31+t.charCodeAt(i))|0; return String(h); };
    const o = { key }; const q0 = B[key].questions[0];
    // 1. priorité : une question ratée est dans 40 manches sur 40, marquée « à revoir »
    localStorage.setItem('geoexplorer_quiz_miss', JSON.stringify({[key]:{[idOf(q0)]:{n:2,ts:1}}}));
    o.seen=0; o.flag=0; for(let i=0;i<40;i++){ Q.open(key); const od=Q.order(); const f=od.find(q=>q.q===q0.q); if(f){ o.seen++; if(f.__revoir) o.flag++; } }
    // 2. une erreur dans le jeu est mémorisée, une bonne réponse l'efface
    localStorage.removeItem('geoexplorer_quiz_miss'); Q.open(key);
    const answer = good => { const q = Q.order()[document.querySelector('#qzScore').textContent.match(/Question (\d+)/)[1]-1]; const b=[...document.querySelectorAll('#qzChoices .qz-choice')].find(x=>(parseInt(x.dataset.orig)===q.correct)===good); b.click(); return q; };
    let qa; for(let i=0;i<8;i++){ const cur=Q.order()[document.querySelector('#qzScore').textContent.match(/Question (\d+)/)[1]-1]; if(!cur.__gen){ qa=answer(false); break; } answer(true); document.getElementById('qzNextBtn').click(); } const m1 = JSON.parse(localStorage.getItem('geoexplorer_quiz_miss')||'{}')[key]||{}; o.stored = !!m1[idOf(qa)];
    return o; });
  ok(!!T.key, 'banque de questions fixes : '+T.key);
  ok(T.seen===40 && T.flag===40, 'la question ratée revient dans chaque manche et porte « à revoir » ('+T.seen+', '+T.flag+' sur 40)');
  ok(T.stored, 'une mauvaise réponse est mémorisée');
  const U = await pg.evaluate(()=>{ const Q=window.__qz, key=Object.keys(Q.QUIZ_BANKS).find(k=>Q.QUIZ_BANKS[k].questions.length>=9); const before=localStorage.getItem('geoexplorer_quiz_miss'); const keys=Object.keys(Q.QUIZ_BANKS).filter(k=>Q.QUIZ_BANKS[k].gen); let leak=0;
    keys.forEach(k=>{ localStorage.removeItem('geoexplorer_quiz_miss'); Q.open(k); const od=Q.order(); const g=od.findIndex(q=>q.__gen); if(g<0) return; for(let i=0;i<od.length;i++){ const q=od[i]; const bs=[...document.querySelectorAll('#qzChoices .qz-choice')]; const bad=bs.find(x=>parseInt(x.dataset.orig)!==q.correct); if(q.__gen){ bad.click(); } else { bs[0].click(); } document.getElementById('qzNextBtn').click(); }
      const m=JSON.parse(localStorage.getItem('geoexplorer_quiz_miss')||'{}')[k]||{}; const ids=new Set(od.filter(q=>q.__gen).map(q=>{let h=0;const t=String(q.q||q.ask||'');for(let i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))|0;return String(h);})); Object.keys(m).forEach(id=>{ if(ids.has(id)) leak++; }); });
    return { n:keys.length, leak }; });
  ok(U.n>0 && U.leak===0, 'les questions générées ne sont jamais mémorisées ('+U.n+' banques, fuites '+U.leak+')');
  const V = await pg.evaluate(()=>{ const Q=window.__qz, B=Q.QUIZ_BANKS, key='lithofacies', q0=B[key].questions[0]; const idOf=q=>{let h=0;const t=String(q.q||q.ask||'');for(let i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))|0;return String(h);};
    localStorage.setItem('geoexplorer_quiz_miss', JSON.stringify({[key]:{[idOf(q0)]:{n:1,ts:1}}})); Q.open(key); const od=Q.order(); let done=false;
    for(let i=0;i<od.length;i++){ const q=od[i], bs=[...document.querySelectorAll('#qzChoices .qz-choice')]; if(q.q===q0.q){ bs.find(x=>parseInt(x.dataset.orig)===q.correct).click(); done=true; break; } bs[0].click(); document.getElementById('qzNextBtn').click(); }
    return { done, left: !!(JSON.parse(localStorage.getItem('geoexplorer_quiz_miss')||'{}')[key]||{})[idOf(q0)] }; });
  ok(V.done && !V.left, 'une bonne réponse à une question revue l\'efface de la mémoire');
  ok(errs.length===0, 'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko? 'ECHECS: '+ko : 'TOUT OK'); process.exit(ko?1:0); })();
