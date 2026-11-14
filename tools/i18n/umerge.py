import sys, os, json
n=sys.argv[1]; fr=json.load(open(f'/tmp/i18n/ub_{n}.json',encoding='utf-8')); en=json.load(open(f'/tmp/i18n/ue_{n}.json',encoding='utf-8'))
out={}; miss=[]
for i,k in enumerate(fr):
    e=en.get(str(i))
    if e is None: miss.append(i); continue
    if e.startswith('§'): e=e[1:]
    else:
        lead=k[:len(k)-len(k.lstrip())]; trail=k[len(k.rstrip()):]
        e=lead+e.strip()+trail
    out[k]=e
json.dump(out,open(os.path.join(os.path.dirname(__file__),'dict',f'u_{n}.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=0)
print(f"{len(out)} traductions écrites ; manquantes : {miss}")
