// Mode anglais : parcourt l'interface et liste le texte qui reste en français (nœuds de texte, title, placeholder, aria-label).
// Usage : node tools/tests/anglais_reste.js [--liste]   (verdict : TOUT OK s'il ne reste rien)
const { chromium } = require('playwright'); const path = require('path');
const FR = String.raw`[àâçéèêëîïôûùüœÀÂÇÉÈÊËÎÏÔÛÙÜŒ]|\b(le|la|les|des|du|une|un|et|est|pour|dans|avec|sur|sous|par|aux|ce|cette|vous|votre|vos|qui|que|pas|ne|se|ou|mais|plus|moins|aucun|aucune|tout|tous|bloc|puits|forage|carte|coupe|roche|prix|mois|ans|sans|entre|vers|après|avant|doit|peut|faire|fait|être|ont|leur|nouveau|nouvelle|fermer|retour|suivant|précédent|niveau|étude|études|gisements|essai|rejouer|réponse|bonne|mauvais|suivante|score :)\b|\w :(\s|$)`;
(async()=>{
  const br = await chromium.launch(); const pg = await br.newPage({ viewport:{ width:1280, height:900 } }); const errs = [];
  pg.on('pageerror', e=>errs.push(e.message));
  await pg.addInitScript(()=>{ try{ localStorage.setItem('geoexplorer_lang','en'); localStorage.setItem('geoexplorer_tutorialSeen','1'); localStorage.setItem('geoexplorer_played','1'); }catch(e){} });
  await pg.goto('file://'+path.resolve(__dirname,'../../index.html')); await pg.waitForTimeout(600);
  const collect = ()=> pg.evaluate((FRS)=>{
    const re = new RegExp(FRS, 'i'); const out = new Set();
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while(w.nextNode()){ const n = w.currentNode; const p = n.parentElement; if(!p || /^(SCRIPT|STYLE)$/.test(p.tagName)) continue; const t = n.nodeValue.replace(/\s+/g,' ').trim(); if(t.length>1 && re.test(t)) out.add(t); }
    document.querySelectorAll('[title],[placeholder],[aria-label]').forEach(e=>{ for(const a of ['title','placeholder','aria-label']){ const v = e.getAttribute(a); if(v && re.test(v)) out.add('['+a+'] '+v.replace(/\s+/g,' ').trim()); } });
    return [...out];
  }, FR);
  const found = new Map(); const step = async (label)=>{ for(const t of await collect()){ if(!found.has(t)) found.set(t, label); } };
  await step('accueil');
  // onglets du menu et options
  for(const tab of ['mode','world','studies']){ await pg.evaluate(t=>document.querySelector('.menu-tab[data-tab="'+t+'"]')?.click(), tab); await step('menu '+tab); }
  // partie
  await pg.evaluate(async ()=>{ document.getElementById('geoSeed').value='4242'; menuConfig.daily=null; labOptLaunch(); await new Promise(r=>setTimeout(r,1200)); });
  await step('partie lancée');
  const mini = async (label, fn)=>{ try{ await pg.evaluate(fn); }catch(e){ errs.push(label+' : '+e.message); } await pg.waitForTimeout(150); await step(label); };
  await mini('bloc', ()=>{ const b = blocks.find(x=>!x.inSalt); selectedBlock = b.id; renderStudiesPanel(b); });
  await mini('gravimétrie', ()=>{ G.budget = 40e6; try{ performStudy(null,'gravity'); }catch(e){} });
  await mini('onglets', ()=>{ document.querySelectorAll('[data-screen],[data-tab],.tab-btn').forEach(b=>{ try{ b.click(); }catch(e){} }); });
  await mini('mois', ()=>{ for(let i=0;i<14;i++){ try{ monthTick(); }catch(e){} } });
  await mini('pause', ()=>{ document.getElementById('pauseBtn')?.click(); document.querySelectorAll('[data-pause-view]').forEach(b=>{ try{ b.click(); }catch(e){} }); });
  await mini('tutoriel', ()=>{ document.getElementById('openTutorialBtn')?.click(); for(let i=0;i<14;i++){ const n=document.getElementById('tutoNextBtn'); if(!n) break; n.click(); } });
  await mini('lithologies', ()=>{ document.getElementById('openLithoHomeBtn')?.click(); });
  await mini('mini-jeux', async ()=>{ for(const q of ['cards','lithofacies','maturation','rockeval','seismic','logs','sei','rig','dimension']){ document.querySelectorAll('.mg-card').forEach(c=>{ try{ c.click(); }catch(e){} }); } });
  await mini('finance', ()=>{ G.financeMode = true; try{ document.getElementById('tabFinanceBtn')?.click(); renderFinancePanel && renderFinancePanel(); }catch(e){} });
  await mini('informateur', ()=>{ document.getElementById('informantBtn')?.click(); document.getElementById('infoBtn')?.click(); });
  await mini('alertes', ()=>{ document.getElementById('priceAlertBtn')?.click(); document.getElementById('alertBtn')?.click(); });
  await mini('recap', ()=>{ try{ showEnd('quit'); }catch(e){ try{ showEnd(); }catch(e2){} } });
  const list = [...found.entries()];
  if(process.argv.includes('--liste')) list.forEach(([t,l])=>console.log('['+l+'] '+t));
  console.log(list.length+' texte(s) encore en français');
  console.log('erreurs', JSON.stringify(errs.slice(0,6)));
  await br.close();
  if(list.length===0 && errs.length===0) console.log('TOUT OK'); else { console.log('ECHECS: '+list.length); process.exitCode = 1; }
})();
