# Usage : python3 tools/i18n/ubatch.py N [TAILLE] → écrit /tmp/i18n/ub_N.json (clés) et affiche « indice|clé »
import sys, os, json, glob
sys.path.insert(0, os.path.dirname(__file__)); import units, scan
def load_known():
    known={}
    for f in sorted(glob.glob(os.path.join(os.path.dirname(__file__),'dict','lot_*.json'))):
        for k,v in json.load(open(f,encoding='utf-8')).items(): known[units.decode(k)]=v
    for f in sorted(glob.glob(os.path.join(os.path.dirname(__file__),'dict','u_*.json'))):
        known.update(json.load(open(f,encoding='utf-8')))
    return known
def skip_keys():
    p=os.path.join(os.path.dirname(__file__),'skip.json')
    return set(units.decode(x) for x in json.load(open(p,encoding='utf-8'))) if os.path.exists(p) else set()
if __name__=='__main__':
    n=int(sys.argv[1]); size=int(sys.argv[2]) if len(sys.argv)>2 else 90
    src=open(scan.INDEX,encoding='utf-8').read(); known=load_known(); sk=skip_keys()
    U=units.collect(src, frozenset(known)); keys=[]; seen=set()
    for u in U:
        if u['key'] in seen or u['key'] in known or u['key'] in sk: continue
        seen.add(u['key']); keys.append(u['key'])
    lot=keys[:size]; os.makedirs('/tmp/i18n',exist_ok=True); json.dump(lot,open(f'/tmp/i18n/ub_{n}.json','w'),ensure_ascii=False)
    for i,k in enumerate(lot): print(f"{i}|{k}")
    sys.stderr.write(f"{len(lot)} dans ce lot ; reste {len(keys)-len(lot)}\n")
