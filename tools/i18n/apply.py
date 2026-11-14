# Applique le dictionnaire à index.html : chaque chaîne française traduite devient TR(français, anglais) ; les textes d'un gros gabarit HTML
# deviennent ${TR(`français`,`anglais`)} sur place. Le français reste strictement inchangé (TR renvoie le premier argument en français).
# Usage : python3 tools/i18n/apply.py [--dry]
import sys, os, re, json
sys.path.insert(0, os.path.dirname(__file__)); import units, scan, ubatch
dry = '--dry' in sys.argv
src = open(scan.INDEX, encoding='utf-8').read(); known = ubatch.load_known(); sk = ubatch.skip_keys()
def skeleton(txt):
    """Liste des expressions ${...} d'un texte, avec le contenu des chaînes et des gabarits imbriqués effacé (pour vérifier que l'anglais garde le même code)."""
    out=[]; i=0; n=len(txt)
    while i<n:
        if txt.startswith('${',i):
            j=scan.expr_end(txt,i+2)
            expr = txt[i+2:j-1]
            expr = re.sub(r"'(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\"", "S", expr)
            expr = re.sub(r"`(?:[^`\\]|\\.)*`", "S", expr, flags=re.S)
            out.append(re.sub(r"\s+","",expr)); i=j
        else: i+=1
    return sorted(out)
def enc_tpl_whole(en): return en.replace('\\','\\\\').replace('`','\\`')
U = units.collect(src, frozenset(known)); edits=[]; bad=[]; applied=0
for u in U:
    k = u['key']
    if k in sk or k not in known: continue
    en = known[k]
    if en == k: continue
    if u['kind']=='whole' and u['q']=='`':
        if skeleton(src[u['s']+1:u['e']-1]) != skeleton(en): bad.append((k[:70], skeleton(k), skeleton(en))); continue
        repl = f"TR({src[u['s']:u['e']]},`{enc_tpl_whole(en)}`)"
    elif u['kind'] in ('whole','str'):
        q = u['q']; repl = f"TR({src[u['s']:u['e']]},{q}{units.encode(en,q)}{q})"
    else:  # run (texte dans un gabarit)
        repl = "${TR(`" + u['raw'] + "`,`" + units.encode(en,'`') + "`)}"
    edits.append((u['s'], u['e'], repl)); applied += 1
edits.sort(reverse=True); out = src
for s,e,r in edits: out = out[:s] + r + out[e:]
print(f"{applied} remplacements ; {len(bad)} refusés (expressions différentes)")
for b in bad[:12]: print('  refusé :', b[0], '|', b[1], '|', b[2])
if not dry: open(scan.INDEX,'w',encoding='utf-8').write(out)
