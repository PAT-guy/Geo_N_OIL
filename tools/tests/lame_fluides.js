// Lame mince (V5.41) : vue « Fluides en place » (eau, huile, gaz visibles dans les pores) et connexion des pores calée sur la perméabilité mesurée (plus de 0 % pour une roche de 1 mD).
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const pg=await br.newPage({viewport:{width:1100,height:1000}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_played','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const r = await pg.evaluate(()=>{ const out={ conn:[], fl:{} };
    const mk=(phi,perm,hc,gas)=>({ carb:false,dmm:0.35,sort:0.3,cem:{k:'calcite',f:0.08},phi,clay:0.03,hc,gas,api:35,perm,seedKey:'t'+phi+perm,noise:1,iters:0 });
    const cal=(P)=>{ const target=P.perm>=20?0.95:P.perm>=5?0.7:P.perm>=1?0.4:P.perm>=0.1?0.15:P.perm>=0.05?0.05:0; return target; };
    // la vraie fenêtre : on fabrique un bloc minimal
    const fake=(phi,perm,hc,gas)=>({ id:9999, isGas:gas, horizons:[{role:'reservoir',name:'Grès',lith:'Grès'}], estimate:{ core:{ grain:'Moyen', sorting:'Modéré', cement:'Calcite', porosity:phi*100, permeability:perm, vshale:10, hcSaturation:hc?String(hc*100):null, rti:gas?'Gaz':'Huile' } } });
    for(const [phi,perm] of [[0.12,1],[0.15,5],[0.18,20],[0.10,0.3]]){ blocks[9999]=fake(phi,perm,0.6,false); lmOpen(9999); out.conn.push({ perm, conn:LM.L.stats.conn }); }
    const count=(gas)=>{ blocks[9999]=fake(0.22,100,0.6,gas); lmOpen(9999); lmMode('fluid'); const cv=document.getElementById('lmCanvas'), d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data; let blue=0,amber=0,red=0; for(let i=0;i<d.length;i+=4){ const R=d[i],G=d[i+1],B=d[i+2]; if(B>200&&R<120) blue++; else if(R>150&&G>90&&G<150&&B<50) amber++; else if(R>190&&G<100&&B<90) red++; } return { blue, amber, red, txt:document.getElementById('lmText').textContent, hasBtn:/Fluides en place/.test(document.getElementById('lmModes').textContent) }; };
    out.fl.oil=count(false); out.fl.gas=count(true);
    blocks[9999]=fake(0.22,100,0,false); lmOpen(9999); lmMode('fluid'); out.fl.dry=document.getElementById('lmText').textContent;
    document.documentElement.lang='en'; blocks[9999]=fake(0.22,100,0.6,true); lmOpen(9999); lmMode('fluid'); out.en=document.getElementById('lmText').textContent+' '+document.getElementById('lmModes').textContent; document.documentElement.lang='fr';
    return out; });
  const byPerm=Object.fromEntries(r.conn.map(c=>[c.perm,c.conn]));
  ok(byPerm[1]>0 && byPerm[5]>0 && byPerm[20]>0.5,'connexion calée sur la perméabilité : '+JSON.stringify(byPerm));
  ok(byPerm[1] < byPerm[20] && byPerm[5]<1,'moins de pores reliés à 1 mD qu\'à 20 mD, et pas 100 % partout');
  ok(r.fl.oil.hasBtn && r.fl.oil.blue>200 && r.fl.oil.amber>200 && r.fl.oil.red===0,'vue Fluides, huile : eau bleue et huile ambre dans les pores, pas de rouge '+JSON.stringify({b:r.fl.oil.blue,a:r.fl.oil.amber,r:r.fl.oil.red}));
  ok(r.fl.gas.red>200 && r.fl.gas.blue>200 && r.fl.gas.amber===0,'vue Fluides, gaz : eau bleue et gaz rouge dans les pores '+JSON.stringify({b:r.fl.gas.blue,a:r.fl.gas.amber,r:r.fl.gas.red}));
  ok(/huile en ambre/.test(r.fl.oil.txt) && /gaz en rouge/.test(r.fl.gas.txt) && /Aucun hydrocarbure/.test(r.fl.dry),'textes : huile, gaz, échantillon sans hydrocarbure');
  ok(/Fluids in place/.test(r.en) && /gas in red/.test(r.en) && !/[éèàùç]/.test(r.en),'version anglaise');
  ok(errs.length===0,'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko?'ECHECS: '+ko:'TOUT OK'); process.exit(ko?1:0); })();
