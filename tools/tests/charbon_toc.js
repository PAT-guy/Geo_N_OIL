// Charbon houiller (V5.23) : une roche-mère de charbon a un TOC de charbon (45 à 85 %), pas celui d'un schiste ; la Rock-Eval, le rapport de frac et l'estimation du joueur sont cohérents ; les quiz Rock-Eval restent sur des shales.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1300,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const r = await pg.evaluate(()=>{ const o={ coal:0, coalToc:[], other:[], re:[], frac:[], est:[], html:[] };
    for(const bt of ['north_sea','paris','rift','aquitaine','gulf_coast','permian']){ for(let s=1;s<=5;s++){ generateGeology(12, bt, bt==='north_sea'||bt==='gulf_coast', s*7919+13); for(const b of blocks){ const h=b.horizons.findLast(x=>x.role==='source'); if(!h||b.srcAbsent||b.isOffshore) continue; const coal=/charbon|houille/i.test(FRN(h.name)||''); const t=parseFloat(h.toc);
        if(!coal){ o.other.push(t); continue; } o.coal++; o.coalToc.push(t);
        if(o.re.length<60){ const re=STUDIES.rockeval.do(b, makeRng(7+o.re.length)); o.re.push({ toc:+re.toc, hi:re.hi, pot:re.genPotential }); }
        const st=shaleTrue(b); o.frac.push({ why:st.why, toc:st.toc, thick:st.thick, q:st.q, ok:st.ok, tocLayer:t });
        if(o.est.length<20){ b.studies.push({ type:'rockeval', result:STUDIES.rockeval.do(b, makeRng(3)) }); const se=shaleEstimate(b); o.est.push({ ok:se.ok, coal:se.coal, toc:se.toc }); b.studies.pop(); }
        if(o.html.length<5){ b.fracInfo={ ...st, lat:2000, ip:0, why:st.why }; o.html.push(fracRevealHtml(b,false)); } } } }
    // quiz Rock-Eval : jamais de TOC de charbon
    let maxToc=0; for(let i=0;i<40;i++){ for(const q of window.__qz.qzGenRockeval()){ (q.facts||[]).forEach(f=>{ if(f[0]==='TOC'){ maxToc=Math.max(maxToc, parseFloat(String(f[1]).replace(',','.'))); } }); } }
    const mm=a=>[Math.min(...a), Math.max(...a)]; return { coal:o.coal, coalToc:mm(o.coalToc), otherToc:mm(o.other), reToc:mm(o.re.map(x=>x.toc)), reHi:mm(o.re.map(x=>x.hi)), fracWhy:[...new Set(o.frac.map(f=>f.why))], fracTocOk:o.frac.every(f=>Math.abs(f.toc-f.tocLayer)<0.06 && f.thick>0), fracQ0:o.frac.every(f=>f.q===0 && f.ok===false), est:o.est, html:o.html, maxToc }; });
  ok(r.coal>50,'des charbons existent dans les cartes testées ('+r.coal+')');
  ok(r.coalToc[0]>=45 && r.coalToc[1]<=85,'TOC de la couche de charbon : 45 à 85 % '+JSON.stringify(r.coalToc));
  ok(r.otherToc[1]<=9.5,'TOC des autres roches-mères inchangé (au plus 9,5 %) '+JSON.stringify(r.otherToc));
  ok(r.reToc[0]>=40 && r.reToc[1]<=90 && r.reHi[1]<=250,'Rock-Eval d\'un charbon : TOC de charbon, HI bas (type III) '+JSON.stringify([r.reToc,r.reHi]));
  ok(r.fracWhy.includes('coal') && r.fracTocOk && r.fracQ0,'frac sur un charbon : raison « charbon », TOC et épaisseur réels, pas de production');
  ok(r.est.length>0 && r.est.every(e=>e.ok===false && e.coal===true && e.toc>=30),'estimation du joueur après Rock-Eval : charbon, non exploitable');
  ok(r.html.length>0 && r.html.every(h=>!/TOC <b>0\.0 %/.test(h) && !/épaisseur <b>0 m/.test(h) && /charbon/.test(h)),'rapport de frac : plus de « TOC 0,0 % » ni d\'épaisseur nulle, explication du charbon');
  ok(r.maxToc<=12,'quiz Rock-Eval : aucun TOC de charbon (max '+r.maxToc+' %)');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
