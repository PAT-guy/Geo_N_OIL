# Texte français du HTML statique (nœuds de texte et attributs title / aria-label / placeholder / alt) hors balises .i18n déjà traduites.
# Usage : python3 tools/i18n/hbatch.py N [taille]  -> /tmp/i18n/hb_N.json (liste de clés normalisées) ; python3 tools/i18n/hmerge.py N fusionne he_N.json (dict index->anglais)
import sys, os, re, json, glob
from html.parser import HTMLParser
sys.path.insert(0, os.path.dirname(__file__)); import scan, units
HERE = os.path.dirname(__file__)
def norm(t): return re.sub(r"\s+"," ",t).strip()
def extract(src):
    units.build_vocab(src); D = units.D
    body = re.sub(r"<script\b[^>]*>.*?</script>|<style\b[^>]*>.*?</style>", lambda m: m.group(0)[:m.group(0).index('>')+1]+'</'+m.group(0)[1:7].strip('>')+'>', src, flags=re.S|re.I)
    out = []; stack = []
    class P(HTMLParser):
        def handle_starttag(s, tag, attrs):
            a = dict(attrs); cls = (a.get('class') or '').split()
            if tag not in ('br','img','input','meta','link','hr','path','circle','rect','use','line','polyline','stop','source'): stack.append((tag, 'i18n' in cls))
            for k in ('title','aria-label','placeholder','alt'):
                v = a.get(k)
                if v and not any(x for _,x in stack[:-1] if x): out.append(norm(v))
        def handle_endtag(s, tag):
            for i in range(len(stack)-1,-1,-1):
                if stack[i][0]==tag: del stack[i:]; break
        def handle_data(s, d):
            if any(x for _,x in stack): return
            if stack and stack[-1][0] in ('script','style'): return
            t = norm(d)
            if t: out.append(t)
    P(convert_charrefs=True).feed(body)
    seen = []; ss = set()
    for t in out:
        if t in ss: continue
        ws = re.findall(r"[A-Za-zÀ-ÿ]{3,}", t)
        if not ws: continue
        if scan.ACC.search(t) or any(w.lower() in D for w in ws): ss.add(t); seen.append(t)
    return seen
def known():
    k = {}
    for f in glob.glob(os.path.join(HERE,'dict','h_*.json')): k.update(json.load(open(f,encoding='utf-8')))
    return k
if __name__ == '__main__':
    n = sys.argv[1]; size = int(sys.argv[2]) if len(sys.argv)>2 else 150
    src = open(scan.INDEX, encoding='utf-8').read(); kn = known()
    todo = [t for t in extract(src) if t not in kn]
    batch = todo[:size]
    json.dump(batch, open(f'/tmp/i18n/hb_{n}.json','w',encoding='utf-8'), ensure_ascii=False)
    for i,t in enumerate(batch): print(f"{i}|{t}")
    print(f"{len(batch)} dans ce lot ; reste {len(todo)-len(batch)}")
