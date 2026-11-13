// Mini-jeu « Lire un log » : chaque question doit avoir une réponse défendable avec les repères affichés.
// Lecteur idéal : Rt < 10 Ω·m = eau ; sinon écart densité-neutron > 7 points (jaune) = gaz ; sinon huile. Il ne doit jamais se tromper.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(400);
  const r = await pg.evaluate((N)=>{ const t0=performance.now(); const out={n:0,nul:0,faux:[],cnt:{eau:0,huile:0,gaz:0},sansTable:0,verdictFaux:0}; 
    for(let i=0;i<N;i++){ const f=['eau','huile','gaz'][i%3]; const l=window.__lgm.makeLog(f,[],{vsh:i%2===0, calc:(i%6<3)?'sw':'contact'}); if(!l){out.nul++; continue;} out.n++; out.cnt[l.fluid]++;
      const rt=l.rB.rt, gap=l.rB.gap; const pred = rt<10 ? 'eau' : (gap>7 ? 'gaz' : 'huile'); if(pred!==l.fluid) out.faux.push([l.fluid,pred,+rt.toFixed(1),+gap.toFixed(1)]);
      if(!l.qs.every(q=>q.type==='contact' || /<table class="lgm-read"/.test(q.table||''))) out.sansTable++;
      if(l.qs[1].good!==l.fluid) out.verdictFaux++;
      if(!(l.rng.zA>=l.rng.z0 && l.rng.zA<=l.rng.z1-10 && l.rng.zB>=l.rng.z0 && l.rng.zB<=l.rng.z1-10)) out.horsLog=(out.horsLog||0)+1; }
    out.msParLog=(performance.now()-t0)/N; return out; }, 300);
  // Questions variées : chaque calcul se refait à partir des valeurs affichées, les options sont distinctes et espacées
  const v = await pg.evaluate(()=>{ const o={n:0,types:{},q1:{},bad:[]}; const spaced=(opts)=>{ const a=opts.map(x=>+x.k).sort((x,y)=>x-y); for(let i=1;i<a.length;i++) if(a[i]-a[i-1]<3) return false; return new Set(opts.map(x=>x.k)).size===opts.length; };
    for(let i=0;i<240;i++){ const f=['eau','huile','gaz'][i%3]; const l=window.__lgm.makeLog(f,[],{vsh:i%2===0, calc:(i%6<3)?'sw':'contact'}); if(!l) continue; o.n++; o.types[l.calc]=(o.types[l.calc]||0)+1; o.q1[l.q1type]=(o.q1[l.q1type]||0)+1;
      const q1=l.qs[0], q3=l.qs[2];
      if(l.qs.length!==3) o.bad.push(['nb', l.qs.length]);
      if(l.fluid==='eau' && q3.type!=='poro') o.bad.push(['eau', q3.type]); if(l.fluid!=='eau' && q3.type==='poro') o.bad.push(['hc', q3.type]);
      if(q1.type==='vsh'){ const m=q1.meta, p=Math.round(Math.max(0,Math.min(1,(m.gr-m.clean)/(115-m.clean)))*100); if(String(p)!==q1.good || p<10 || p>90 || !spaced(q1.opts) || !q1.text.includes(m.gr+' API')) o.bad.push(['vsh',p,q1.good]); }
      else if(q1.type!=='lith') o.bad.push(['q1type',q1.type]);
      const m=q3.meta;
      if(q3.type==='poro'){ const phi=(m.rma-m.rb)/(m.rma-m.rf), p=Math.round(phi*100); if(String(p)!==q3.good || phi<0.05 || phi>0.36 || !spaced(q3.opts) || ![2.65,2.71,2.87].includes(m.rma)) o.bad.push(['poro',p,q3.good]); }
      if(q3.type==='sw'){ const sw=Math.sqrt(m.rw/((m.phi/100)*(m.phi/100)*m.rt)), p=Math.round(sw*100); if(String(p)!==q3.good || sw<0.08 || sw>0.85 || !spaced(q3.opts)) o.bad.push(['sw',p,q3.good]); }
      if(q3.type==='contact'){ const c=+q3.good; const ds=q3.opts.map(x=>+x.k).sort((a,b)=>a-b); let gap=true; for(let k=1;k<ds.length;k++) if(ds[k]-ds[k-1]<20) gap=false;
        if(Math.abs(c-l.rng.hcBase)>2.6 || !gap || !q3.opts.some(x=>+x.k===c) || c<=m.top || c>=m.base) o.bad.push(['contact',c,Math.round(l.rng.hcBase)]); } }
    return o; });
  ok(v.bad.length===0, 'questions variées : volume d\'argile, porosité, saturation en eau et contact recalculés depuis les valeurs affichées, options distinctes et espacées ('+v.bad.length+' erreurs sur '+v.n+') '+JSON.stringify(v.bad.slice(0,3)));
  ok(v.types.poro>=60 && v.types.sw>=30 && v.types.contact>=30 && v.q1.vsh>=20, 'les types de questions sont tous présents '+JSON.stringify(v.types)+' '+JSON.stringify(v.q1));
  console.log(JSON.stringify({n:r.n,nul:r.nul,cnt:r.cnt,faux:r.faux.length,msParLog:Math.round(r.msParLog)}));
  ok(r.nul===0, 'aucun log introuvable (génération par rejet) : '+r.nul+' échecs sur 300');
  ok(r.faux.length===0, 'lecteur idéal : 0 erreur sur '+r.n+' questions de fluide '+JSON.stringify(r.faux.slice(0,4)));
  ok(Math.abs(r.cnt.eau-r.cnt.huile)<=2 && Math.abs(r.cnt.huile-r.cnt.gaz)<=2, 'fluides équilibrés '+JSON.stringify(r.cnt));
  ok(!r.horsLog, 'les repères A et B sont toujours dans la portion tracée du log ('+(r.horsLog||0)+' hors du dessin sur '+r.n+')');
  ok(r.sansTable===0, 'tableau de valeurs lues présent pour chaque question'); ok(r.verdictFaux===0, 'bonne réponse cohérente avec le fluide imposé');
  ok(r.msParLog<250, 'génération rapide : '+Math.round(r.msParLog)+' ms par log');
  // une manche contient bien les trois fluides
  const m = await pg.evaluate(()=>{ const seen=new Set(); for(let k=0;k<20;k++){ const s=new Set(); const f=['eau','huile','gaz']; f.forEach(x=>{const l=window.__lgm.makeLog(x); if(l) s.add(l.fluid);}); if(s.size===3) seen.add(k); } return seen.size; });
  ok(m===20, 'chaque manche peut proposer eau, huile et gaz');
  // roches demandées en A : jamais deux fois la même dans une manche de 4 logs (tant que le log le permet)
  const rep = await pg.evaluate(()=>{ let rep=0, tot=0; for(let k=0;k<60;k++){ const used=[]; ['eau','huile','gaz','huile'].forEach(f=>{ const l=window.__lgm.makeLog(f,used); if(l && l.q1type==='lith'){ if(used.includes(l.qs[0].good)) rep++; used.push(l.qs[0].good); } }); tot++; } return rep; });
  ok(rep<=3, 'roches en A : '+rep+' répétitions sur 60 manches (tolérées si le puits n\'offre pas d\'autre roche)');
  console.log('erreurs JS', errs); console.log(ko?'ECHECS: '+ko:'TOUT OK'); await br.close(); process.exit(ko||errs.length?1:0); })();
