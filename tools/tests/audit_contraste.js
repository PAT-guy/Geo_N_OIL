// Audit de contraste (WCAG AA : 4,5 pour le texte courant, 3 pour le grand texte) sur les écrans principaux, ordinateur et téléphone simulé.
const { chromium } = require('playwright');
const AUDIT = ()=>{
  const parse=c=>{ const m=c.match(/rgba?\(([^)]+)\)/); if(!m) return null; const p=m[1].split(',').map(x=>parseFloat(x)); return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}; };
  const lum=({r,g,b})=>{ const f=v=>{ v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4); }; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
  const blend=(top,bot)=>({ r:top.r*top.a+bot.r*(1-top.a), g:top.g*top.a+bot.g*(1-top.a), b:top.b*top.a+bot.b*(1-top.a), a:1 });
  const bgOf=el=>{ const stack=[]; let e=el; while(e && e.nodeType===1){ const c=parse(getComputedStyle(e).backgroundColor); if(c && c.a>0) stack.push(c); if(c && c.a>=1) break; e=e.parentElement; } let base={r:255,g:255,b:255,a:1}; for(let i=stack.length-1;i>=0;i--) base=blend(stack[i],base); return base; };
  const out=[]; const seen=new Set();
  document.querySelectorAll('body *').forEach(el=>{
    if(!el.childNodes) return; const txt=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ').trim(); if(!txt || txt.length<2) return;
    const cs=getComputedStyle(el); if(cs.visibility==='hidden'||cs.display==='none'||parseFloat(cs.opacity)===0) return;
    const r=el.getBoundingClientRect(); if(r.width<2||r.height<2) return; if(r.bottom<0||r.top>innerHeight) return;
    // ignorer les éléments masqués par un ancêtre
    let a=el, hid=false; while(a){ const s=getComputedStyle(a); if(s.display==='none'||s.visibility==='hidden'){ hid=true; break;} a=a.parentElement; } if(hid) return;
    const fg=parse(cs.color); if(!fg) return; const bg=bgOf(el); const op=parseFloat(cs.opacity)||1; const f=blend({...fg,a:fg.a*op},bg);
    const L1=lum(f), L2=lum(bg), ratio=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
    const size=parseFloat(cs.fontSize); const need=(size>=18.66||(size>=14&&parseInt(cs.fontWeight)>=700))?3:4.5;
    if(ratio<need){ const key=(el.className||el.tagName)+'|'+txt.slice(0,20); if(seen.has(key)) return; seen.add(key); out.push({ratio:+ratio.toFixed(2), need, size, txt:txt.slice(0,48), el:(el.id?'#'+el.id:(typeof el.className==='string'?'.'+el.className.split(' ')[0]:el.tagName))}); }
  });
  return out.sort((a,b)=>a.ratio-b.ratio).slice(0,8);
};
(async()=>{ const br=await chromium.launch();
for(const [vn,vp,mob] of [['desk',{width:1400,height:900},false],['phone',{width:390,height:844},true]]){
  const ctx=await br.newContext({viewport:vp,hasTouch:mob}); const pg=await ctx.newPage();
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1');localStorage.setItem('geoexplorer_menu','full')}catch(e){}});
  await pg.goto('file://'+require('path').resolve(__dirname,'../../index.html')); await pg.waitForTimeout(400);
  const rows=[];
  rows.push(['accueil', await pg.evaluate(AUDIT)]);
  await pg.click('#startBtn'); await pg.evaluate(()=>labOptPreset('complet')); await pg.waitForTimeout(100);
  rows.push(['options de partie', await pg.evaluate(AUDIT)]);
  await pg.click('#labOptGo'); await pg.waitForTimeout(500);
  await pg.evaluate(()=>{ setSpeed(0); G.budget=30e6; performStudy(null,'gravity'); const land=blocks.filter(b=>!b.isOffshore); const rws={}; land.forEach(b=>(rws[b.y]=rws[b.y]||[]).push(b)); const r=Object.values(rws).sort((a,z)=>z.length-a.length)[0].sort((a,z)=>a.x-z.x); G.sectionA=r[0].id; G.sectionB=r[r.length-1].id; window.__row=r.map(b=>b.id); performStudy(null,'seismic2d'); [3,4,5].forEach(i=>performStudy(window.__row[i],'seismic3d')); labSetPick(3); selectedBlock=window.__row[4]; rerenderAllBlocks(); renderGeoPanel(blocks[selectedBlock]); renderStudiesPanel(blocks[selectedBlock]); });
  rows.push(['jeu : carte', await pg.evaluate(AUDIT)]);
  for(const tab of ['geo','section','studies','gisements','journal','finance']){ await pg.evaluate(t=>{ if(isMobileLayout()) showMobileScreen(t); else switchTab(t); }, tab).catch(()=>{}); await pg.waitForTimeout(150); rows.push(['onglet '+tab, await pg.evaluate(AUDIT)]); }
  await pg.evaluate(()=>priceAlertOpen()); rows.push(['alertes de prix', await pg.evaluate(AUDIT)]); await pg.evaluate(()=>priceAlertClose());
  await pg.evaluate(()=>{ document.getElementById('btnMenu').click(); }); await pg.waitForTimeout(200); rows.push(['menu pause', await pg.evaluate(AUDIT)]);
  console.log('=== '+vn); rows.forEach(([n,l])=>console.log(n.padEnd(20), l.length? JSON.stringify(l.slice(0,4)) : 'OK'));
  await ctx.close(); }
await br.close(); })();
