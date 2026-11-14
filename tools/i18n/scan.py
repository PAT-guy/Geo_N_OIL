# Analyse lexicale de index.html : repère les chaînes JS (apostrophes, guillemets, gabarits) et les textes français de la page.
import re, json
INDEX = '/home/user/Geo_N_OIL/index.html'
STOP = set("le la les des une un du de et ou pour est dans avec sur sous par au aux ce cette ces vous votre vos il elle ne pas se sa ses leur leurs qui que quoi où d l n s c j qu à été être ont mais donc car comme tout tous toute toutes chaque entre vers puis après avant sans fait faire peut peuvent oui bloc puits forage carte étude niveau budget prix coupe roche".split())
ACC = re.compile(r"[àâçéèêëîïôûùüÀÂÇÉÈÊËÎÏÔÛÙÜœ]")
def frenchish(t):
    t2 = re.sub(r"<[^>]+>", " ", t); t2 = re.sub(r"\$\{[^}]*\}", " ", t2)
    words = re.findall(r"[A-Za-zÀ-ÿ'’]{2,}", t2)
    if len(words) < 2 and not ACC.search(t2): return False
    if ACC.search(t2) and len(t2.strip()) >= 4: return True
    n = sum(1 for w in words if w.lower() in STOP)
    return n >= 2 and len(words) >= 3
def scripts(src):
    return [(m.start(1), m.end(1)) for m in re.finditer(r"<script(?![^>]*src)[^>]*>(.*?)</script>", src, re.S)]
def expr_end(code, j):
    """j : position juste après '${'. Renvoie la position juste après l'accolade fermante (gère chaînes, gabarits imbriqués et expressions régulières)."""
    n=len(code); depth=1; prev='('
    while j<n and depth>0:
        e=code[j]
        if e in '\'"':
            k=j+1
            while k<n and code[k]!=e: k += 2 if code[k]=='\\' else 1
            j=k+1; prev=e; continue
        if e=='`':
            k=j+1; dd=0
            while k<n:
                f=code[k]
                if f=='\\': k+=2; continue
                if f=='`' and dd==0: break
                if f=='$' and code.startswith('${',k): k=expr_end(code,k+2); continue
                k+=1
            j=k+1; prev='`'; continue
        if e=='/' and prev in '(,=:[!&|?{};':
            k=j+1; incls=False
            while k<n:
                c=code[k]
                if c=='\\': k+=2; continue
                if c=='[': incls=True
                elif c==']': incls=False
                elif c=='/' and not incls: break
                elif c=='\n': k=j; break
                k+=1
            if k>j: j=k+1; prev=')'; continue
        if e=='{': depth+=1
        elif e=='}': depth-=1
        if not e.isspace(): prev=e
        j+=1
    return j
def scan(code, base):
    out=[]; i=0; n=len(code); prev=''
    def skip_regex(i):
        j=i+1; incls=False
        while j<n:
            c=code[j]
            if c=='\\': j+=2; continue
            if c=='[': incls=True
            elif c==']': incls=False
            elif c=='/' and not incls: return j+1
            elif c=='\n': return i+1
            j+=1
        return i+1
    while i<n:
        c=code[i]
        if code.startswith('//',i):
            j=code.find('\n',i); i = n if j<0 else j; continue
        if code.startswith('/*',i):
            j=code.find('*/',i+2); i = n if j<0 else j+2; continue
        if c in '\'"':
            j=i+1
            while j<n and code[j]!=c: j += 2 if code[j]=='\\' else 1
            out.append(dict(s=base+i, e=base+j+1, q=c, t=code[i+1:j])); prev=c; i=j+1; continue
        if c=='`':
            j=i+1; depth=0
            while j<n:
                d=code[j]
                if d=='\\': j+=2; continue
                if d=='`' and depth==0: break
                if d=='$' and code.startswith('${',j):
                    j=expr_end(code,j+2); continue
                j+=1
            out.append(dict(s=base+i, e=base+j+1, q='`', t=code[i+1:j])); prev='`'; i=j+1; continue
        if c=='/' and (prev in '(,=:[!&|?{};\n' or prev==''):
            k=skip_regex(i)
            if k>i+1: i=k; prev=')'; continue
        if not c.isspace(): prev=c
        i+=1
    return out
def french_tokens(src):
    toks=[]
    for a,b in scripts(src): toks += scan(src[a:b], a)
    res=[]
    for k,it in enumerate(toks):
        if not frenchish(it['t']): continue
        pre = src[max(0,it['s']-6):it['s']]
        if re.search(r"\bTR?\(\s*$", pre): continue                       # premier argument d'un T( / TR(
        if k>0 and re.search(r"\bTR?\($", src[max(0,toks[k-1]['s']-3):toks[k-1]['s']]) : continue   # second argument (anglais)
        res.append(it)
    return res
def is_key(src, it):
    """Chaîne probablement utilisée comme clé ou comme valeur comparée : à ne pas traduire sans revue."""
    before = src[max(0,it['s']-14):it['s']]; after = src[it['e']:it['e']+4]
    if re.search(r"(===?|!==?|\bcase)\s*$", before): return True
    if re.search(r"\.(includes|indexOf|startsWith|endsWith)\(\s*$", before): return True
    if re.match(r"\s*(===?|!==?)", after): return True
    if re.match(r"\s*\]", after) and re.search(r"\[\s*$", before): return True
    if re.match(r"\s*:", after) and re.search(r"[{,]\s*$", before): return True   # clé d'objet
    return False
