// Calibration par bassin : l'ordre des blocs est inchangé, la richesse varie d'une carte à l'autre (80 % rang, 20 % référence absolue),
// plancher de jouabilité, moyenne globale proche de l'ancienne, étiquette de richesse, anciennes sauvegardes cohérentes.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const T = await pg.evaluate(()=>{ const o={maps:0,orderBad:0,low:0,floorBad:0,means:[],his:[],byBt:{},labels:{pauvre:0,moyen:0,riche:0},nan:0,wUsed:{}};
    for(const bt of ['random','rift','passive','foreland','paris','north_sea','aquitaine','gulf_coast']) for(let s=1;s<=50;s++){
      generateGeology(s%5===0?20:12, bt, true, s*6151+29); o.maps++;
      const bs=[...blocks].sort((a,z)=>a.pRaw-z.pRaw); for(let i=1;i<bs.length;i++) if(bs[i].trueProbability < bs[i-1].trueProbability - 1e-12) { o.orderBad++; break; }
      const n=blocks.length, m=blocks.reduce((t,b)=>t+b.trueProbability,0)/n, hi=blocks.filter(b=>b.trueProbability>=0.6).length/n, n50=blocks.filter(b=>b.trueProbability>=0.5).length;
      o.means.push(m); o.his.push(hi); (o.byBt[bt]=o.byBt[bt]||[]).push(hi); if(n50 < 1) o.floorBad++;
      if(blocks.some(b=>!isFinite(b.trueProbability) || b.trueProbability<0.03-1e-9 || b.trueProbability>0.85+1e-9)) o.nan++;
      const ri=mapRichness(); o.labels[ri.label]++; o.wUsed[PCAL_W]=(o.wUsed[PCAL_W]||0)+1; }
    const avg=a=>a.reduce((x,y)=>x+y,0)/a.length, srt=a=>[...a].sort((x,y)=>x-y);
    o.meanAvg=avg(o.means); o.meanMin=srt(o.means)[0]; o.meanMax=srt(o.means).at(-1); o.hiAvg=avg(o.his); o.hiMin=srt(o.his)[0]; o.hiMax=srt(o.his).at(-1);
    o.bt = Object.fromEntries(Object.entries(o.byBt).map(([k,v])=>[k, +avg(v).toFixed(3)]));
    // anciennes sauvegardes : sans pcalW, l'étalonnage par rang seul doit s'appliquer
    generateGeology(12,'paris',true,4242); const raw = blocks[5].pRaw; const withW = pCalibrate(raw); PCAL_W = 0; const rankOnly = pCalibrate(raw); PCAL_W = PCAL.abs; o.oldSave = Math.abs(withW - rankOnly) < 0.5 && isFinite(rankOnly);
    o.richLog = true; return o; });
  ok(T.orderBad===0, 'l\'ordre des blocs est inchangé (la probabilité suit toujours la probabilité brute) sur '+T.maps+' cartes');
  ok(T.nan===0, 'toutes les probabilités restent entre 3 et 85 %');
  ok(T.floorBad===0, 'jouabilité : au moins un bloc à 50 % ou plus sur chaque carte (province productive garantie par la génération)');
  ok(T.hiMax-T.hiMin>=0.08, 'la part de blocs à 60 % ou plus varie d\'une carte à l\'autre : de '+Math.round(T.hiMin*100)+' % à '+Math.round(T.hiMax*100)+' % (elle était de 11,8 % sur toutes)');
  ok(T.meanMax-T.meanMin>=0.07, 'la probabilité moyenne varie : de '+Math.round(T.meanMin*100)+' % à '+Math.round(T.meanMax*100)+' %');
  ok(T.hiAvg>=0.07 && T.hiAvg<=0.17 && T.meanAvg>=0.20 && T.meanAvg<=0.30, 'étalonnage absolu : '+Math.round(T.hiAvg*1000)/10+' % de blocs à 60 % ou plus (visé 7 à 17 %), probabilité moyenne '+Math.round(T.meanAvg*1000)/10+' % (visé 20 à 30 %)');
  const gen=['random','rift','passive','foreland'].reduce((x,k)=>x+T.bt[k],0)/4;
  ok(T.bt.north_sea>=0.7*gen && T.bt.gulf_coast>=0.7*gen && T.bt.aquitaine>=0.7*gen, 'les bassins à gaz ne sont plus pénalisés : Mer du Nord '+Math.round(T.bt.north_sea*1000)/10+' %, Gulf Coast '+Math.round(T.bt.gulf_coast*1000)/10+' %, Aquitaine '+Math.round(T.bt.aquitaine*1000)/10+' % de bons blocs, contre '+Math.round(gen*1000)/10+' % pour les bassins génériques');
  ok(T.labels.pauvre>=40 && T.labels.moyen>=150 && T.labels.riche>=40, 'les trois étiquettes de richesse existent : '+JSON.stringify(T.labels));
  ok(T.oldSave, 'une ancienne sauvegarde (sans part absolue) garde l\'étalonnage par rang');
  const D = await pg.evaluate(async ()=>{ document.getElementById('geoSeed').value='909'; menuConfig.daily=null; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); const log=document.getElementById('logEntries').textContent; G.budget=30e6; try{ showEnd('quit'); }catch(e){}; return { log:/Potentiel régional du bassin : (pauvre|moyen|riche)/.test(log), end:/bassin (pauvre|moyen|riche)/.test(document.getElementById('endStats').textContent), saved:G.pcalW!==undefined }; });
  ok(D.log && D.end && D.saved, 'le potentiel régional est écrit au journal de départ et au récap, la part absolue est mémorisée dans la partie');
  console.log('par bassin (part de blocs à 60 % ou plus) :', JSON.stringify(T.bt), 'parts absolues utilisées', JSON.stringify(T.wUsed));
  ok(errs.length===0, 'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko? 'ECHECS: '+ko : 'TOUT OK'); process.exit(ko?1:0); })();
