// Lecture des fluides au log (V4.99) : typage huile / gaz / eau, contact, colonne d'hydrocarbures et percée d'eau attendue, lus sur les courbes réelles (Archie, croisement densité-neutron),
// comparés au vrai gisement ; carte du puits ; absence en Découverte.
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1280,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const R = await pg.evaluate(async()=>{ const o={}; document.getElementById('geoSeed').value='2468'; menuConfig.mode='junior'; menuConfig.basinType='aquitaine'; menuConfig.gridSize=12; menuConfig.offshore=false; LABOPT.advfluids=true; labOptLaunch(); await new Promise(r=>setTimeout(r,1000)); setSpeed(0); G.budget=1e9; checkEndConditions=function(){};
    const st={n:0,fluidOk:0,gas:0,gasOk:0,dec:0,decOk:0,amb:0,colOk:0,tbOk:0,eauN:0,eauOk:0,errs:[]};
    for(const bt of ['aquitaine','rift','north_sea','gulf_coast']){ generateGeology(12,bt,false,31); G.seedNum=1; const land=blocks.filter(b=>!b.inSalt&&!b.isOffshore&&b.horizons.some(h=>h.role==='reservoir'&&(h.thicknessLocal??h.thickness)>=30)).slice(0,45);
      land.forEach((b,i)=>{ if(i%5===4){ b.dryHole=true; b.dryHoleInfo={techFail:false}; const r=logFluidReading(b); st.eauN++; if(r && (r.fluid==='eau'||r.fluid==='incertain')) st.eauOk++; return; }
        b.well={status:'producing',production:1000,wp:waterParams(b,false),monthsActive:0}; const r=logFluidReading(b); if(!r){ st.errs.push('null'); return; } st.n++;
        const trueFluid=b.isGas?'gaz':'huile'; if(r.fluid==='ambigu'||r.fluid==='incertain') st.amb++; else { st.dec++; if(r.fluid===trueFluid) st.decOk++; } if(r.fluid===trueFluid||r.fluid==='ambigu'||r.fluid==='incertain') st.fluidOk++; if(b.isGas&&r.fluid!=='ambigu'&&r.fluid!=='incertain'){ st.gas++; if(r.fluid==='gaz') st.gasOk++; }
        const rh=b.horizons.find(h=>h.role==='reservoir'), th=rh.thicknessLocal??rh.thickness, trueCol=hcFracOf(b)*th; if(Math.abs(r.column-trueCol)<=Math.max(8,0.08*th)) st.colOk++;
        const tbw=b.well.wp.tb; if(Math.abs(r.tb-tbw)/tbw<=0.3) st.tbOk++; }); }
    o.st=st;
    // carte du puits
    generateGeology(12,'aquitaine',false,31); G.seedNum=1; const b=blocks.find(x=>!x.inSalt&&!x.isOffshore&&!x.isGas&&x.horizons.some(h=>h.role==='reservoir'&&(h.thicknessLocal??h.thickness)>=30)); b.well={status:'producing',production:1000,wp:waterParams(b,false),fp:{kind:'oil',api:30,sulfur:0.7,gor:600},monthsActive:3,blockId:b.id,comps:[{q0:1000,t0:0}],cost:1e6,offshore:false,isGas:false}; G.wells=[b.well]; selectedBlock=b.id; renderStudiesPanel(b); const sp=document.getElementById('studiesContent').textContent;
    o.card=/Lecture des fluides au log/.test(sp)&&/Saturation en eau \(Archie\)/.test(sp)&&/Colonne d'hydrocarbures/.test(sp)&&/Percée d'eau attendue/.test(sp)&&/Percée réelle du puits/.test(sp);
    const d=blocks.find(x=>!x.inSalt&&!x.isOffshore&&x!==b); d.dryHole=true; d.dryHoleInfo={techFail:false}; selectedBlock=d.id; renderStudiesPanel(d); o.dryCard=/aquifère|eau salée/.test(document.getElementById('studiesContent').textContent);
    return o; });
  const S=R.st;
  ok(S.n>100 && S.dec>=40 && S.decOk/S.dec>=0.95, 'typage décisif juste : '+S.decOk+'/'+S.dec+' puits (et '+S.amb+' laissés ambigus faute d’aquifère lu pour comparer)');
  ok(S.fluidOk/S.n>=0.95, 'aucune erreur de typage : '+S.fluidOk+'/'+S.n+' lus justes ou ambigus');
  ok(S.gas===0 || S.gasOk/S.gas>=0.9, 'gaz décisif reconnu au croisement : '+S.gasOk+'/'+S.gas);
  ok(S.colOk/S.n>=0.85, 'colonne d\'hydrocarbures lue à 8 % de l\'épaisseur près : '+S.colOk+'/'+S.n);
  ok(S.tbOk/S.n>=0.85, 'percée d\'eau attendue à 30 % de la vraie percée du puits : '+S.tbOk+'/'+S.n);
  ok(S.eauN>=20 && S.eauOk===S.eauN, 'puits sec aquifère lu comme eau salée : '+S.eauOk+'/'+S.eauN);
  ok(R.card && R.dryCard, 'carte « Lecture des fluides au log » avec Archie, colonne, percée attendue et comparaison à la percée réelle ; eau salée pour un sec');
  const D = await pg.evaluate(async()=>{ menuConfig.mode='decouverte'; document.getElementById('geoSeed').value='808'; labOptLaunch(); await new Promise(r=>setTimeout(r,900)); setSpeed(0); const b=blocks.find(x=>!x.inSalt&&!x.isOffshore); b.well={status:'producing',production:1000,monthsActive:0}; return logFluidCardHtml(b)===''; });
  ok(D, 'Découverte : aucune carte de lecture de fluides');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
