// Failles ouvertes lisibles (V5.39) : une contrainte horizontale maximale par carte, des failles ouvertes selon leur orientation, révélée au premier log, azimut de faille lu en 3D, texte de la carte Faille.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1300,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const r = await pg.evaluate(async()=>{ const out={ cls:[[0,0],[0,0],[0,0]], azBad:0, rng:true, dd:true, n:0 }; const BT=['paris','permian','rift','north_sea','aquitaine','passive','gulf_coast','foreland'];
    for(const bt of BT) for(let s=0;s<30;s++){ const SD=7000+s*13+BT.indexOf(bt)*977; generateGeology(12,bt,false,SD); const st=LAST_STRESS, F=LAST_FAULTS.map(f=>({...f})); generateGeology(12,bt,false,SD); if(LAST_STRESS!==st) out.dd=false; if(!(st>=0 && st<Math.PI)) out.rng=false;
      F.forEach(f=>{ out.n++; const tx=-f.ny, ty=f.nx, az=((Math.atan2(tx,-ty)%Math.PI)+Math.PI)%Math.PI; if(Math.abs(az-f.az)>1e-9) out.azBad++; const d=Math.abs(f.az-st), g=Math.min(d,Math.PI-d)*180/Math.PI, k=g<=20?0:g<=40?1:2; out.cls[k][0]++; if(f.open) out.cls[k][1]++; }); }
    // partie : contrainte inconnue au départ, révélée par le premier log
    document.getElementById('geoSeed').value='4242'; menuConfig.mode='expert'; menuConfig.basinType='rift'; menuConfig.seed='4242'; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); setSpeed(0); G.budget=200e6; LABOPT.pick=false; G.labOpt.pick=false;
    out.start={ az:G.stressAz===LAST_STRESS, known:G.stressKnown, legend:getComputedStyle(document.getElementById('lgStress')).display };
    const logs=[]; const orig=window.addLog; window.addLog=(m,t)=>{ logs.push(String(m)); return orig(m,t); };
    performStudy(null,'gravity'); const c=blocks.filter(b=>!b.inSalt&&!b.isOffshore).sort((a,z)=>z.trueProbability-a.trueProbability); drillBlock(c[0].id,'vertical','renforce'); for(let i=0;i<40&&G.drilling.length;i++) monthTick(); drillRevealQueue.length=0; drillRevealPlaying=false; document.getElementById('drillRevealModal')?.classList.remove('open'); document.getElementById('alertModal')?.classList.remove('open');
    updateHud(); out.after={ known:G.stressKnown, legend:getComputedStyle(document.getElementById('lgStress')).display, rot:document.getElementById('lgStressG').getAttribute('transform'), txt:document.getElementById('lgStressTxt').textContent, az:Math.round(G.stressAz*180/Math.PI)%180 };
    drillBlock(c[1].id,'vertical','renforce'); for(let i=0;i<40&&G.drilling.length;i++) monthTick(); window.addLog=orig; out.stressLogs=new Set(logs.filter(l=>/contrainte horizontale maximale/.test(l))).size;
    // sismique 3D : azimut de la faille voisine
    const n=Math.sqrt(blocks.length)|0, idOf=(x,y)=>blocks.find(b=>b.x===x&&b.y===y).id; performStudy(null,'gravity'); for(const [a,b2] of [[idOf(1,2),idOf(n-2,2)],[idOf(1,5),idOf(n-2,5)],[idOf(1,n-3),idOf(n-2,n-3)]]){ G.sectionA=a; G.sectionB=b2; performStudy(null,'seismic2d'); }
    const errsAz=[]; let withF=0, noF=0, nullOk=true; for(const b of blocks){ if(!b.studies.some(q=>q.type==='seismic2d')||b.well||b.dryHole) continue; performStudy(b.id,'seismic3d'); const r3=b.studies.find(q=>q.type==='seismic3d'); if(!r3) continue; const fa=r3.result.faultAz; if(b.faultAz!=null){ withF++; if(fa==null) nullOk=false; else { const d=Math.abs(fa-b.faultAz), e=Math.min(d,Math.PI-d)*180/Math.PI; errsAz.push(e); } } else { noF++; if(fa!=null) nullOk=false; } }
    errsAz.sort((a,z)=>a-z); out.az3={ withF, noF, nullOk, med:errsAz.length?errsAz[Math.floor(errsAz.length/2)]:null, p95:errsAz.length?errsAz[Math.floor(errsAz.length*0.95)]:null };
    // carte Faille : texte selon la connaissance de la contrainte
    const FE=gsFaultEdges(); const e=FE.list.find(x=>blocks[x.a].studies.some(q=>q.type==='seismic3d'&&q.result.faultAz!=null)||blocks[x.b].studies.some(q=>q.type==='seismic3d'&&q.result.faultAz!=null)); out.hasEdge=!!e;
    if(e){ G.stressKnown=true; const t1=gsStressText(e); const o=gsFaultOrient(e); G.stressKnown=false; const t2=gsStressText(e); const eEn=(document.documentElement.lang='en', gsStressText(e,true)); document.documentElement.lang='fr'; out.txt={ o:o&&o.src, known:t1, unknown:t2, en:eEn };
      G.stressKnown=true; selectedBlock=e.a; renderGeoPanel(blocks[e.a]); out.card=/Azimut estimé \d+°/.test(document.getElementById('geoContent').textContent); }
    const keep=G.stressAz; G.stressAz=undefined; out.old = gsStressText(e||FE.list[0]||{a:0,b:1}) === ''; G.stressAz=keep;
    // sauvegarde
    G.stressKnown=true; saveGame(); const az0=G.stressAz; G.stressAz=undefined; G.stressKnown=false; loadGame(); out.save = Math.abs(G.stressAz-az0)<1e-9 && G.stressKnown===true;
    return out; });
  const sh=k=>r.cls[k][1]/Math.max(1,r.cls[k][0]), tot=r.cls.reduce((t,c)=>t+c[0],0), op=r.cls.reduce((t,c)=>t+c[1],0)/tot;
  ok(r.n>=300 && r.dd && r.rng && r.azBad===0,'contrainte : un azimut par carte (de 0 à 180°), déterministe, azimut de faille cohérent avec sa normale ('+r.n+' failles)');
  ok(Math.abs(sh(0)-0.55)<=0.13 && Math.abs(sh(1)-0.15)<=0.09 && sh(2)<=0.06 && Math.abs(op-0.17)<=0.06,'ouverture selon l\'orientation : '+Math.round(sh(0)*100)+' % à 20° ou moins ('+r.cls[0][0]+' failles), '+Math.round(sh(1)*100)+' % de 20 à 40° ('+r.cls[1][0]+'), '+Math.round(sh(2)*100)+' % au-delà ('+r.cls[2][0]+') ; '+Math.round(op*100)+' % en tout');
  ok(r.start.az && r.start.known===false && r.start.legend==='none','au départ : la contrainte existe mais le joueur ne la connaît pas, la légende ne l\'affiche pas');
  ok(r.after.known && r.after.legend!=='none' && r.after.rot===`rotate(${r.after.az})` && /azimut/.test(r.after.txt) && r.stressLogs===1,'le premier log la révèle : flèche tournée de '+r.after.az+'° dans la légende, une seule ligne au journal');
  ok(r.az3.withF>=5 && r.az3.nullOk && r.az3.med<=12 && r.az3.p95<=25,'sismique 3D : azimut de la faille voisine (écart médian '+(r.az3.med&&r.az3.med.toFixed(1))+'°, 95 % sous '+(r.az3.p95&&r.az3.p95.toFixed(0))+'°, '+r.az3.withF+' blocs), nul loin de toute faille ('+r.az3.noF+' blocs)');
  ok(r.hasEdge && r.txt.o==='3D' && /Azimut estimé \d+° \(±10°, sismique 3D\), contrainte horizontale maximale \d+° : écart de \d+°/.test(r.txt.known) && /inconnue/.test(r.txt.unknown) && /Estimated azimuth/.test(r.txt.en) && r.card,'carte Faille : azimut de la faille, contrainte, écart et lecture ; « inconnue » avant le premier log ; version anglaise ; fiche du bloc');
  ok(r.old,'une ancienne partie sans contrainte n\'affiche rien et ne plante pas');
  ok(r.save,'sauvegarde : l\'azimut de la contrainte et ce que le joueur en sait sont conservés');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
