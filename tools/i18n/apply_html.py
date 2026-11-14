# Fabrique le dictionnaire HTML_EN (dict/h_*.json + shorts.json + EN_AUTO) et le filet d'exécution (observateur DOM) du mode anglais ; réécrit le bloc balisé de index.html.
import sys, os, re, json, glob
sys.path.insert(0, os.path.dirname(__file__)); import scan
HERE = os.path.dirname(__file__)
d = {}
for f in sorted(glob.glob(os.path.join(HERE,'dict','h_*.json'))): d.update(json.load(open(f,encoding='utf-8')))
d.update(json.load(open(os.path.join(HERE,'shorts.json'),encoding='utf-8')))
extra = os.path.join(HERE,'dict','x_extra.json')
if os.path.exists(extra): d.update(json.load(open(extra,encoding='utf-8')))
d = {k:v for k,v in d.items() if k!=v}
body = json.dumps(d, ensure_ascii=False, separators=(',',':')).replace('</','<\\/')
block = '''<script>
/*HTML_EN_BEGIN*/
// Mode anglais : dictionnaire des textes fixes de la page (nœuds de texte exacts et attributs title, aria-label, placeholder, alt), appliqué à la volée par un observateur du DOM. Sans effet en français.
(function(){
  if(document.documentElement.lang !== 'en') return;
  const HTML_EN = %s;
  const norm = s => s.replace(/\\s+/g,' ').trim();
  const tr = n => { const v = n.nodeValue; if(!v) return; const t = v.trim(); if(!t) return; const e = HTML_EN[norm(t)]; if(e !== undefined && e !== t) n.nodeValue = v.replace(t, () => e); };
  const ATTR = ['title','aria-label','placeholder','alt'];
  const attrs = el => { for(const a of ATTR){ const v = el.getAttribute && el.getAttribute(a); if(v){ const e = HTML_EN[norm(v)]; if(e !== undefined && e !== v) el.setAttribute(a, e); } } };
  const walk = root => { if(root.nodeType === 3) return tr(root); if(root.nodeType !== 1 || /^(SCRIPT|STYLE)$/.test(root.tagName)) return; attrs(root); for(let c = root.firstChild; c; c = c.nextSibling) walk(c); };
  window.__htmlEn = { dict: HTML_EN, walk };
  const start = () => { walk(document.body); new MutationObserver(ms => { for(const m of ms){ if(m.type === 'childList') m.addedNodes.forEach(walk); else if(m.type === 'characterData') tr(m.target); else if(m.type === 'attributes') attrs(m.target); } })
    .observe(document.documentElement, { subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:ATTR }); };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
/*HTML_EN_END*/
</script>
''' % body
src = open(scan.INDEX, encoding='utf-8').read()
if '/*HTML_EN_BEGIN*/' in src:
    src = re.sub(r"<script>\n/\*HTML_EN_BEGIN\*/.*?/\*HTML_EN_END\*/\n</script>\n", lambda m: block, src, flags=re.S)
else:
    src = src.replace('</body>', block + '</body>', 1)
open(scan.INDEX,'w',encoding='utf-8').write(src)
print(len(d), 'entrées HTML_EN')
