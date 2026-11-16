// Registre des constantes (V5.4) : les constantes de la production avancée alignées sur un repère publié doivent rester dans la fourchette de ce repère, et le glossaire doit afficher les repères sourcés.
// Les fourchettes viennent de tools/CONSTANTES.md (Wood Mackenzie, BEG, Banque mondiale, EIA, TGS, Hart Energy, AAPG).
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1280,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const R = await pg.evaluate(async()=>{ const o={}; document.getElementById('geoSeed').value='2468'; menuConfig.mode='expert'; menuConfig.basinType='permian'; menuConfig.gridSize=12; menuConfig.offshore=false; LABOPT.advfluids=true; labOptLaunch(); await new Promise(r=>setTimeout(r,1000)); setSpeed(0); G.price=80;
    o.w = { truck:WATER.truck, swd:WATER.swd, recycle:WATER.recycle, perM: WATER.fracBbl/2000, pipe:INFRA.pipeCost, tr:INFRA.truckCost, stageM: 2000/fracStages(2000) };
    // qualité : écart LLS (35 API, 0,4 % S) / Maya (22 API, 3,3 % S)
    const lls=fluidPf({kind:'oil',api:35,sulfur:0.4}), maya=fluidPf({kind:'oil',api:22,sulfur:3.3}); o.diff = 1 - maya/lls; o.perApi = fluidPf({kind:'oil',api:31,sulfur:0.7}) - 1;
    // BSW frac : rapport eau-huile
    const pf=waterParams(blocks.find(b=>!b.inSalt),true); o.wor0 = bswAt(pf,0)/(1-bswAt(pf,0)); o.wor48 = bswAt(pf,48)/(1-bswAt(pf,48));
    // GOR frac : médiane et bornes sur le Permien
    const gors=[], bio={cold:[],warm:[]}; for(let k=0;k<6;k++){ generateGeology(12,'permian',false,k*41+3); G.seedNum=k; G.basinType='permian'; blocks.forEach(b=>{ if(b.inSalt||b.isOffshore||b.isGas) return; const f=fluidParams(b,true); gors.push(f.gor); }); }
    gors.sort((a,b)=>a-b); o.gor=[gors[0], gors[Math.floor(gors.length/2)], gors[gors.length-1]];
    // biodégradation : un réservoir à 40 °C est plus lourd qu'un réservoir à 100 °C, à maturité égale
    generateGeology(12,'aquitaine',false,5); G.seedNum=5; const sample=blocks.filter(b=>!b.inSalt&&!b.isOffshore&&!b.isGas).slice(0,200); const apiAt=(t)=>{ let s=0,n=0; sample.forEach(b=>{ const save=b.tempAtRes, sm=b.maturity; b.tempAtRes=t; b.maturity=0.5; s+=fluidParams(b,false).api; n++; b.tempAtRes=save; b.maturity=sm; }); return s/n; }; o.api=[apiAt(40), apiAt(70), apiAt(100)];
    // glossaire
    renderGlossary && renderGlossary(); const txt=document.getElementById('realitySection')?.textContent || document.body.textContent; o.rep = REALITY_ENTRIES.filter(e=>e.tag==='repere').length; o.tag = REALITY_TAGS.repere; o.legend = /Repères réels sourcés|Sourced real benchmarks/.test(document.documentElement.innerHTML);
    o.ents = REALITY_ENTRIES.filter(e=>e.tag==='repere').map(e=>e.term+' '+e.def).join(' ');
    return o; });
  const w=R.w;
  ok(w.truck>=2 && w.truck<=3, 'eau par camion '+w.truck+' $/bbl dans 2 à 3 (repère 2,50)');
  ok(w.swd>=0.25 && w.swd<=1, 'injection '+w.swd+' $/bbl dans 0,25 à 1 (repère)');
  ok(w.recycle>=0.15 && w.recycle<=0.8, 'recyclage '+w.recycle+' $/bbl dans 0,15 à 0,8 (retraitement 0,15-0,20, plus conveyance)');
  ok(w.perM>=110 && w.perM<=130, 'eau de frac '+w.perM+' bbl par mètre dans 110 à 130 (repère BEG)');
  ok(w.pipe>=0.14 && w.pipe<=0.6 && w.tr>=1.5 && w.tr<=3, 'transport du brut : pipeline '+w.pipe+', camion '+w.tr+' $/bbl (repères 0,14-0,6 et 1,5-3 sur courte distance)');
  ok(w.stageM>=45 && w.stageM<=75, 'un étage tous les '+Math.round(w.stageM)+' m dans 45 à 75 m (150 à 250 ft)');
  ok(R.diff>=0.20 && R.diff<=0.26, 'écart Maya / LLS de '+Math.round(R.diff*100)+' % dans 20 à 26 % (EIA : 23 %)');
  ok(R.perApi>=0.005 && R.perApi<=0.01, 'prix par °API de '+(R.perApi*100).toFixed(1)+' % (Banque mondiale : 0,7 %)');
  ok(R.wor0>=1.3 && R.wor0<=3 && R.wor48>=4 && R.wor48<=7, 'rapport eau-huile de frac '+R.wor0.toFixed(1)+' au départ, '+R.wor48.toFixed(1)+' à 4 ans (repère : ~2 puis ~5, jusqu\'à 7)');
  ok(R.gor[1]>=2100 && R.gor[1]<=4200 && R.gor[0]>=800 && R.gor[2]<=4500, 'GOR de frac du Permien : médiane '+R.gor[1]+', bornes '+R.gor[0]+' à '+R.gor[2]+' (repère 2 100 à 5 000)');
  ok(R.api[0] < R.api[1] && R.api[1] < R.api[2] && R.api[0] < R.api[2]-4, 'biodégradation : huile plus lourde à 40 °C qu\'à 70 °C, qu\'à 100 °C '+JSON.stringify(R.api.map(x=>+x.toFixed(1))));
  ok(R.rep>=10 && /Wood Mackenzie/.test(R.ents) && /Banque mondiale/.test(R.ents) && /EIA/.test(R.ents) && /Bureau of Economic Geology/.test(R.ents), 'le glossaire porte '+R.rep+' repères sourcés avec leurs organismes');
  ok(R.tag && R.legend, 'étiquette « Repère réel sourcé » et légende présentes');
  const md = fs.readFileSync(path.resolve(__dirname,'../CONSTANTES.md'),'utf8'); const rows = (md.match(/^\| (?!---|Constante)/gm)||[]).length;
  ok(rows>=18 && /Limites de ce registre/.test(md) && (md.match(/https:\/\//g)||[]).length>=15, 'tools/CONSTANTES.md : '+rows+' lignes de constantes, limites annoncées, liens vers les sources');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
