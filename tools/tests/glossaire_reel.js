// Glossaire : page « Réel ou simplifié » (loi, approximation, réglage de jeu), entrées à jour (log, sondage, informateur, abandon), lisible sur téléphone.
const { chromium, devices } = require('playwright'); const path = require('path');
(async()=>{ const br=await chromium.launch(); let ko=0; const ok=(c,m)=>{ if(!c){ko++; console.log('ECHEC',m);} else console.log('ok',m); };
  const ctx=await br.newContext({...devices['iPhone 13']}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.addInitScript(()=>{try{localStorage.setItem('geoexplorer_tutorialSeen','1')}catch(e){}});
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(500);
  const T = await pg.evaluate(async ()=>{ document.getElementById('geoSeed').value='12'; menuConfig.daily=null; labOptLaunch(); await new Promise(r=>setTimeout(r,800));
    document.getElementById('pauseMenu').classList.add('open'); showPauseView('glossary'); const v=document.getElementById('pauseGlossaryView'), el=document.getElementById('glossaryContent'), sec=document.getElementById('realitySection');
    const tags={loi:0,approx:0,jeu:0}; sec.querySelectorAll('.gl-tag').forEach(t=>{ if(t.closest('.glossary-term')){ for(const k of Object.keys(tags)) if(t.classList.contains('gl-'+k)) tags[k]++; } });
    const terms=[...sec.querySelectorAll('.glossary-term')];
    const txt=el.textContent; return { shown:v.style.display!=='none', n:terms.length, tags, allTagged: terms.every(t=>t.querySelector('.gl-tag')), intro:/Réel ou simplifié \?/.test(txt), upd:/Un forage les fournit toujours/.test(txt) && !/Impossible sans forer réellement/.test(txt), sond:/Sondage stratigraphique/.test(txt) && /Informateur/.test(txt) && /Abandon d'un puits/.test(txt), over: v.scrollWidth>v.clientWidth+1, honest:/Probabilités de succès/.test(txt) && /Maturité de la roche-mère/.test(txt) && /Migration/.test(txt), emdash:/—/.test(sec.textContent) }; });
  ok(T.shown && T.intro, 'le glossaire s\'ouvre depuis la pause avec la section « Réel ou simplifié ? »');
  ok(T.n>=15 && T.allTagged, T.n+' mécanismes, tous marqués');
  ok(T.tags.loi>=5 && T.tags.approx>=5 && T.tags.jeu>=4, 'les trois catégories sont présentes '+JSON.stringify(T.tags));
  ok(T.honest, 'les points fragiles sont nommés : probabilités, maturité, migration');
  ok(T.upd && T.sond, 'le glossaire est à jour : log, sondage stratigraphique, informateur, abandon');
  ok(!T.over && !T.emdash, 'lisible sur téléphone, sans débordement');
  ok(errs.length===0, 'aucune erreur JS '+errs.join('|'));
  await br.close(); console.log(ko? 'ECHECS: '+ko : 'TOUT OK'); process.exit(ko?1:0); })();
