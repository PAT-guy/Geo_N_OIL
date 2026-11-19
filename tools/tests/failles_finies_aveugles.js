// Failles finies et aveugles (V5.36) : le rejet suit une enveloppe elliptique le long de la faille et meurt aux extrémités ; une faille aveugle s'arrête vers le haut (couches supérieures seulement plissées) ; elle ne vide la couverture que si elle la traverse.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1300,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const r = await pg.evaluate(()=>{ const out={ n:0, fin:0, blind:0, tipBad:0, neg:0, cont:0, thin:0, roleBad:0, drainBreach:0, drains:0, dd:true, bl:[], th:[] }; const BT=['paris','permian','rift','north_sea','aquitaine','passive','gulf_coast','foreland'];
    for(const bt of BT) for(let s=0;s<14;s++){ const SD=9900+s*7+BT.indexOf(bt)*1013; generateGeology(12,bt,false,SD); const F=LAST_FAULTS.map(f=>({...f})); const sig=blocks.map(b=>b.faultRole+'|'+Math.round(b.topOfReservoir)).join(','); generateGeology(12,bt,false,SD); if(sig!==blocks.map(b=>b.faultRole+'|'+Math.round(b.topOfReservoir)).join(',')) out.dd=false;
      F.forEach(f=>{ out.n++; if(f.len) out.fin++; if(f.tipFrac){ out.blind++; if(f.tipFrac<0.25||f.tipFrac>0.85) out.tipBad++; } });
      const ri=STRAT.findIndex(l=>l.role==='reservoir'); const side=(f,b)=>(b.x-f.px)*f.nx+(b.y-f.py)*f.ny, at=(x,y)=>blocks.find(b=>b.x===x&&b.y===y);
      for(const b of blocks){ const H=b.horizons; for(let i=0;i<H.length;i++) if(H[i].thicknessLocal<0) out.neg++; const R=H.findIndex(h=>h.role==='reservoir'); for(let i=0;i<Math.max(0,R);i++){ if(Math.abs(H[i].top+H[i].thicknessLocal-H[i+1].top)>1) out.cont++; if(H[i].thicknessLocal>0 && H[i].thicknessLocal<0.12*(H[i].thickness||1)-1e-6) out.thin++; }
        if(b.faultRole){ out.roleBad += F.some(f=>Math.abs(side(f,b))<=0.75 && faultThrowAt(f,b.x,b.y)>=20) ? 0 : 1; if(b.faultRole==='drain'){ out.drains++; if(b.faultInfo.breach===true) out.drainBreach++; } }
        for(const [dx,dy] of [[1,0],[0,1]]){ const c=at(b.x+dx,b.y+dy); if(!c||b.inSalt||c.inSalt) continue; const f=F.find(f=>Math.sign(side(f,b))!==Math.sign(side(f,c)) && faultThrowAt(f,(b.x+c.x)/2,(b.y+c.y)/2)>120); if(!f) continue; const jr=Math.abs(b.horizons[ri].top-c.horizons[ri].top), j0=Math.abs(b.horizons[0].top-c.horizons[0].top); if(jr<100) continue; (f.tipFrac?out.bl:out.th).push(j0/jr); } } }
    // enveloppe : maximale au centre, nulle aux extrémités, elliptique entre les deux
    const f={ px:5, py:5, nx:1, ny:0, throw:200, len:4, R:3 }; const at0=s=>[5, 5+s]; out.env=[faultEnv(f,...at0(0)), faultEnv(f,...at0(2)), faultEnv(f,...at0(4)), faultEnv(f,...at0(6))];
    out.stepCentre = faultDisp(f,5.001,5) - faultDisp(f,4.999,5); out.decay = faultDisp(f,5+2*3,5)/faultDisp(f,5.001,5); out.beyond = faultDisp(f,5.5,5+5);
    const g={ px:5, py:5, nx:1, ny:0, throw:200 }; out.regional = faultEnv(g,5,50)===1 && faultDisp(g,9,50)===200;
    // détails du rejet en hauteur
    const fb={ throw:200, tipFrac:0.5 }; out.taper=[faultTaper(fb,0,1000), faultTaper(fb,250,1000), faultTaper(fb,500,1000), faultTaper(fb,900,1000)]; out.taperThin = faultTaper(fb,100,100); out.taperThrough = faultTaper({throw:200},900,1000);
    return out; });
  const sh=r.fin/r.n, bl=r.blind/r.n, mb=r.bl.reduce((t,v)=>t+v,0)/Math.max(1,r.bl.length), mt=r.th.reduce((t,v)=>t+v,0)/Math.max(1,r.th.length);
  ok(r.n>=150 && sh>=0.58 && sh<=0.82 && bl>=0.28 && bl<=0.52 && r.tipBad===0,'failles : '+Math.round(sh*100)+' % de finies (visé 70 %), '+Math.round(bl*100)+' % d\'aveugles (visé 40 %), sur '+r.n+' failles');
  ok(r.dd,'déterministe : une même graine donne les mêmes profondeurs et rôles de faille');
  ok(r.env[0]===1 && Math.abs(r.env[1]-Math.sqrt(0.75))<1e-9 && r.env[2]===0 && r.env[3]===0,'enveloppe : 1 au centre, '+r.env[1].toFixed(3)+' à mi-chemin (elliptique), 0 à l\'extrémité et au-delà');
  ok(Math.abs(r.stepCentre-200)<0.5 && Math.abs(r.decay-Math.exp(-2))<0.01 && r.beyond===0,'décalage : le rejet vaut '+Math.round(r.stepCentre)+' m au centre, s\'atténue en travers (exp(-2) à deux longueurs) et vaut 0 au-delà de l\'extrémité');
  ok(r.regional,'une faille régionale (sans longueur) garde l\'ancien comportement : même rejet partout');
  ok(r.taper[0]===1 && Math.abs(r.taper[1]-0.5)<1e-9 && r.taper[2]===0 && r.taper[3]===0 && r.taperThrough===1 && r.taperThin>0.55,'faille aveugle : part du rejet 1, 0,5, 0 à 0, 250, 500 m au-dessus du réservoir ; traversante : toujours 1 ; colonne mince : tête repoussée à 1,3 fois le rejet (reste '+r.taperThin.toFixed(2)+' à 100 m)');
  ok(r.neg===0 && r.cont===0 && r.thin<=5,'colonnes saines ('+JSON.stringify([r.neg,r.cont,r.thin])+') : aucune épaisseur négative, couches contiguës au-dessus du réservoir, presque aucune réduite à moins de 12 % de l\'épaisseur nominale (hors rare érosion près de la surface)');
  ok(r.bl.length>=100 && r.th.length>=100 && mb<=0.65*mt,'plissement : le saut en haut de la colonne vaut '+mb.toFixed(2)+' fois celui du réservoir pour une faille aveugle ('+r.bl.length+' cas), '+mt.toFixed(2)+' pour une traversante ('+r.th.length+' cas)');
  ok(r.roleBad===0 && r.drains>5 && r.drainBreach===r.drains,'rôles : tout bloc piège ou drain est contre une faille qui existe à cet endroit (jamais au-delà d\'une extrémité), et tout drain vient d\'une faille qui traverse la couverture ('+r.drains+' drains)');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
