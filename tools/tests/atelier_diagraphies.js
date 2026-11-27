// Atelier diagraphies (V5.49) : quatre parcours interactifs sur de vrais logs (un exercice par outil, un puits de A à Z, corrélation de deux puits, pièges de lecture). On joue chaque parcours avec les bonnes réponses (score maximal), puis avec de mauvaises (score bas), et on vérifie l'accueil, l'anglais et l'état de la partie.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1200,height:1000}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const R = await pg.evaluate(async()=>{ const o={ paths:{} }; const DG=window.__dg; const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const before = { blocks, nb:blocks.length, strat:STRAT };
    const clickZ = (z, i=0)=>{ const svg=document.getElementById('dgLogs').children[i], r=svg.getBoundingClientRect(), H=+svg.dataset.h, z0=+svg.dataset.z0, z1=+svg.dataset.z1, top=+svg.dataset.top, ph=+svg.dataset.ph; svg.onpointerdown({ clientY: r.top + (top + (z-z0)/(z1-z0)*ph)/H*r.height }); };
    const btn=id=>document.getElementById(id), next=()=>{ const b=btn('dgNext'); if(b) b.click(); };
    const choose=(pred)=>{ const bs=[...document.querySelectorAll('#dgCtl button')]; const b=bs.find(pred)||bs[0]; b.click(); };
    // accueil
    o.btn=!!document.querySelector('#quickTrain button[data-open="dg"]'); o.card=!!document.getElementById('dgOpenBtn'); o.chip=document.getElementById('quickMiniCount').textContent;
    DG.open(); o.menu=document.querySelectorAll('#dgMenu button').length;
    const play = async (name, brain)=>{ DG.start(name); const log=[]; for(let guard=0; guard<40; guard++){ const S=DG.S; if(!S || !S.step) break; const st=S.step; if(document.getElementById('dgPrompt').textContent.startsWith('Parcours terminé')) break; await brain(st, S); const fb=document.getElementById('dgFb').textContent; log.push((document.querySelector('#dgFb .dg-fb')||{}).className||''); if(!btn('dgNext')) { log.push('pas de suite'); break; } const last = btn('dgNext').textContent.startsWith('Voir'); next(); await wait(20); if(last) break; } const S=DG.S; return { pts:S.pts, max:S.max, n:log.length, log, done:document.getElementById('dgPrompt').textContent }; };
    // brain parfait par étape (selon le chip)
    const perfect = async (st,S)=>{ const t = (S.W||{}).truth, P=S.P, chip=st.chip;
      if(/GR/.test(chip) && /1\/5/.test(chip)){ clickZ(t.top); btn('dgOk').click(); }
      else if(/Résistivité|Resistivity/.test(chip)){ clickZ(t.hcBase); btn('dgOk').click(); }
      else if(/Densité-neutron|Density-neutron/.test(chip)){ choose(b=> t.fluid==='gaz' ? /^(Oui|Yes)/.test(b.textContent) : /^(Non|No)/.test(b.textContent)); }
      else if(/Sonique|Sonic/.test(chip)){ const k=Math.round((t.top+t.thr/2-S.W.g.z0)/S.W.g.dz), dtMa={sandstone:55.5,limestone:47.5,dolomite:43.5}[t.lith], phi=Math.max(0,Math.min(0.4,(S.W.g.dt[k]-dtMa)/(189-dtMa))); const sl=btn('dgS_phi'); sl.value=phi; sl.dispatchEvent(new Event('input')); btn('dgOk').click(); }
      else if(/Caliper/.test(chip)){ const gg=st.logs[0].g, c=gg.cal; let a=-1,b=-1; gg.z.forEach((z,i)=>{ if(c && c[i]>BIT_TEST){ if(a<0) a=z; b=z; } }); clickZ((a+b)/2); btn('dgOk').click(); }
      else if(/Étape 1|Step 1/.test(chip)){ choose(b=>b.textContent===({sandstone:'Grès',limestone:'Calcaire',dolomite:'Dolomie'})[t.lith]); }
      else if(/Étape 2|Step 2/.test(chip)){ clickZ(t.top); clickZ(t.base); btn('dgOk').click(); }
      else if(/Étape 3|Step 3/.test(chip)){ const set=(k,v)=>{ const e=btn('dgS_'+k); e.value=v; e.dispatchEvent(new Event('input')); }; set('vsh',0.4); set('phi',0.08); set('sw',0.6); btn('dgOk').click(); }
      else if(/Étape 4|Step 4/.test(chip)){ choose(b=>({eau:/eau/i,huile:/huile|oil/i,gaz:/gaz|gas/i})[t.fluid].test(b.textContent)); }
      else if(/Étape 5|Step 5/.test(chip)){ const ref=DG.payCalc(S.W.g,t.top,t.base,t.lith,t.Rw,{vsh:0.4,phi:0.08,sw:0.6}); const key = t.fluid==='eau' ? /Sec|Dry/ : ref.net>=6 ? /Producteur|Producer/ : /tester|test/; choose(b=>key.test(b.textContent)); }
      else if(/Corrélation.*toit|Correlation.*top/.test(chip)){ clickZ(P.B.top, 1); btn('dgOk').click(); }
      else if(/Corrélation.*cause|Correlation.*cause/.test(chip)){ const key={structure:/décalé|shifted/,biseau:/amincit|thins/,aucun:/Rien|Nothing/}[P.kind]; choose(b=>key.test(b.textContent)); }
      else if(/Piège de lecture|Reading trap/.test(chip)){ const key={hc:/hydrocarbures|hydrocarbon/,evap:/évaporite|evaporite/,coal:/charbon|Coal/i,tight:/compacte|tight/,trou:/éboulé|washed/}[st.trapKind]; choose(b=>key.test(b.textContent)); }
    };
    window.BIT_TEST = 9.5;
    const wrong = async (st,S)=>{ const chip=st.chip; const t=(S.W||{}).truth, P=S.P;
      const ctl=[...document.querySelectorAll('#dgCtl button')];
      if(document.getElementById('dgOk') && !document.getElementById('dgS_phi') && !document.getElementById('dgS_vsh')){ const far = (t ? (t.top - 40) : P.B.top - 60); clickZ(far, P && /Corr/.test(chip) ? 1 : 0); document.getElementById('dgOk').click(); }
      else if(document.getElementById('dgS_vsh')){ const set=(k,v)=>{ const e=btn('dgS_'+k); e.value=v; e.dispatchEvent(new Event('input')); }; set('vsh',0.7); set('phi',0.03); set('sw',0.95); btn('dgOk').click(); }
      else if(document.getElementById('dgS_phi')){ const sl=btn('dgS_phi'); sl.value=0.34; sl.dispatchEvent(new Event('input')); btn('dgOk').click(); }
      else { const bad = ctl.find(b=>!/Grès|Calcaire|^Oui|^Non|Producteur|Sec|décalé|hydrocarbures/.test(b.textContent)) || ctl[ctl.length-1]; bad.click(); }
    };
    for(const name of ['outils','az','correl']){ o.paths[name]=await play(name, perfect); }
    o.paths.pieges=await play('pieges', perfect);
    o.wrong = await play('outils', wrong);
    return o; });
  ok(R.btn && R.card && /14 jeux/.test(R.chip),'accueil : bouton, carte, pastille « '+R.chip+' »');
  ok(R.menu===4,'quatre parcours dans le menu ('+R.menu+')');
  for(const n of ['outils','az','correl']){ const p=R.paths[n]; ok(p.pts===p.max && p.max>=3,'parcours « '+n+' » joué parfaitement : '+p.pts+' / '+p.max+' '+JSON.stringify(p.log.slice(0,6))); }
  { const p=R.paths.pieges; ok(p.pts===p.max && p.max>=3,'parcours « pieges » joué parfaitement : '+p.pts+' / '+p.max+' '+JSON.stringify(p.log.slice(0,6))); }
  ok(R.wrong.pts < R.wrong.max,'avec de mauvaises réponses le score baisse : '+R.wrong.pts+' / '+R.wrong.max);
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
