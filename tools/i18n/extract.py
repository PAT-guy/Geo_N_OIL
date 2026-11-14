# Liste les chaînes françaises uniques restantes (hors T/TR), dans l'ordre du source, avec drapeaux.
# Usage : python3 tools/i18n/extract.py [--cles] > lot.json   (lot : liste de {fr, n, cle})
import sys, json, re, glob, os
sys.path.insert(0, os.path.dirname(__file__)); import scan
src = open(scan.INDEX, encoding='utf-8').read()
known = {}
for f in glob.glob(os.path.join(os.path.dirname(__file__), 'dict', '*.json')): known.update(json.load(open(f, encoding='utf-8')))
skip = set(json.load(open(os.path.join(os.path.dirname(__file__), 'skip.json'), encoding='utf-8'))) if os.path.exists(os.path.join(os.path.dirname(__file__), 'skip.json')) else set()
seen = {}; order = []
for it in scan.french_tokens(src):
    t = it['t']
    if t in skip: continue
    if t not in seen: seen[t] = dict(fr=t, n=0, cle=False); order.append(t)
    seen[t]['n'] += 1; seen[t]['cle'] = seen[t]['cle'] or scan.is_key(src, it)
todo = [seen[t] for t in order if t not in known]
print(json.dumps(todo, ensure_ascii=False))
sys.stderr.write(f"{len(order)} chaînes uniques, {len(todo)} sans traduction ({sum(1 for x in todo if x['cle'])} clés possibles)\n")
