// Quiz Maturation et Rock-Eval générés par le moteur géologique : chaque question doit avoir une réponse défendable,
// les classes doivent être équilibrées, une manche mélange questions générées et questions fixes, la partie en cours n'est pas touchée.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(400);
  // une vraie partie est lancée : on vérifie qu'elle n'est pas modifiée par la génération des quiz
  await pg.click('#startBtn'); await pg.click('#labOptGo'); await pg.waitForTimeout(500);
  const empreinte = ()=>JSON.stringify({ n: blocks.length, q: blocks.map(b=>[b.id,b.trueQuality,b.maturityClass,b.topOfReservoir,b.horizons.length]), s: STRAT.length, g: GS ? Object.keys(GS).length : 0, lv: buildStratigraphy.lastVariant });
  await pg.evaluate(`window.__avant = (${empreinte.toString()})()`);
  const r = await pg.evaluate(()=>{ const t0=performance.now(); const out={mat:[],rock:[],manches:[]};
    for(let i=0;i<40;i++){ out.mat.push(...window.__qz.qzGenMaturation(6)); out.rock.push(...window.__qz.qzGenRockeval()); }
    out.ms=(performance.now()-t0)/80;
    for(let i=0;i<20;i++){ ['maturation','rockeval'].forEach(k=>{ const m=window.__qz.qzBuildRound(window.__qz.QUIZ_BANKS[k]); out.manches.push({k, n:m.length, gen:m.filter(q=>q.gen).length}); }); }
    return out; });
  const apres = await pg.evaluate(`(${empreinte.toString()})()`); const avant = await pg.evaluate(()=>window.__avant);
  const valid = q => q.q && Array.isArray(q.choices) && q.choices.length>=2 && Number.isInteger(q.correct) && q.correct>=0 && q.correct<q.choices.length && q.explain;
  ok(r.mat.length===240, 'maturation : 6 questions générées par manche ('+r.mat.length+'/240)'); ok(r.rock.length===240, 'rock-eval : 6 questions générées par manche ('+r.rock.length+'/240)');
  ok(r.mat.every(valid) && r.rock.every(valid), 'toutes les questions générées sont bien formées');
  // maturation : la réponse doit se retrouver par le calcul affiché
  let faux=0, marge=0; const cnt=[0,0,0]; r.mat.forEach(q=>{ const m=/à (\d+) m, gradient géothermique ([\d,]+) °C\/km, exhumation ×([\d,]+)/.exec(q.q); const top=+m[1], g=+m[2].replace(',','.'), e=+m[3].replace(',','.'); const T=14+top*e*g/1000; const cls=T<60?0:T<=150?1:2; if(cls!==q.correct) faux++; if(Math.abs(T-60)<8||Math.abs(T-150)<8) marge++; cnt[q.correct]++; });
  ok(faux===0, 'maturation : le calcul affiché donne toujours la bonne classe ('+faux+' erreurs)'); ok(marge===0, 'maturation : aucune question à moins de 8 °C d\'un seuil');
  ok(Math.max(...cnt)-Math.min(...cnt)<=2, 'maturation : classes équilibrées '+JSON.stringify(cnt));
  // rock-eval : Tmax et S2 recalculables
  let fauxR=0, tm=0, s2=0, po=0; r.rock.forEach(x=>{ if(x.kind==='potentiel'){ po++; const m=/TOC = ([\d,]+) %, HI = (\d+)/.exec(x.q), t=+m[1].replace(',','.'), h=+m[2]; const cls = t<0.3?'Non générateur': t<0.7?'Pauvre': t<1.5 ? (h>300?'Bon':'Moyen') : (h>400?'Excellent':'Bon'); if(x.choices[x.correct]!==cls || [0.3,0.7,1.5].some(th=>Math.abs(t-th)/th<0.08) || (t>=0.7&&t<1.5&&Math.abs(h-300)<30) || new Set(x.choices).size!==x.choices.length) fauxR++; return; } let m=/Tmax = (\d+) °C/.exec(x.q); if(m){ tm++; const t=+m[1], c=t<435?0:t<=455?1:2; if(c!==x.correct||(t>430&&t<435)||(t>455&&t<460)) fauxR++; } else { s2++; const mm=/A : TOC = ([\d,]+) %, HI = (\d+).*B : TOC = ([\d,]+) %, HI = (\d+)/.exec(x.q); const sa=+mm[1].replace(',','.')*mm[2]/100, sb=+mm[3].replace(',','.')*mm[4]/100; const c=sa>sb?0:1; if(c!==x.correct || Math.max(sa,sb)/Math.min(sa,sb)<1.3) fauxR++; } });
  ok(fauxR===0 && tm===120 && s2===80 && po===40, 'rock-eval : Tmax, S2 et potentiel recalculés = bonne réponse, marges respectées ('+tm+' Tmax, '+s2+' S2, '+po+' potentiel, '+fauxR+' erreurs)');
  ok(r.manches.every(m=>m.n===8) && r.manches.filter(m=>m.k==='maturation').every(m=>m.gen===6) && r.manches.filter(m=>m.k==='rockeval').every(m=>m.gen===6), 'manche de 8 questions : 6 (maturation ou rock-eval) générées + le reste tiré de la liste fixe');
  ok(apres===avant && avant.length>500, 'la partie en cours (cartes, strates) n\'est pas modifiée par la génération des quiz ('+avant.length+' octets comparés)');
  ok(r.ms<120, 'génération rapide : '+Math.round(r.ms)+' ms par manche');
  // sismique : chaque question générée se recalcule à partir de ses valeurs affichées (meta) et le texte affiche bien ces valeurs
  const sq = await pg.evaluate(()=>{ const all=[]; for(let i=0;i<40;i++) all.push(...window.__qz.qzGenSeismic()); const m=[]; for(let i=0;i<20;i++){ const r=window.__qz.qzBuildRound(window.__qz.QUIZ_BANKS.seismic); m.push([r.length, r.filter(x=>x.gen).length]); } return {all, m}; });
  let sf=0; const kc={}; sq.all.forEach(x=>{ kc[x.kind]=(kc[x.kind]||0)+1; const m=x.meta; let good=-1, txt=true;
    if(x.kind==='pol') good = m.R>0?0:1;
    if(x.kind==='force'){ const a=m.Rs.map(Math.abs); good=a.indexOf(Math.max(...a)); const s2=[...a].sort((u,w)=>w-u); if(s2[0]/s2[1]<1.4) sf++; }
    if(x.kind==='twt'){ good=0; txt = x.q.includes(m.z+' m') && x.q.includes(m.V+' m/s') && x.choices[0]===Math.round(2000*m.z/m.V)+' ms'; }
    if(x.kind==='calage'){ good=0; txt = x.q.includes(m.z+' m') && x.q.includes(m.t+' ms') && Math.abs(m.V-2000*m.z/m.t)<=5 && x.choices[0]===m.V+' m/s'; }
    if(x.kind==='multiple'){ good=0; txt = m.R>0 && x.q.includes(m.t0+' ms') && x.choices[0]===(2*m.t0)+' ms'; }
    if(x.kind==='resol'){ good=0; txt = x.q.includes(m.f+' Hz') && x.q.includes(m.V+' m/s') && x.choices[0]==='environ '+Math.round(m.V/(4*m.f))+' m'; }
    if(good!==x.correct || !txt || new Set(x.choices).size!==x.choices.length) sf++; });
  ok(sq.all.length===240 && Object.values(kc).every(n=>n===40) && Object.keys(kc).length===6, 'sismique : 6 types de questions générées, un de chaque par manche '+JSON.stringify(kc));
  ok(sf===0, 'sismique : réponse recalculée = bonne réponse, valeurs affichées cohérentes, choix distincts ('+sf+' erreurs)');
  ok(sq.m.every(([n,g])=>n===8&&g===6), 'sismique : manche de 8 questions, 6 générées + 2 de la liste fixe');
  // lithofaciès : la mesure affichée désigne nettement la bonne roche parmi les choix (prototype le plus proche, 1,5 fois plus près que le suivant)
  const lq = await pg.evaluate(()=>{ const all=[]; for(let i=0;i<40;i++) all.push(...window.__qz.qzGenLitho(5)); const bad=[]; const kinds={};
    all.forEach(x=>{ const {z,m,opts,good}=x.meta; kinds[good]=(kinds[good]||0)+1; const d=opts.map(c=>window.__qz.qzLithDist(m, window.__qz.qzLithProto(c,z))); const gi=opts.indexOf(good); const second=Math.min(...d.filter((_,i)=>i!==gi)); if(d[gi]*1.5>second || x.correct!==gi || new Set(opts).size!==4) bad.push([good,d.map(v=>+v.toFixed(2))]); if(!x.q.includes('GR = '+m.gr+' API')) bad.push(['texte',good]); });
    const m=[]; for(let i=0;i<20;i++){ const r=window.__qz.qzBuildRound(window.__qz.QUIZ_BANKS.lithofacies); m.push([r.length, r.filter(x=>x.gen).length]); } return {n:all.length, bad, kinds:Object.keys(kinds).length, m}; });
  ok(lq.n===200 && lq.bad.length===0, 'lithofaciès : '+lq.n+' questions de mesures, réponse nettement la plus proche, texte cohérent ('+lq.bad.length+' erreurs) '+JSON.stringify(lq.bad.slice(0,2)));
  ok(lq.kinds>=8, 'lithofaciès : '+lq.kinds+' lithologies différentes sur 200 questions'); ok(lq.m.every(([n,g])=>n===8&&g===5), 'lithofaciès : manche de 8 questions, 5 générées + 3 descriptions fixes');
  // jeu de cartes : la probabilité est celle du moteur (vérifiée sur les blocs générés) et les cartes la déplacent dans le bon sens
  const cg = await pg.evaluate(()=>{ const keep={ blocks, STRAT, STRAT_PROVINCES, GS, lv: buildStratigraphy.lastVariant, wlz: wlZoom }; let errRaw=0, n=0;
    try { for(let i=0;i<25;i++){ generateGeology(12, ['random','rift','passive','foreland','paris','north_sea','aquitaine','gulf_coast'][i%8], true, (Math.random()*1e9)|0); blocks.forEach(b=>{ const p=window.__cg.cgEngineProb(b.trapFactor,b.resFactor,b.sealFactor,b.srcFactor); errRaw=Math.max(errRaw,Math.abs(p-b.pRaw)); n++; }); } } finally { blocks=keep.blocks; STRAT=keep.STRAT; STRAT_PROVINCES=keep.STRAT_PROVINCES; GS=keep.GS; buildStratigraphy.lastVariant=keep.lv; wlZoom=keep.wlz; }
    const f=window.__cg.cgFactors, P=window.__cg.cgEngineProb; const pr=ids=>{ const x=f(ids); return P(x.piege,x.reservoir,x.couverture,x.charge); };
    return { n, errRaw, strong:pr(['p1','r1','c1','h1']), weak:pr(['p1','r1','c1','h5']), mid:pr(['p4','r7','c3','h3']), worst:pr(['p5','r5','c5','h5']), syn:pr(['p1','r1','c1','h1'])-pr(['p1','r4','c1','h1']) }; });
  ok(cg.n>=3000 && cg.errRaw<1e-9, 'cartes : formule du moteur (probabilité brute) reproduite sur '+cg.n+' blocs générés (écart maximal '+cg.errRaw+')');
  ok(cg.strong>0.85 && cg.worst<0.2 && cg.weak<0.4 && cg.mid>cg.worst && cg.mid<cg.strong, 'cartes : maillon faible dominant (4 cartes fortes '+Math.round(cg.strong*100)+' %, trois fortes et une à 1 : '+Math.round(cg.weak*100)+' %, moyennes '+Math.round(cg.mid*100)+' %, quatre à 1 : '+Math.round(cg.worst*100)+' %)');
  { const apres2 = await pg.evaluate(`(${empreinte.toString()})()`); ok(apres2===avant, 'partie en cours toujours intacte après les quiz sismiques'); }
  // les autres quiz restent des listes fixes
  const fixes = await pg.evaluate(()=>['lithofacies'].map(k=>window.__qz.qzBuildRound(window.__qz.QUIZ_BANKS[k]).length)); ok(fixes.every(n=>n===8), 'lithofaciès : manche de 8 questions fixes');
  console.log('erreurs JS', errs); console.log(ko?'ECHECS: '+ko:'TOUT OK'); await br.close(); process.exit(ko||errs.length?1:0); })();
