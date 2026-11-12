// Console de forage : physique des incidents (kick, perte, coincement, nettoyage, outil), solvabilité du scénario,
// niveaux de joueurs automatiques, et interface sur téléphone simulé.
const { chromium, devices } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); }; const errs=[];
  const pg=await br.newPage(); pg.on('pageerror',e=>errs.push(e.message)); await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  // 1. physique, sur 40 scénarios
  const ph = await pg.evaluate(()=>{ const R=window.__rig, o={n:0,kickYes:0,kickNo:0,lossYes:0,lossNo:0,stuckYes:0,stuckNo:0,packYes:0,packNo:0,bitYes:0,bitNo:0,killShort:0,killOk:0,killFrac:0,casing:0,gs:0,window:0,sc:0};
    for(let i=0;i<40;i++){ const sc=R.rigScenario(); if(!sc) continue; o.sc++;
      // fenêtre de pression valide et contrainte verticale raisonnable (densité moyenne 1,9 à 2,6 sg)
      let wok=true; for(let z=100; z<=sc.TD; z+=50){ if(sc.gf(z) <= sc.gp(z)+0.1) wok=false; const g=sc.gs(z); if(g<1.8||g>2.7) o.gs++; } if(wok) o.window++;
      // kick : sous la pression des pores, le bac gagne ; au-dessus, non
      let S=R.rigNew(sc); S.z=sc.zop+120; S.mw=sc.gp(S.z+50)+0.03; S.shoe=sc.zop-150; S.strings=1; S.drilling=true; for(let k=0;k<4;k++) R.tick(S); if(S.gain===0) o.kickNo++;
      S=R.rigNew(sc); S.z=sc.zop+120; S.mw=sc.gp(S.z)-0.02; S.shoe=sc.zop-150; S.strings=1; S.drilling=true; R.tick(S); if(S.gain>0) o.kickYes++;
      // perte : au-dessus de la fracturation du trou ouvert
      S=R.rigNew(sc); S.z=500; S.mw=R.gfOpen(S)-0.01; S.drilling=true; for(let k=0;k<4;k++) R.tick(S); if(S.loss===0) o.lossNo++;
      S=R.rigNew(sc); S.z=500; S.mw=R.gfOpen(S)+0.02; S.drilling=true; for(let k=0;k<3;k++) R.tick(S); if(S.loss>1 && S.block==='loss') o.lossYes++;
      // tubage : le trou ouvert repart d'un sabot plus résistant
      S=R.rigNew(sc); S.z=sc.zop-100; const before=R.gfOpen(S); R.act(S,'casing'); if(S.strings===1 && S.shoe===S.z && R.gfOpen(S)>=sc.gf(S.z)-1e-9 && R.gfOpen(S)>=before-1e-9) o.casing++;
      // coincement différentiel : outil immobile en face d'une couche perméable avec une boue très lourde, pas avec une boue modérée
      const perm = sc.layers.find(l=>l.perm && l.top>200); if(perm){ const zz=Math.round((perm.top+perm.th/2)/10)*10;
        S=R.rigNew(sc); S.z=zz; S.mw=sc.gp(zz)+0.15; S.drilling=false; for(let k=0;k<4;k++) R.tick(S); if(S.stuck && S.stuck.type==='diff') o.stuckYes++;
        S=R.rigNew(sc); S.z=zz; S.mw=sc.gp(zz)+0.06; S.drilling=false; for(let k=0;k<8;k++) R.tick(S); if(!S.stuck) o.stuckNo++; } else { o.stuckYes++; o.stuckNo++; }
      // nettoyage : débit trop faible ; puis circulation à fort débit
      S=R.rigNew(sc); S.z=300; S.mw=1.08; S.q=800; S.drilling=true; for(let k=0;k<30 && S.block!=='packoff' && S.status==='run';k++) R.tick(S); if(S.block==='packoff'){ o.packYes++; S.q=3200; S.drilling=false; R.act(S,'circ'); R.act(S,'circ'); if(!S.block) o.packNo++; }
      // outil usé : incident puis manœuvre
      S=R.rigNew(sc); S.z=300; S.wear=0.95; S.mw=1.08; S.q=3000; S.drilling=true; R.tick(S); if(S.block==='bit'){ R.act(S,'trip'); if(S.wear===0 && !S.block) o.bitYes++; }
      // tuer le puits : trop léger échoue, bonne marge réussit, trop lourd fracture
      const mk=()=>{ const T=R.rigNew(sc); T.z=sc.zop+150; T.shoe=sc.zop-150; T.strings=1; T.mw=sc.gp(T.z)-0.03; T.drilling=true; R.tick(T); R.act(T,'shut'); return T; };
      S=mk(); R.act(S,'kill', sc.gp(S.z)); if(S.shut) o.killShort++; S=mk(); R.act(S,'kill', sc.gp(S.z)+0.05); if(!S.shut && S.gain===0 && S.status==='run') o.killOk++;
      S=mk(); R.act(S,'kill', R.gfOpen(S)+0.05); if(S.ev.some(e=>/trop forte/.test(e.msg))) o.killFrac++;
      o.n++; }
    return o; });
  const N=ph.sc; ok(N>=38, 'scénarios générés : '+N+'/40 (tubage et fenêtre de densité jouables)');
  ok(ph.window===N && ph.gs===0, 'fenêtre de pression ouverte à toute profondeur, contrainte verticale cohérente (1,8 à 2,7 sg)');
  ok(ph.kickYes===N && ph.kickNo===N, 'kick : la boue sous la pression des pores fait gagner le bac, au-dessus de la pression non ('+ph.kickYes+'/'+N+' et '+ph.kickNo+'/'+N+')');
  ok(ph.lossYes===N && ph.lossNo===N, 'perte : au-dessus de la fracturation du trou ouvert seulement ('+ph.lossYes+'/'+N+' et '+ph.lossNo+'/'+N+')');
  ok(ph.casing===N, 'tubage : le trou ouvert repart du sabot, jamais plus faible');
  ok(ph.stuckYes===N && ph.stuckNo===N, 'coincement : boue lourde + outil immobile en face d\'une couche perméable, pas avec une surpression modérée');
  ok(ph.packYes>=N*0.95 && ph.packNo===ph.packYes, 'nettoyage : débit trop faible provoque le blocage de déblais, la circulation à fort débit le règle ('+ph.packYes+' cas)');
  ok(ph.bitYes>=N*0.95, 'outil usé : incident puis manœuvre qui remet l\'usure à zéro');
  ok(ph.killShort===N && ph.killOk===N && ph.killFrac===N, 'tuer le puits : trop léger échoue, pression des pores + 0,05 réussit, trop lourd fracture');
  // 2. joueurs automatiques
  const bots = await pg.evaluate(()=>{ const R=window.__rig, o={good:{td:0,h:0,n:0,blow:0},mid:{td:0,h:0,n:0},naive:{td:0,n:0}}; const score=(S)=>R.scoreOf(S).score;
    for(let i=0;i<60;i++){ const sc=R.rigScenario(); if(!sc) continue; for(const k of ['good','mid','naive']){ const S=R.rigNew(sc); R.playBot(S,k); const x=o[k]; x.n++; if(S.status==='td'){ x.td++; if(k!=='naive') x.h+=score(S); } if(S.fail==='blowout') x.blow=(x.blow||0)+1; } }
    return o; });
  ok(bots.good.td>=bots.good.n*0.95, 'bon foreur (anticipe, tube, réagit) : '+bots.good.td+'/'+bots.good.n+' puits menés au bout, score moyen '+Math.round(bots.good.h/Math.max(1,bots.good.td)));
  ok(bots.mid.td>=bots.mid.n*0.6 && bots.mid.h/Math.max(1,bots.mid.td) < bots.good.h/Math.max(1,bots.good.td)-10, 'foreur qui réagit sans anticiper : '+bots.mid.td+'/'+bots.mid.n+' puits, score moyen '+Math.round(bots.mid.h/Math.max(1,bots.mid.td))+' (nettement sous le bon foreur)');
  ok(bots.naive.td<=bots.naive.n*0.1, 'foreur qui ignore les incidents : '+bots.naive.td+'/'+bots.naive.n+' puits menés au bout');
  // 3. isolation : la partie en cours n'est pas touchée
  await pg.click('#startBtn'); await pg.click('#labOptGo'); await pg.waitForTimeout(500);
  const emp = ()=>JSON.stringify({ n: blocks.length, q: blocks.map(b=>[b.id,b.trueQuality,b.topOfReservoir]), s: STRAT.length, lv: buildStratigraphy.lastVariant });
  const a = await pg.evaluate(`(${emp.toString()})()`); await pg.evaluate(()=>{ for(let i=0;i<10;i++) window.__rig.rigScenario(); }); const b = await pg.evaluate(`(${emp.toString()})()`);
  ok(a===b && a.length>500, 'la partie en cours est intacte après génération de scénarios ('+a.length+' octets comparés)');
  await pg.close();
  // 4. interface sur téléphone
  const ctx=await br.newContext({...devices['iPhone 13'],viewport:{width:390,height:760}}); const ph2=await ctx.newPage(); ph2.on('pageerror',e=>errs.push(e.message));
  await ph2.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
  await ph2.goto('file://'+path.resolve(__dirname,'../../index.html')); await ph2.waitForTimeout(300);
  await ph2.locator('#quickTrain button[data-open="rig"]').tap(); await ph2.waitForTimeout(500);
  const ui = await ph2.evaluate(()=>{ const bt=[...document.querySelectorAll('#rgBody button, #rigModal .cg-close')].filter(e=>e.offsetParent).map(e=>Math.round(e.getBoundingClientRect().height)); const sl=[...document.querySelectorAll('#rgBody input[type=range]')].map(e=>Math.round(e.getBoundingClientRect().height)); return { open: document.getElementById('rigModal').classList.contains('open'), chart: !!document.querySelector('#rgChart svg'), minBtn: Math.min(...bt), minSlider: Math.min(...sl), debord: document.documentElement.scrollWidth>innerWidth }; });
  ok(ui.open && ui.chart && ui.minBtn>=39 && ui.minSlider>=28 && !ui.debord, 'téléphone : console ouverte, graphique présent, boutons >= 40 px ('+ui.minBtn+'), curseurs >= 28 px ('+ui.minSlider+'), pas de débordement');
  // parcours complet au doigt : boue trop légère devant la rampe, kick, fermeture, tuer
  await ph2.evaluate(()=>{ const S=window.__rig.S; S.z=S.sc.zop-40; S.mw=1.0; });
  await ph2.locator('#rgSpeed').tap(); await ph2.locator('#rgGo').tap(); await ph2.waitForFunction(()=>window.__rig.S.block==='kick', null, {timeout:15000});
  const k1 = await ph2.evaluate(()=>({ banner: /Kick probable/.test(document.getElementById('rgBody').innerText), shut: !!document.getElementById('rgShut'), drilling: window.__rig.S.drilling }));
  ok(k1.banner && k1.shut && !k1.drilling, 'téléphone : le kick met le forage en pause et propose « Fermer le puits »');
  await ph2.locator('#rgShut').tap(); await ph2.waitForTimeout(150);
  const k2 = await ph2.evaluate(()=>{ const t=document.getElementById('rgBody').innerText; const S=window.__rig.S; const sidpp=Math.max(0,(S.sc.gp(S.z)-S.mw)*window.__rig.G0*S.z); return { txt:/Puits fermé/.test(t) && /SIDPP/.test(t), val: t.includes(String(Math.round(sidpp*100)/100).replace('.',',')), kill: !!document.getElementById('rgKill') }; });
  ok(k2.txt && k2.val && k2.kill, 'téléphone : le puits fermé affiche la pression de fermeture (SIDPP) calculée par la simulation');
  await ph2.evaluate(()=>{ const S=window.__rig.S; const el=document.getElementById('rgMw'); el.value = (S.sc.gp(S.z)+0.05).toFixed(2); el.dispatchEvent(new Event('input')); });
  await ph2.locator('#rgKill').tap(); await ph2.waitForTimeout(200);
  const k3 = await ph2.evaluate(()=>({ ok: /Puits tué/.test(document.getElementById('rgLog').innerText), shut: window.__rig.S.shut, gain: window.__rig.S.gain }));
  ok(k3.ok && !k3.shut && k3.gain===0, 'téléphone : la densité réglée au curseur tue le puits et le forage peut reprendre');
  // écrans de fin : réussite avec score et meilleur score mémorisé, puis échec avec la cause
  await ph2.evaluate(()=>{ const R=window.__rig; R.openRig(); R.playBot(R.S,'good'); R.render(); });
  const e1 = await ph2.evaluate(()=>({ t: document.getElementById('rgBody').innerText, again: !!document.getElementById('rgAgain'), best: localStorage.getItem('geoexplorer_quiz_best_rig') }));
  ok(/Puits foré/.test(e1.t) && /Score : \d+\/100/.test(e1.t) && e1.again && JSON.parse(e1.best).s>0, 'téléphone : écran de réussite avec score détaillé, bouton « Nouveau puits » et meilleur score mémorisé');
  await ph2.evaluate(()=>{ const R=window.__rig; R.openRig(); const S=R.S; S.z=S.sc.zop-40; S.mw=1.0; S.drilling=true; for(let i=0;i<40&&S.status==='run';i++){ R.tick(S); } R.render(); });
  const e2 = await ph2.evaluate(()=>({ t: document.getElementById('rgBody').innerText, st: window.__rig.S.status, fail: window.__rig.S.fail }));
  ok(e2.st==='fail' && /Puits perdu/.test(e2.t) && /Éruption|éruption/.test(e2.t) && e2.fail==='blowout', 'téléphone : un kick ignoré tourne en éruption, écran de fin explicatif ('+e2.fail+')');
  await ph2.screenshot({path:'/tmp/rig_tel.png'});
  console.log('erreurs JS', errs); console.log(ko?'ECHECS: '+ko:'TOUT OK'); await br.close(); process.exit(ko||errs.length?1:0); })();
