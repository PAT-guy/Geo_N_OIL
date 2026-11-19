// Faille drain ou piège (V5.34) : une faille étanche forme un piège côté abaissé, une faille qui fuit (petit rejet sans argile, ou réactivée et ouverte) vide la couverture voisine et laisse passer la charge.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1300,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const r = await pg.evaluate(async()=>{ const out={ faults:0, small:0, open:0, piege:0, drain:0, pP:0, pD:0, pN:0, nN:0, badSide:0, badTrap:0, badDrain:0, dd:true, hasFields:true, badS:0 }; const BT=['paris','permian','rift','north_sea','aquitaine','passive','gulf_coast','foreland','hydrogen','helium'];
    for(const bt of BT) for(let s=0;s<6;s++){ const SD=8100+s*17+BT.indexOf(bt)*1009; generateGeology(12,bt,false,SD); const F=LAST_FAULTS.map(f=>({...f})); const snap=blocks.map(b=>b.faultRole+'|'+(b.faultInfo&&b.faultInfo.T)).join(','); generateGeology(12,bt,false,SD); if(snap!==blocks.map(b=>b.faultRole+'|'+(b.faultInfo&&b.faultInfo.T)).join(',')) out.dd=false;
      F.forEach(f=>{ out.faults++; if(Math.abs(f.throw)<80) out.small++; if(f.open) out.open++; if(typeof f.gouge!=='number'||typeof f.open!=='boolean') out.hasFields=false; });
      const near=b=>F.filter(f=>Math.abs((b.x-f.px)*f.nx+(b.y-f.py)*f.ny)<=0.75);
      for(const b of blocks){ if(b.inSalt) continue;
        if(b.faultRole==='piege'){ out.piege++; out.pP+=b.trueProbability; const lowered=near(b).some(f=>(f.throw>0 ? ((b.x-f.px)*f.nx+(b.y-f.py)*f.ny)>0 : ((b.x-f.px)*f.nx+(b.y-f.py)*f.ny)<0)); if(!lowered) out.badSide++; if(b.faultInfo.s<0.6) out.badS++; if(b.trapFactor < FAULT_TRAP_A + FAULT_TRAP_B*b.faultInfo.s*Math.min(1,b.faultInfo.T/80) - 0.01){ out.badTrap++; if(!out.ex) out.ex=[b.trapFactor, b.faultInfo, bt, SD]; } }
        else if(b.faultRole==='drain'){ out.drain++; out.pD+=b.trueProbability; if(b.faultInfo.s>=0.3) out.badDrain++; }
        else { out.pN+=b.trueProbability; out.nN++; } } }
    // fiche d'un bloc foré : rôle de la faille voisine
    let tb=null, db=null; for(let sd=52; sd<90 && !(tb&&db); sd++){ document.getElementById('geoSeed').value=String(sd); menuConfig.mode='expert'; menuConfig.basinType='rift'; menuConfig.seed=String(sd); labOptLaunch(); await new Promise(r=>setTimeout(r,500)); setSpeed(0); G.budget=90e6; tb=blocks.find(b=>b.faultRole==='piege'&&!b.isOffshore); db=blocks.find(b=>b.faultRole==='drain'&&!b.isOffshore); } out.hasT=!!tb; out.hasD=!!db;
    tb.dryHole=true; db.dryHole=true; selectedBlock=tb.id; renderGeoPanel(tb); const t1=document.getElementById('geoContent').textContent; selectedBlock=db.id; renderGeoPanel(db); const t2=document.getElementById('geoContent').textContent;
    const plain=blocks.find(b=>!b.faultRole&&!b.isOffshore); plain.dryHole=true; selectedBlock=plain.id; renderGeoPanel(plain); const t3=document.getElementById('geoContent').textContent;
    out.pT = /Piège de faille/.test(t1) && /côté abaissé/.test(t1); out.pDr = /Drain/.test(t2) && /fait fuir la couverture/.test(t2); out.pNone = !/Rôle de la faille voisine/.test(t3);
    tb.dryHole=false; db.dryHole=false; plain.dryHole=false;
    // l'outil du joueur contre la vérité : verdict estimé et force d'étanchéité réelle
    const n=Math.sqrt(blocks.length)|0, idOf=(x,y)=>blocks.find(b=>b.x===x&&b.y===y).id; performStudy(null,'gravity'); for(const [a,b2] of [[idOf(1,2),idOf(n-2,2)],[idOf(1,5),idOf(n-2,5)],[idOf(1,n-3),idOf(n-2,n-3)]]){ G.sectionA=a; G.sectionB=b2; performStudy(null,'seismic2d'); }
    out.edges=gsFaultEdges().list.length; out.saved=false; saveGame(); const k=tb.id; tb.faultRole=null; loadGame(); out.saved = blocks[k].faultRole==='piege' && blocks[k].faultInfo && blocks[k].faultInfo.T>0;
    return out; });
  const sh=r.small/r.faults, op=r.open/r.faults, pT=r.pP/Math.max(1,r.piege), pD=r.pD/Math.max(1,r.drain), pN=r.pN/Math.max(1,r.nN);
  ok(r.hasFields && sh>=0.25 && sh<=0.5 && op>=0.07 && op<=0.25,'failles : coefficient de gouge et ouverture tirés pour chacune, '+Math.round(sh*100)+' % de petits rejets (visé 35 %), '+Math.round(op*100)+' % de failles ouvertes (visé 15 %) sur '+r.faults+' failles');
  ok(r.dd,'déterministe : une même graine donne les mêmes pièges et drains de faille');
  ok(r.piege>20 && r.badSide===0 && r.badTrap===0 && r.badS===0,'pièges de faille ('+JSON.stringify([r.badSide,r.badTrap,r.badS,r.ex])+') : '+r.piege+' blocs, tous du côté abaissé d\'une faille étanche (force 0,6 et plus), piège au moins égal à la formule');
  ok(r.drain>5 && r.badDrain===0,'drains : '+r.drain+' blocs, tous contre une faille qui fuit (force sous 0,3)');
  ok(pT>=1.25*pN && pD<=0.75*pN,'effet sur la probabilité : piège de faille '+pT.toFixed(2)+', hors faille '+pN.toFixed(2)+', drain '+pD.toFixed(2));
  ok(r.hasT && r.hasD && r.pT && r.pDr && r.pNone,'fiche d\'un bloc foré : le rôle de la faille voisine est révélé (piège côté abaissé, drain qui fait fuir la couverture), rien sur un bloc sans faille');
  ok(r.saved,'sauvegarde : le rôle et les caractéristiques de la faille sont conservés');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
