# Unités de traduction : « whole » (chaîne ou gabarit court traduit en entier) et « run » (texte entre balises et expressions d'un gros gabarit HTML).
# Toutes les clés sont du texte DÉCODÉ (\' → ', \n → saut de ligne...). Les positions renvoyées sont celles du source.
import re, sys, os, json, glob
sys.path.insert(0, os.path.dirname(__file__)); import scan
UNESC = {"n":"\n","t":"\t","r":"\r","'":"'",'"':'"',"`":"`","\\":"\\","$":"$","/":"/"}
def decode(raw):
    out=[]; i=0
    while i<len(raw):
        c=raw[i]
        if c=='\\' and i+1<len(raw):
            d=raw[i+1]
            if d=='u' and re.match(r"[0-9a-fA-F]{4}", raw[i+2:i+6]): out.append(chr(int(raw[i+2:i+6],16))); i+=6; continue
            if d=='\n': i+=2; continue
            out.append(UNESC.get(d,d)); i+=2; continue
        out.append(c); i+=1
    return ''.join(out)
def encode(txt, q):
    t = txt.replace('\\','\\\\')
    if q=="'": return t.replace("'","\\'").replace('\n',' ')
    if q=='"': return t.replace('"','\\"').replace('\n',' ')
    return t.replace('`','\\`').replace('${','\\${')
D = set()   # vocabulaire français reconnu (mots des chaînes manifestement françaises)
def build_vocab(src):
    for it in [t for a,b in scan.scripts(src) for t in scan.scan(src[a:b], a)]:
        if scan.frenchish(it['t']):
            for w in re.findall(r"[A-Za-zÀ-ÿ]{3,}", re.sub(r"\$\{[^}]*\}|<[^>]+>", " ", decode(it['t']))): D.add(w.lower())
    D.difference_update({'api','toc','gas','mcf','bbl','tmax','rock','eval','trap','log','api','sel','map','pic','open','close','type','best','gap','seed','top','base','drain','rig','input','range','button','block','table','span','style','class','data','value','none','flex','grid','color','width','height'})
def frenchrun(txt):
    t = re.sub(r"\s+"," ",txt).strip()
    if not re.search(r"[A-Za-zÀ-ÿ]{3,}", t): return False
    if scan.ACC.search(t): return True
    ws = re.findall(r"[A-Za-zÀ-ÿ]{3,}", t)
    if any(c in t for c in "#=[]{};<>_") and len(ws)<4: return False
    return any(w.lower() in D for w in ws)
def template_parts(content, base, units, top_whole_ok=True):
    """Parcourt le contenu brut d'un gabarit : renvoie les 'runs' français (hors balises et expressions) et les chaînes françaises dans les expressions."""
    i=0; n=len(content); buf_s=0
    def flush(a,b):
        raw = content[a:b]
        if frenchrun(decode(raw)): units.append(dict(kind='run', s=base+a, e=base+b, raw=raw, key=decode(raw)))
    pos=0
    while i<n:
        c=content[i]
        if c=='\\': i+=2; continue
        if c=='$' and content.startswith('${',i):
            flush(pos,i)
            j=i+2; depth=1
            while j<n and depth>0:
                e=content[j]
                if e in '\'"':
                    k=j+1
                    while k<n and content[k]!=e: k += 2 if content[k]=='\\' else 1
                    j=k+1; continue
                if e=='`':
                    k=j+1; dd=0
                    while k<n:
                        f=content[k]
                        if f=='\\': k+=2; continue
                        if f=='`' and dd==0: break
                        if f=='$' and content.startswith('${',k): dd+=1; k+=2; continue
                        if f=='{' and dd>0: dd+=1
                        if f=='}' and dd>0: dd-=1
                        k+=1
                    j=k+1; continue
                if e=='{': depth+=1
                elif e=='}': depth-=1
                j+=1
            expr = content[i+2:j-1]
            for t in scan.scan(expr, base+i+2):
                if t['q']=='`':
                    template_parts(t['t'], t['s']+1, units)
                elif frenchish_str(t['t']):
                    units.append(dict(kind='str', s=t['s'], e=t['e'], q=t['q'], raw=t['t'], key=decode(t['t'])))
            i=j; pos=j; continue
        if c=='<' and i+1<n and (content[i+1].isalpha() or content[i+1] in '/!'):
            flush(pos,i)
            j=i+1
            while j<n and content[j]!='>':
                if content.startswith('${',j):
                    dd=1; j+=2
                    while j<n and dd>0:
                        if content[j]=='{': dd+=1
                        elif content[j]=='}': dd-=1
                        j+=1
                    continue
                if content[j] in '"\'' :
                    q=content[j]; k=j+1
                    while k<n and content[k]!=q:
                        if content.startswith('${',k):
                            dd=1; k+=2
                            while k<n and dd>0:
                                if content[k]=='{': dd+=1
                                elif content[k]=='}': dd-=1
                                k+=1
                            continue
                        k+=1
                    attr = re.search(r"(title|aria-label|placeholder|alt)\s*=\s*$", content[max(0,j-14):j])
                    if attr and '${' not in content[j+1:k] and frenchrun(decode(content[j+1:k])):
                        units.append(dict(kind='run', s=base+j+1, e=base+k, raw=content[j+1:k], key=decode(content[j+1:k])))
                    j=k+1; continue
                j+=1
            i=j+1; pos=i; continue
        i+=1
    flush(pos,n)
def frenchish_str(t): return scan.frenchish(decode(t)) or bool(re.search(r"[A-Za-zÀ-ÿ]{3,}", decode(t)) and frenchrun(decode(t)) and len(decode(t))>3 and ' ' in decode(t)) 
def collect(src, whole_keys=frozenset()):
    """Liste ordonnée des unités à traduire."""
    build_vocab(src)
    units=[]
    toks=[t for a,b in scan.scripts(src) for t in scan.scan(src[a:b], a)]
    for k,it in enumerate(toks):
        pre = src[max(0,it['s']-6):it['s']]
        if re.search(r"\bTR?\(\s*$", pre): continue
        if k>0 and re.search(r"\bTR?\($", src[max(0,toks[k-1]['s']-3):toks[k-1]['s']]): continue
        key = decode(it['t'])
        if it['q']!='`':
            if scan.frenchish(key) or (frenchish_str(it['t']) and len(key)>3 and ' ' in key):
                units.append(dict(kind='whole', s=it['s'], e=it['e'], q=it['q'], raw=it['t'], key=key))
            continue
        # gabarit
        if not (scan.frenchish(key) or frenchrun(key)): continue
        big = ('<' in key and re.search(r"<\w", key)) or len(key) > 240
        if key in whole_keys or not big:
            units.append(dict(kind='whole', s=it['s'], e=it['e'], q='`', raw=it['t'], key=key))
        else:
            template_parts(it['t'], it['s']+1, units)
    return units
