// Origine de la charge : chaque bloc sait quelle cuisine l'alimente (coordonnées, distance), affiché sur les blocs forés ; aucun effet sur les cartes (hachage identique à main).
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const mainFile = process.env.MAIN_HTML || '/tmp/index_main.html';
  const run = async (f, withChecks) => { const pg=await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}}); await pg.goto('file://'+f); await pg.waitForTimeout(400);
    const r = await pg.evaluate((wc)=>{ const o={hash:[],bad:0,n:0,self:0,none:0,txt:0}; for(const bt of ['random','paris','north_sea','gulf_coast']) for(let s=1;s<=12;s++){ generateGeology(12,bt,true,s*977+13);
      o.hash.push(blocks.map(b=>[b.id,+b.srcFactor.toFixed(5),+b.trueProbability.toFixed(5)].join(',')).join(';').split('').reduce((a,c)=>(a*31+c.charCodeAt(0))|0,0));
      if(wc) blocks.forEach(b=>{ o.n++; const c=b.chargeFrom; if(!c){ o.none++; if(b.srcFactor>0.0201) o.bad++; b.dryHole=true; const k0=blockKnowledge(b).find(z=>z.n==='Roche-mère'); if(k0 && /Aucune cuisine/.test(k0.t)) o.txt++; b.dryHole=false; return; } if(c.self) o.self++; if(!(Number.isFinite(c.dist) && c.dist>=0 && Number.isFinite(c.x) && Number.isFinite(c.y))) o.bad++; if(!c.self && Math.abs(Math.hypot(b.x-c.x,b.y-c.y)-c.dist)>0.06) o.bad++; b.dryHole=true; const k=blockKnowledge(b).find(z=>z.n==='Roche-mère'); if(k && /cuisine|Aucune/.test(k.t)) o.txt++; b.dryHole=false; }); } return o; }, withChecks);
    await pg.close(); return {r, errs}; };
  const A = await run(mainFile,false), B = await run(path.resolve(__dirname,'../../index.html'), true);
  ok(JSON.stringify(A.r.hash)===JSON.stringify(B.r.hash), 'cartes identiques à main (charge et probabilités de 48 cartes)');
  ok(B.r.bad===0, 'chaque charge supérieure au plancher a une cuisine d\'origine valide, distance cohérente ('+B.r.n+' blocs, '+B.r.none+' sans cuisine)');
  ok(B.r.txt===B.r.n, 'le texte d\'explication est affiché pour tous les blocs forés ('+B.r.txt+'/'+B.r.n+')');
  ok(B.r.self>0, 'des blocs sont leur propre cuisine ('+B.r.self+')');
  ok(B.errs.length===0, 'aucune erreur JS '+B.errs.join('|'));
  await br.close(); console.log(ko? 'ECHECS: '+ko : 'TOUT OK'); process.exit(ko?1:0); })();
