// Quiz sismique (8 questions) et tutoriel (11 diapositives) depuis l'accueil
const { chromium } = require('playwright');
(async()=>{ const br=await chromium.launch(); const pg=await br.newPage({viewport:{width:1400,height:900}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
await pg.goto('file://'+require('path').resolve(__dirname,'../../index.html')); await pg.waitForTimeout(300);
// quiz sismique depuis l'accueil
await pg.click('#quickTrain button[data-quiz="seismic"]'); await pg.waitForTimeout(200);
const r = await pg.evaluate(()=>{ const m=document.getElementById('quizModal'); return { ouvert:getComputedStyle(m).display!=='none', titre:document.getElementById('qzTitle').textContent, question:document.getElementById('qzQuestion').textContent.slice(0,90), choix:document.querySelectorAll('#qzChoices button').length }; });
console.log(JSON.stringify(r));
// 8 questions : on répond toujours juste en lisant la bonne réponse dans la banque
const score = await pg.evaluate(async()=>{ const sleep=ms=>new Promise(r=>setTimeout(r,ms)); let n=0; for(let i=0;i<8;i++){ const btns=[...document.querySelectorAll('#qzChoices button')]; if(!btns.length) break; btns[0].click(); await sleep(50); const nb=document.getElementById('qzNextBtn'); if(nb && nb.style.display!=='none'){ nb.click(); } n++; await sleep(50);} return { repondues:n, scoreTexte:document.getElementById('qzScore').textContent }; });
console.log(JSON.stringify(score));
// tutoriel : nombre de diapositives et texte
await pg.evaluate(()=>{ document.getElementById('qzCloseBtn').click(); });
await pg.click('#openTutorialBtn'); await pg.waitForTimeout(200);
const slides = await pg.evaluate(async()=>{ const titres=[]; for(let i=0;i<14;i++){ titres.push(document.getElementById('tutoSlideTitle').textContent); const nb=document.getElementById('tutoNextBtn'); if(/Terminer/.test(nb.textContent)) break; nb.click(); } return titres; });
console.log(JSON.stringify(slides)); console.log(errs); await br.close(); })();
