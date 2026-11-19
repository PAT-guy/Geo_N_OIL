// Structure et piège (V5.44) : (1) l'interprétation de la sismique 2D nomme correctement un haut (profondeur minimale au centre) et un creux, avec la fermeture sur le profil ; (2) la gravimétrie classe les blocs d'après le résidu de profondeur (pendage régional retiré) : AUC pour un piège utile d'au moins 0,75 dans chaque bassin.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1100,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const r = await pg.evaluate(async()=>{ const o={ txt:{} };
    document.getElementById('geoSeed').value='4242'; menuConfig.daily=null; labOptLaunch(); await new Promise(r=>setTimeout(r,900));
    const resIdx = STRAT.findIndex(l=>l.role==='reservoir');
    const run = (tops)=>{ const bd = tops.map((top,i)=>{ const layers=[]; layers[resIdx]={ top, thickness:50, confidence:0.7 }; return { t:i/(tops.length-1), layers, b:blocks[i] }; }); interpretSection(bd, bd.map(d=>({b:d.b,t:d.t}))); return document.getElementById('sectionInterpret').innerText.replace(/\s+/g,' '); };
    o.txt.anticlinal = run([800,700,650,500,640,790,900]);    // sommet au centre : 500 m, flancs à 800 et 900 m
    o.txt.synclinal  = run([500,600,750,900,760,610,500]);    // creux au centre : 900 m
    o.txt.mono       = run([400,500,600,700,800,900,1000]);
    o.txt.plat       = run([700,710,705,695,700,702,698]);
    o.txt.petit      = run([600,590,585,588,592,598,605]);     // fermeture de 12 m : dans le bruit
    // gravimétrie : AUC par bassin
    const auc=(sc,y)=>{ const P=[],Q=[]; sc.forEach((v,i)=>(y[i]>=0.5?P:Q).push(v)); if(!P.length||!Q.length) return null; let w=0; for(const p of P) for(const q of Q) w += p>q?1:p===q?.5:0; return w/(P.length*Q.length); };
    o.auc={}; for(const bt of ['paris','aquitaine','rift']){ const xs=[], ys=[]; for(let s=0;s<3;s++){ const seed=String(7000+s*13); document.getElementById('geoSeed').value=seed; menuConfig.mode='expert'; menuConfig.basinType=bt; menuConfig.seed=seed; labOptLaunch(); await new Promise(r=>setTimeout(r,60)); setSpeed(0); performStudy(null,'gravity');
        blocks.filter(b=>!b.isOffshore&&!b.inSalt).forEach(b=>{ if(b.estimate?.structPos!==undefined){ xs.push(b.estimate.structPos); ys.push(b.trapFactor); } }); } o.auc[bt]=auc(xs,ys); }
    return o; });
  ok(/Anticlinal/.test(r.txt.anticlinal) && /Fermeture sur ce profil : 300/.test(r.txt.anticlinal) && !/Synclinal/.test(r.txt.anticlinal),'sommet au centre : « Anticlinal », fermeture de 300 m sur le profil (le plus bas des deux flancs moins le sommet), jamais « Synclinal » '+r.txt.anticlinal.slice(60,260));
  ok(/Synclinal/.test(r.txt.synclinal) && !/Anticlinal|Haut structural/.test(r.txt.synclinal),'creux au centre : « Synclinal » '+r.txt.synclinal.slice(60,200));
  ok(/Pendage monoclinal/.test(r.txt.mono) && /tabulaire/i.test(r.txt.plat),'pendage régulier : monoclinal ; relief nul : structure tabulaire');
  ok(!/Anticlinal|Haut structural|Synclinal|Bas structural/.test(r.txt.petit),'une fermeture de 12 m (dans le bruit du pointé) n\'est pas un anticlinal '+r.txt.petit.slice(60,200));
  ok(/ne prouve pas la fermeture latérale/.test(r.txt.anticlinal),'le texte précise qu\'une 2D ne prouve pas la fermeture latérale');
  ok(Object.values(r.auc).every(v=>v!==null && v>=0.75),'gravimétrie : AUC pour un piège utile '+JSON.stringify(r.auc));
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
