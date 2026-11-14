import sys, os, json
n=sys.argv[1]; fr=json.load(open(f'/tmp/i18n/hb_{n}.json',encoding='utf-8')); en=json.load(open(f'/tmp/i18n/he_{n}.json',encoding='utf-8'))
out={}; miss=[]
for i,k in enumerate(fr):
    e=en.get(str(i))
    if e is None: miss.append(i); continue
    out[k]=e
json.dump(out,open(os.path.join(os.path.dirname(__file__),'dict',f'h_{n}.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=0)
print(f"{len(out)} traductions écrites ; manquantes : {miss}")
