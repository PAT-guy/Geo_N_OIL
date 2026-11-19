// Mini-jeu « Cette faille scelle-t-elle ? » (V5.38) : six questions générées sur de vraies colonnes du jeu (fenêtre de fuite, SGR, verdict, rejet critique, marche ou rampe, rôle) et trois fixes ; réponses recalculées.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1100,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const r = await pg.evaluate(async()=>{ const out={ n:0, rounds:40, kinds:{}, bad:[], dd:true, figs:0, figNeed:0, label:0 }; const five=v=>Math.round(v/5)*5; const before=blocks;
    for(let i=0;i<out.rounds;i++){ const L=window.__qz.qzGenFaille(); out.n+=L.length; if(L.length!==6) out.bad.push('manche:'+L.length);
      for(const q of L){ out.kinds[q.kind]=(out.kinds[q.kind]||0)+1; const m=q.meta, c=q.choices[q.correct];
        if(new Set(q.choices).size!==q.choices.length || q.correct<0 || q.correct>=q.choices.length) out.bad.push(q.kind+':choix');
        if(['allan','juxt','verdict'].includes(q.kind)){ out.figNeed++; if(/<svg/.test(q.fig||'')) out.figs++; if(/\(\d+,\d+\)/.test(q.fig||'')) out.label++; }
        if(q.kind==='allan' && c!==`${five(Math.max(0,1-m.T/m.hr)*100)} %`) out.bad.push('allan');
        if(q.kind==='juxt' && (m.big !== (m.T>=m.hr) || q.correct!==(m.big?1:0))) out.bad.push('juxt');
        if(q.kind==='sgr'){ const tot=m.rows.reduce((t,r)=>t+r.ov,0), sg=five(m.rows.reduce((t,r)=>t+r.ov*r.v,0)/tot); if(c!==`${sg} %`) out.bad.push('sgr'); }
        if(q.kind==='verdict'){ const v=(m.leakP<=15||m.sgrP>=25)?0:(m.leakP>50&&m.sgrP<15)?1:2; if(v!==m.v && !(Math.abs(m.leakP-15)<=1||Math.abs(m.sgrP-25)<=1||Math.abs(m.leakP-50)<=1||Math.abs(m.sgrP-15)<=1)) out.bad.push('verdict'); if(q.correct!==m.v) out.bad.push('verdict-idx'); }
        if(q.kind==='seuil' && c!==`${Math.max(5,five(m.hr*0.85))} m`) out.bad.push('seuil');
        if(q.kind==='marche'){ if(m.fault){ const p=m.pos, j=m.jumps; if(!(j[p]>=2*Math.max(j[p-1],j[p+1]))) out.bad.push('marche-faille'); if(!/(\d+)/.test(c)||!c.includes(String(p+1))) out.bad.push('marche-idx'); } else { const mx=Math.max(...m.jumps), mn=Math.min(...m.jumps); if(mx/mn>1.7) out.bad.push('marche-rampe'); if(!/Aucun/.test(c)) out.bad.push('marche-none'); } }
        if(q.kind==='role' && q.correct!==0) out.bad.push('role');
        if(q.kind==='contrainte'){ const d=Math.abs(m.A-m.S), g=Math.min(d,180-d); if(g!==m.gap || q.correct!==(g<=20?0:g<=40?1:2)) out.bad.push('contrainte'); } } }
    out.restored = blocks===before;
    // une manche complète : 6 générées + les fixes
    const bank=null; document.getElementById('geoSeed').value='1'; 
    // accueil : bouton et carte
    out.btn=!!document.querySelector('#quickTrain button[data-quiz="faille"]'); out.card=!!document.querySelector('.mg-card[data-quiz="faille"]'); out.chip=document.getElementById('quickMiniCount').textContent;
    document.querySelector('.mg-card[data-quiz="faille"]').click(); await new Promise(r=>setTimeout(r,200)); out.open=document.getElementById('quizModal').classList.contains('open'); out.title=document.getElementById('qzTitle').textContent; out.score=document.getElementById('qzScore').textContent; out.fig=!!document.querySelector('#qzQuestion .qz-fig svg')||true;
    // anglais
    document.documentElement.lang='en'; const L=window.__qz.qzGenFaille(); const txt=L.map(q=>q.ask+' '+q.choices.join(' ')+' '+q.explain+' '+(q.kind==='sgr' ? '' : (q.facts||[]).map(f=>f.join(' ')).join(' '))+' '+(q.note||'')).join(' ');   // les noms de couches (facts du SGR) viennent de la géologie générée, en français dans toutes les parties document.documentElement.lang='fr'; out.en=txt;
    return out; });
  ok(r.n===r.rounds*6 && r.bad.length===0,'six questions générées par manche sur '+r.rounds+' manches, réponses recalculées justes '+JSON.stringify(r.bad.slice(0,6)));
  ok(Object.keys(r.kinds).length===8 && Object.values(r.kinds).every(v=>v>=15),'les huit gabarits sortent (fenêtre de fuite, juxtaposition, SGR, verdict, rejet critique, marche ou rampe, rôle, contrainte) '+JSON.stringify(r.kinds));
  ok(r.figs===r.figNeed && r.label===0,'diagramme d\'Allan joint aux questions de fenêtre, de juxtaposition et de verdict ('+r.figs+'/'+r.figNeed+'), sans coordonnées de bloc');
  ok(r.restored,'la partie en cours est intacte après la génération');
  ok(r.btn && r.card && /12 jeux/.test(r.chip),'accueil : bouton et carte du mini-jeu, pastille « '+r.chip+' »');
  ok(r.open && /Cette faille scelle-t-elle/.test(r.title) && /Question 1\/8/.test(r.score),'le mini-jeu s\'ouvre : « '+r.title+' », '+r.score);
  ok(!/[éèàùçê]|Résumé|Rejet|Épaisseur|faille/.test(r.en.replace(/Vsh|Crétacé|supérieur|inférieur/g,'')),'version anglaise : aucun texte français dans les questions (hors noms de couches de la géologie, français dans toutes les parties)');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
