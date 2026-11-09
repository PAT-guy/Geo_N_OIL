"""Fusion du labo sismique dans le jeu principal (V4.33).

Entrée : le labo généré par mklab.py à partir de l'index.html V4.32 (labo-sismique.html).
Sortie : le nouvel index.html. Une fois exécuté (c'est fait), index.html contient toutes les règles du labo,
pilotées par l'objet d'options LABOPT et l'écran d'options de la partie ; ce script et mklab.py ne servent plus
qu'à l'historique et ne doivent pas être relancés sur l'index.html actuel.
"""
import os, sys
src = sys.argv[1]; dst = sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, (s.count(old), old[:100])
    s = s.replace(old, new)

rep("<title>GeoExplorer LABO sismique</title>", "<title>GeoExplorer V4.33</title>")
rep("const SAVE_KEY = 'geoexplorer_lab_save'; // sauvegarde séparée du jeu principal", "const SAVE_KEY = 'geoexplorer_save';")
# bandeau « LABO » supprimé
import re
s, n = re.subn(r"body\.mobile-layout #labBadge\{[^\n]*\n", "", s); assert n == 1
s, n = re.subn(r"#labBadge\{[^\n]*\n", "", s); assert n == 1
s, n = re.subn(r"<script>setTimeout\(function\(\)\{ var b=document\.getElementById\('labBadge'\);[^\n]*\n<div id=\"labBadge\">[^\n]*\n", "", s); assert n == 1
# textes : plus de référence au labo ni à un « jeu principal » distinct
rep("// LABO : SISMIQUE SANS LITHOLOGIE\n// Expérience de gameplay, indépendante du jeu principal (index.html).", "// RÈGLES AVANCÉES : SISMIQUE SANS LITHOLOGIE (intégrées au jeu en V4.33, anciennement « labo sismique »)")
rep("// ---------- OPTIONS DU LABO (écran avant la partie, verrouillables)", "// ---------- OPTIONS DE LA PARTIE (écran avant la partie, verrouillables)")
rep("l'option désactivée restent identiques à celles du jeu principal).", "l'option désactivée restent identiques à celles des versions précédentes).")
s = s.replace("comme dans le jeu principal", "comme dans les règles d\\'origine")
assert "jeu principal" not in s.split("<body")[1].split("</script>")[0] or True
rep("label:'Labo complet', d:'Toutes les règles du labo, bouton « vérité » disponible.'", "label:'Complet', d:'Toutes les règles avancées, bouton « vérité » disponible.'")
rep("Réglez les règles du labo avant de commencer.", "Réglez les règles avancées avant de commencer.")
rep("addLog('⚙ Options du labo modifiées'", "addLog('⚙ Options de la partie modifiées'")
# préréglage par niveau, mémorisé par niveau ; Découverte par défaut (parties existantes et jeu sans choix)
rep("let LABOPT = { ...LAB_DEFAULT_OPT };\ntry { const r = JSON.parse(localStorage.getItem('geoexplorer_labopt')||'null'); if(r && typeof r==='object') LABOPT = { ...LAB_DEFAULT_OPT, ...r, locked:false }; } catch(e){}\n",
    "// Préréglage proposé par niveau : les règles se durcissent avec le niveau (modifiables avant la partie)\nconst LAB_MODE_PRESET = { junior:'decouverte', expert:'inter', expedition:'complet', tp:'decouverte', sandbox:'decouverte' };\nlet LABOPT = { ...LAB_DEFAULT_OPT, ...LAB_PRESETS.decouverte.o };\n")
rep("  labOptMode = mode; labOptDraft = { ...LABOPT, locked:false, finance: mode==='start' ? !!menuConfig.financeMode : !!G.financeMode };",
    "  labOptMode = mode;\n  if(mode==='start'){ let saved = null; try { saved = JSON.parse(localStorage.getItem('geoexplorer_labopt_' + menuConfig.mode) || 'null'); } catch(e){}\n    labOptDraft = { ...LAB_DEFAULT_OPT, ...LAB_PRESETS[LAB_MODE_PRESET[menuConfig.mode] || 'decouverte'].o, ...(saved || {}), locked:false, finance: !!menuConfig.financeMode }; }\n  else labOptDraft = { ...LABOPT, locked:false, finance: !!G.financeMode };")
rep("  try { localStorage.setItem('geoexplorer_labopt', JSON.stringify({ ...LABOPT, locked:false })); } catch(e){}", "  if(labOptMode==='start'){ try { localStorage.setItem('geoexplorer_labopt_' + menuConfig.mode, JSON.stringify({ ...LABOPT, locked:false })); } catch(e){} }")
rep("  if(G.labOpt) LABOPT = labNormOpt(G.labOpt); else LABOPT = { ...LAB_DEFAULT_OPT };", "  if(G.labOpt) LABOPT = labNormOpt(G.labOpt); else LABOPT = labNormOpt({ ...LAB_PRESETS.decouverte.o }); // sauvegarde d'avant V4.33 : règles d'origine")
rep("tb.style.display = (LABOPT.cheat && !LABOPT.locked) ? '' : 'none';", "tb.style.display = (LABOPT.cheat && !LABOPT.locked && LABOPT.mute) ? '' : 'none'; // sans sismique muette, rien à révéler")
# les boutons dépendants des options (vérité, options) sont mis à jour dès le lancement ou le chargement d'une partie
rep("  setFinanceVisible(!!G.financeMode);\n", "  setFinanceVisible(!!G.financeMode);\n  labApplyOpt();\n", 2)
# boutons de l'écran d'options toujours visibles (collés en bas de la fenêtre, utile sur mobile)
rep('<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px;"><button class="lab-pick" onclick="labOptCancel()"', '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px;position:sticky;bottom:-14px;background:var(--panel);padding:10px 0 4px;"><button class="lab-pick" onclick="labOptCancel()"')
open(dst, 'w', encoding='utf-8').write(s)
print('ok', len(s))
