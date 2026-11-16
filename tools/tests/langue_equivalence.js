// Langue : la même graine donne exactement la même géologie, les mêmes logs de puits et les mêmes probabilités en français et en anglais (les noms changent, pas les nombres).
const { chromium } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const run = async (lang) => { const pg = await br.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
    await pg.addInitScript((l)=>{ try{ localStorage.setItem('geoexplorer_tutorialSeen','1'); localStorage.setItem('geoexplorer_lang', l); }catch(e){} }, lang);
    await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
    const r = await pg.evaluate(()=>{ const out=[]; const H=s=>s.split('').reduce((a,c)=>(a*31+c.charCodeAt(0))|0,0);
      for(const bt of ['random','paris','rift','passive','foreland','aquitaine','north_sea','gulf_coast','permian']) for(const seed of [11,977,4242]){
        generateGeology(14,bt,true,seed*7+3);
        const sig = blocks.map(b=>[b.id,+b.pRaw.toFixed(5),+b.trueProbability.toFixed(5),Math.round(b.topOfReservoir),+b.srcFactor.toFixed(5),+b.maturity.toFixed(4),+b.trueQuality.toFixed(3),b.isGas?1:0,b.inSalt?1:0,b.viaFault?1:0].join(',')).join(';');
        let lg=''; try{ for(let i=0;i<blocks.length;i+=7){ const b=blocks[i]; const w = wlGrid ? wlGrid(b) : null; lg += JSON.stringify(w,(k,v)=>typeof v==='string'?undefined:v) + ','; } }catch(e){ lg='err'; }
        out.push(H(sig)+'|'+H(lg)); }
      return out; });
    await pg.close(); return {r, errs}; };
  const FR = await run('fr'), EN = await run('en');
  ok(FR.r.length===27 && JSON.stringify(FR.r)===JSON.stringify(EN.r), 'géologie, probabilités et logs identiques en français et en anglais (27 cartes)'+(JSON.stringify(FR.r)===JSON.stringify(EN.r)?'':' | '+FR.r.map((x,i)=>x===EN.r[i]?'':i).filter(x=>x!=='').join(',')));
  ok(FR.errs.length===0 && EN.errs.length===0, 'aucune erreur JS '+FR.errs.concat(EN.errs).join('|'));
  await br.close(); console.log(ko? 'ECHECS: '+ko : 'TOUT OK'); process.exit(ko?1:0); })();
