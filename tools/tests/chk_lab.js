const LABO = 'file://' + require('path').resolve(__dirname, '../../labo-sismique.html');
const INDEX = 'file://' + require('path').resolve(__dirname, '../../index.html');
const { chromium } = require('playwright');
(async()=>{ const br=await chromium.launch(); const pg=await br.newPage(); const e=[]; pg.on('pageerror',x=>e.push(x.message)); pg.on('console',m=>{if(m.type()==='error'&&!/height/.test(m.text()))e.push(m.text())});
await pg.goto(LABO); await pg.waitForTimeout(400); console.log(await pg.title(), e); await br.close(); })();
