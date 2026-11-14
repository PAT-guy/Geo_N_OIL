# Usage : python3 tools/i18n/merge.py N  → lit /tmp/i18n/batch_N.json (français) et /tmp/i18n/en_N.json ({indice: anglais}) et écrit dict/lot_N.json
import sys, json, os
n = sys.argv[1]; fr = json.load(open(f'/tmp/i18n/batch_{n}.json', encoding='utf-8')); en = json.load(open(f'/tmp/i18n/en_{n}.json', encoding='utf-8'))
out = {}; miss = []
for i,t in enumerate(fr):
    e = en.get(str(i))
    if e is None: miss.append(i); continue
    out[t] = e
json.dump(out, open(os.path.join(os.path.dirname(__file__), 'dict', f'lot_{n}.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(f"{len(out)} traductions écrites, manquantes : {miss}")
