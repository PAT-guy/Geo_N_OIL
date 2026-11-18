// Provinces productives (V5.5) : chaque carte a une province vraiment productive (meilleur bloc et groupe de blocs voisins à plus de 40 %), un maillon faible reste mortel, les anciennes sauvegardes gardent l'échelle de Rose de leur création.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1280,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const R = await pg.evaluate(async()=>{ const o={}; ROSE_V=2; const mx=[], top=[], n50=[], prov=[], maps=[]; let provOk=0;
    for(const bt of ['random','rift','passive','foreland','paris','north_sea','aquitaine','gulf_coast','permian']) for(const gs of [8,12,20]) for(let k=0;k<8;k++){ generateGeology(gs,bt,true,k*977+bt.length*31+gs); const ps=blocks.map(b=>b.trueProbability), s=[...ps].sort((a,b)=>b-a); mx.push(s[0]); top.push(s.slice(0,Math.max(1,Math.round(ps.length*0.1))).reduce((a,b)=>a+b,0)/Math.max(1,Math.round(ps.length*0.1))); n50.push(ps.filter(p=>p>=0.5).length);
      // province : trois blocs voisins (8 voisinages) à 40 % ou plus
      const strong=new Set(blocks.filter(b=>b.trueProbability>=0.4).map(b=>b.x+','+b.y)); let found=false; for(const key of strong){ const [x,y]=key.split(',').map(Number); let c=0; for(let dx=-1;dx<=1;dx++) for(let dy=-1;dy<=1;dy++) if((dx||dy) && strong.has((x+dx)+','+(y+dy))) c++; if(c>=2){ found=true; break; } } if(found) provOk++; maps.push(1); }
    const q=(a,f)=>[...a].sort((x,y)=>x-y)[Math.floor(a.length*f)]; o.n=maps.length; o.max5=q(mx,0.05); o.maxMin=Math.min(...mx); o.topMed=q(top,0.5); o.n50=q(n50,0.05); o.prov=provOk/maps.length;
    // la carte de l'exemple : graine 17174, bassin aléatoire 12×12
    generateGeology(12,'random',true,17174); o.seed=Math.max(...blocks.map(b=>b.trueProbability));
    // maillon faible et bon système
    o.weak=roseP(0.9,0.9,0.9,0.1); o.noTrap=roseP(0.05,0.9,0.9,0.9); o.strong=roseP(0.9,0.9,0.9,0.9); ROSE_V=1; o.weakV1=roseP(0.9,0.9,0.9,0.1); o.midV1=roseP(0.65,0.63,0.63,0.53); ROSE_V=2;
    // sauvegardes : version écrite à la création, lue au chargement, absente pour une ancienne sauvegarde
    document.getElementById('geoSeed').value='55'; menuConfig.mode='junior'; menuConfig.basinType='paris'; menuConfig.gridSize=12; menuConfig.offshore=false; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); setSpeed(0);
    o.roseV = G.roseV; saveGame(); const raw = JSON.parse(localStorage.getItem(SAVE_KEY)); o.saved = raw.G.roseV; delete raw.G.roseV; delete raw.G.advOn; localStorage.setItem(SAVE_KEY, JSON.stringify(raw)); loadGame(); o.oldV = ROSE_V; o.oldAdv = G.advOn;
    // un puits de cette ancienne sauvegarde garde l'échelle 1 : pas de recalcul, la probabilité stockée sert
    o.stored = blocks.every(b=>typeof b.trueProbability==='number');
    return o; });
  ok(R.n>=200 && R.maxMin>=0.5 && R.max5>=0.6, 'chaque carte a un bloc à 50 % ou plus (minimum '+Math.round(R.maxMin*100)+' %, 5e centile '+Math.round(R.max5*100)+' % sur '+R.n+' cartes de tous les bassins et tailles)');
  ok(R.topMed>=0.4, 'le meilleur décile des blocs vaut '+Math.round(R.topMed*100)+' % en médiane (V4.89 à V5.4 : 29 %)');
  ok(R.n50>=2 , 'au moins '+R.n50+' blocs à 50 % ou plus sur 95 % des cartes');
  ok(R.prov>=0.9, 'une vraie province (trois blocs voisins à 40 % ou plus) sur '+Math.round(R.prov*100)+' % des cartes');
  ok(R.seed>=0.6, 'la carte de la graine 17174 (bassin aléatoire 12×12) a un bloc à '+Math.round(R.seed*100)+' % (avant : 40 %)');
  ok(R.weak<0.15 && R.noTrap<0.1 && R.strong>0.7, 'un maillon faible reste mortel : bon système '+Math.round(R.strong*100)+' %, charge à 0,1 '+Math.round(R.weak*100)+' %, piège absent '+Math.round(R.noTrap*100)+' %');
  ok(R.midV1>0.3 && R.midV1<0.45 && R.weakV1>0.2, 'échelle 1 conservée pour les anciennes sauvegardes ('+Math.round(R.midV1*100)+' % pour un bon bloc moyen)');
  ok(R.roseV===3 && R.saved===3, 'une nouvelle partie écrit l\'échelle 3 dans sa sauvegarde');
  ok(R.oldV===1 && R.oldAdv===false && R.stored, 'une sauvegarde sans version est rechargée à l\'échelle 1 et sans production avancée, même si la partie en cours était récente');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
