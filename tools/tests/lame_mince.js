// Lame mince (V5.37) : image procédurale de la roche réservoir d'un bloc carotté, construite d'après la carotte ; quatre modes (lumière naturelle, polars croisés, fluorescence UV, écoulement simulé).
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1100,height:1000}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const r = await pg.evaluate(async()=>{ const out={}; document.getElementById('geoSeed').value='1001'; menuConfig.mode='junior'; menuConfig.basinType='paris'; menuConfig.seed='1001'; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); setSpeed(0); G.budget=60e6; LABOPT.pick=false; G.labOpt.pick=false; performStudy(null,'gravity');
    const c=blocks.filter(b=>!b.inSalt&&!b.isOffshore).sort((a,z)=>z.trueProbability-a.trueProbability); let well=null; for(const b of c.slice(0,12)){ drillBlock(b.id,'vertical','renforce'); for(let i=0;i<40&&G.drilling.length;i++) monthTick(); drillRevealQueue.length=0; drillRevealPlaying=false; document.getElementById('drillRevealModal')?.classList.remove('open'); document.getElementById('alertModal')?.classList.remove('open'); if(b.well){ well=b; break; } }
    selectedBlock=well.id; renderGeoPanel(well); out.btnBefore=/Lame mince/.test(document.getElementById('geoContent').textContent); performStudy(well.id,'core'); renderGeoPanel(well); out.btnAfter=/Lame mince : fluides et écoulements/.test(document.getElementById('geoContent').textContent);
    const t0=performance.now(); lmOpen(well.id); out.ms=Math.round(performance.now()-t0); out.open=getComputedStyle(document.getElementById('lmModal')).display!=='none';
    const cv=document.getElementById('lmCanvas'), hash=()=>{ const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data; let h=0; for(let i=0;i<d.length;i+=37) h=(Math.imul(h,31)+d[i])|0; return h; }; out.size=cv.width;
    const modes={}, txts={}; for(const m of ['ppl','xpl','uv','flow']){ lmMode(m); modes[m]=hash(); txts[m]=document.getElementById('lmText').textContent; } out.distinct=new Set(Object.values(modes)).size; out.txts=txts;
    const st=LM.L.stats, core=well.estimate.core; out.phi=st.phi; out.corePhi=core.porosity/100; out.hcSeen=st.hcSeen; out.coreHc=LM.P.hc; out.conn=st.conn; out.stats=document.getElementById('lmStats').textContent;
    // déterministe
    lmMode('ppl'); const h1=hash(); lmOpen(well.id); lmMode('ppl'); out.same=h1===hash();
    // physique, sur des paramètres synthétiques
    const base={ carb:false, dmm:0.35, sort:0.3, cem:{k:'calcite',f:0.04}, phi:0.2, clay:0.02, hc:0.5, gas:false, api:35, noise:1.0, nz:0.3, tw:0.15 };
    const mean=(f)=>{ let a=0; for(let s=0;s<3;s++) a+=f(s); return a/3; };
    const ph=[0.06,0.12,0.18,0.26].map(phi=>mean(s=>lmBuild({...base, phi, seedKey:'p'+s+phi}).stats.keff)); out.kPhi=ph;
    const cm=[0,0.06,0.12].map(f=>{ let a=0; for(let s=0;s<4;s++) a+=lmBuild({...base, phi:0.16, cem:{k:'calcite',f}, seedKey:'c'+s}).stats.keff; return a/4; }); out.kCem=cm;
    const cn=[0.06,0.26].map(phi=>mean(s=>lmBuild({...base, phi, seedKey:'q'+s+phi}).stats.conn)); out.cnPhi=cn;
    const lo=lmBuild({...base, phi:0.06, seedKey:'z'}); out.tightNoFlow = lo.stats.conn===0 ? lo.stats.keff===0 : true;
    const gasP={...base, phi:0.24, hc:0.6, gas:true, seedKey:'g'}, gl=lmBuild(gasP); const cv2=document.createElement('canvas'); lmPaint(cv2, gl, gasP, 'uv'); const d2=cv2.getContext('2d').getImageData(0,0,cv2.width,cv2.height).data; let bright=0; for(let i=0;i<d2.length-4*cv2.width*32;i+=4) if(d2[i]>120||d2[i+1]>120) bright++; out.gasDark=bright===0;
    const wP={...base, phi:0.24, hc:0, seedKey:'w'}, wl=lmBuild(wP); const cv3=document.createElement('canvas'); lmPaint(cv3, wl, wP, 'uv'); const d3=cv3.getContext('2d').getImageData(0,0,cv3.width,cv3.height).data; let b3=0; for(let i=0;i<d3.length-4*cv3.width*32;i+=4) if(d3[i]>120||d3[i+1]>120) b3++; out.waterDark=b3===0;
    // anglais
    document.documentElement.lang='en'; lmRender(); const en=document.getElementById('lmText').textContent+' '+document.getElementById('lmStats').textContent+' '+document.getElementById('lmModes').textContent; document.documentElement.lang='fr'; out.en=en;
    return out; });
  ok(!r.btnBefore && r.btnAfter,'le bouton « Lame mince » n\'apparaît qu\'après l\'analyse de carotte');
  ok(r.open && r.size>=256 && r.ms<4000,'la fenêtre s\'ouvre sur une image '+r.size+' px construite en '+r.ms+' ms');
  ok(r.distinct===4,'quatre modes, quatre images différentes (lumière naturelle, polars croisés, fluorescence UV, écoulement)');
  ok(Math.abs(r.phi-r.corePhi)<0.003,'porosité de l\'image = porosité de la carotte ('+(r.phi*100).toFixed(1)+' % pour '+(r.corePhi*100).toFixed(1)+' %)');
  ok(Math.abs(r.hcSeen-r.coreHc)<0.03,'fraction des pores occupée par l\'huile = saturation de la carotte ('+Math.round(r.hcSeen*100)+' % pour '+Math.round(r.coreHc*100)+' %)');
  ok(r.same,'déterministe : un même bloc donne la même image');
  ok(r.kPhi[0]<r.kPhi[1]+1e-9 && r.kPhi[1]<r.kPhi[2]+1e-9 && r.kPhi[2]<r.kPhi[3] && r.kPhi[3]>3*r.kPhi[1] && r.kPhi[0]<0.01,'la conductance croît avec la porosité : '+r.kPhi.map(v=>v.toFixed(3)).join(' < '));
  ok(r.cnPhi[1]>r.cnPhi[0]+0.5 && r.tightNoFlow,'une roche compacte garde des pores isolés (reliés '+Math.round(r.cnPhi[0]*100)+' %), une roche poreuse les relie ('+Math.round(r.cnPhi[1]*100)+' %) ; sans pores reliés, pas d\'écoulement');
  ok(r.kCem[0]>r.kCem[2]+0.004 && r.kCem[0]>=r.kCem[1]-0.003,'le ciment bouche les gorges (porosité fixée à 16 %) : conductance '+r.kCem.map(v=>v.toFixed(3)).join(' > ')+' pour 0, 6 et 12 % de ciment');
  ok(r.gasDark && r.waterDark,'fluorescence UV : le gaz et l\'eau restent noirs, seule l\'huile brille');
  ok(/Lumière naturelle/.test(r.txts.ppl) && /Polars croisés/.test(r.txts.xpl) && /Fluorescence UV/.test(r.txts.uv) && /Écoulement simulé/.test(r.txts.flow) && /Kozeny-Carman/.test(r.stats),'textes d\'explication par mode et comparaison Kozeny-Carman avec la perméabilité mesurée');
  ok(!/[éèàùçê]|Lumière|Polars|Écoulement|Porosité|Perméabilité/.test(r.en) && /Plane light|Crossed polars/.test(r.en),'version anglaise : aucun texte français dans la fenêtre');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
