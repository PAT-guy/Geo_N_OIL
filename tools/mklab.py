import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.join(ROOT, 'index.html')
dst = os.path.join(ROOT, 'labo-sismique.html')
s = open(src, encoding='utf-8').read()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, (s.count(old), old[:110])
    s = s.replace(old, new)

import re
s = re.sub(r'<title>GeoExplorer V[0-9.]+</title>', '<title>GeoExplorer LABO sismique</title>', s, count=1)
rep("const SAVE_KEY = 'geoexplorer_save';", "const SAVE_KEY = 'geoexplorer_lab_save'; // sauvegarde séparée du jeu principal")

# ====================== moteur du labo ======================
LAB_JS = r'''
// =====================================================================
// LABO : SISMIQUE SANS LITHOLOGIE
// Expérience de gameplay, indépendante du jeu principal (index.html).
//  1. La sismique 2D montre une image synthétique en couleur (convolution de la réflectivité par une ondelette de
//     Ricker) : géométrie des réflecteurs, failles, plis, épaisseurs. Aucun nom, aucune couleur de roche.
//  2. Un tableau de « traitement » donne, par horizon, profondeur, épaisseur, vitesse d'intervalle (à ±8 %) et
//     contraste d'impédance au toit. C'est ce que l'on sait vraiment faire à partir de la sismique.
//  3. La lithologie ne se débloque qu'en forant puis en loguant : le puits donne la colonne exacte à son
//     emplacement, qui s'étend (en transparence dégradée) aux blocs voisins de la MÊME province, sans faille entre
//     les deux. Au-delà, ou dans une autre province, la coupe reste muette.
// =====================================================================
const LAB = { truth:false, freq:28 };
const labDrilled = b => !!(b && (b.well || b.dryHole));
// Niveau de dévoilement de chaque bloc du profil : 0 = puits, 1 à 3 = extrapolé (voisin proche à lointain), -1 = inconnu
function labLevels(dispData){
  const lv = dispData.map(()=>-1), dr = [];
  dispData.forEach((bd,i)=>{ if(bd.b && labDrilled(bd.b)){ lv[i] = 0; dr.push(i); } });
  const faultBetween = (i,j) => { const a = Math.min(i,j), c = Math.max(i,j); for(let m=a;m<c;m++){ const p = dispData[m].b, q = dispData[m+1].b; if(!p||!q) return true; if(Math.abs(q.topOfReservoir - p.topOfReservoir) > 150) return true; } return false; };
  dispData.forEach((bd,i)=>{
    if(lv[i]===0 || !bd.b) return;
    let bestD = Infinity;
    dr.forEach(j=>{ const d = Math.abs(i-j); if(d<bestD && dispData[j].b.provinceIdx===bd.b.provinceIdx && !faultBetween(i,j)) bestD = d; });
    if(bestD < Infinity) lv[i] = bestD<=2 ? 1 : bestD<=4 ? 2 : 3;
  });
  return lv;
}
// Propriétés acoustiques d'une couche (mêmes lois que les diagraphies du jeu)
function labAcoustic(h, z){
  const cls = wlLithClass(h), L = WL_LITH[cls];
  const rhoSh = 2.25 + 0.30*(1-Math.exp(-z/2500)), dtSh = Math.max(80, 125 - z/70);
  let rho, dt;
  if(cls==='uncons'){ rho = 1.95 + 0.12*(1-Math.exp(-z/800)); dt = Math.max(95, 150 - z/25); }
  else if(cls==='shale'){ rho = rhoSh; dt = dtSh; }
  else if(cls==='source'){ const toc = parseFloat(h.toc)||3; rho = rhoSh - 0.04*toc; dt = dtSh + 4*toc; }
  else if(L.fixed){ rho = L.rhoMa; dt = L.dtMa; }
  else { const phi = clamp((h.porosity ?? 5)/100, 0.01, 0.38), vsh = clamp((h.vshale ?? 20)/100, 0, 1);
    rho = (L.rhoMa*(1-phi) + phi)*(1-vsh) + rhoSh*vsh; dt = (L.dtMa + phi*(189-L.dtMa))*(1-vsh) + dtSh*vsh; }
  const v = 304800/dt;           // m/s
  return { rho, v, z: rho*v/1000 }; // impédance en 10^6 kg/m2/s
}
const labHash = n => { let x = Math.sin(n*127.1 + 311.7)*43758.5453; return x - Math.floor(x); };
// Interpolation des profondeurs entre blocs : Hermite à tangentes de Catmull (cohérent avec le tracé des horizons)
function labInterp(vals, ts, t){
  const n = vals.length; if(n===1) return vals[0];
  let i = 0; while(i<n-2 && t>ts[i+1]) i++;
  const t0 = ts[i], t1 = ts[i+1], u = clamp((t-t0)/Math.max(1e-9,t1-t0), 0, 1);
  const p0 = vals[i], p1 = vals[i+1], pm = i>0 ? vals[i-1] : p0, pn = i+2<n ? vals[i+2] : p1;
  const m0 = 0.66*(p1-pm)/ (i>0?1:1), m1 = 0.66*(pn-p0);
  const h00 = 2*u**3-3*u**2+1, h10 = u**3-2*u**2+u, h01 = -2*u**3+3*u**2, h11 = u**3-u**2;
  return clamp(h00*p0 + h10*m0 + h01*p1 + h11*m1, Math.min(p0,p1), Math.max(p0,p1));
}
// Image sismique synthétique du profil : renvoie une URL de données PNG
function labSeismicImage(dispData, dMin, dMax){
  const ok = dispData.map(bd=>!!bd.layers);
  const ncol = 360, nz = 440, dz = (dMax-dMin)/nz;
  const nL = STRAT.length;
  const amp = new Float32Array(ncol*nz), has = new Uint8Array(ncol);
  const idx = dispData.map((bd,i)=>i).filter(i=>ok[i]);
  if(idx.length<2) return null;
  const ts = idx.map(i=>dispData[i].t);
  const f = LAB.freq;
  // couches par bloc : sommet, base, impédance
  const tops = Array.from({length:nL},(_,li)=>idx.map(i=>dispData[i].layers[li]?.top ?? NaN));
  const bases = Array.from({length:nL},(_,li)=>idx.map(i=>{ const l = dispData[i].layers[li]; return l ? l.top + l.thickness : NaN; }));
  const acou = Array.from({length:nL},(_,li)=>idx.map(i=>{ const bd = dispData[i], h = bd.b.horizons[li]; const l = bd.layers[li]; if(!h || !l || l.thickness<1) return null; return labAcoustic(h, (l.top + l.thickness/2)); }));
  const ricker = tt => { const a = Math.PI*f*tt; return (1-2*a*a)*Math.exp(-a*a); };
  for(let c=0;c<ncol;c++){
    const t = c/(ncol-1);
    // colonne couverte seulement entre deux blocs consécutifs ayant des données
    let cov = false; for(let k=0;k<idx.length-1;k++){ if(idx[k+1]===idx[k]+1 && t>=ts[k]-1e-9 && t<=ts[k+1]+1e-9) cov = true; }
    if(!cov) continue; has[c] = 1;
    // couches de la colonne
    const near = (()=>{ let k=0; while(k<ts.length-1 && t>(ts[k]+ts[k+1])/2) k++; return k; })();
    const layers = [];
    for(let li=0; li<nL; li++){
      const a = acou[li][near]; if(!a) continue;
      const top = labInterp(tops[li].map((v,k)=>isNaN(v)?tops[li][near]:v), ts, t), base = labInterp(bases[li].map((v,k)=>isNaN(v)?bases[li][near]:v), ts, t);
      if(base-top < 1) continue; layers.push({top, base, a});
    }
    layers.sort((p,q)=>p.top-q.top);
    for(let k=1;k<layers.length;k++){
      const A = layers[k-1].a, B = layers[k].a, R = (B.z-A.z)/(B.z+A.z), z0 = layers[k].top, V = (A.v+B.v)/2;
      const half = Math.min(nz, Math.ceil(V/(2*f)*1.6/dz)); // fenêtre de l'ondelette en échantillons
      const c0 = Math.round((z0-dMin)/dz);
      for(let j=Math.max(0,c0-half); j<=Math.min(nz-1,c0+half); j++){ const dzm = (j-c0)*dz; amp[c*nz+j] += R*ricker(2*dzm/V); }
    }
  }
  // normalisation sur le 97e centile, bruit lisse (reproductible)
  const vals = []; for(let c=0;c<ncol;c++) if(has[c]) for(let j=0;j<nz;j+=3) vals.push(Math.abs(amp[c*nz+j]));
  vals.sort((a,b)=>a-b); const ref = vals[Math.floor(vals.length*0.97)] || 1;
  const noiseAmp = 0.07*(typeof uncertaintyMult==='function' ? uncertaintyMult() : 1);
  const cv = document.createElement('canvas'); cv.width = ncol; cv.height = nz; const ctx = cv.getContext('2d'); const img = ctx.createImageData(ncol, nz);
  const col = v => { // bleu = l'impédance augmente en descendant (pic), rouge = elle diminue (creux)
    const a = Math.min(1, Math.abs(v)); const base = [247,244,236];
    const tgt = v>=0 ? [33,102,172] : [178,24,43];
    return [base[0]+(tgt[0]-base[0])*a, base[1]+(tgt[1]-base[1])*a, base[2]+(tgt[2]-base[2])*a];
  };
  // bruit de fond : bruit de valeur à grain fin (≈ 6 colonnes × 8 échantillons), reproductible
  const GX = Math.ceil(ncol/6)+2, GZ = Math.ceil(nz/8)+2, grid = new Float32Array(GX*GZ);
  for(let i=0;i<GX;i++) for(let k=0;k<GZ;k++) grid[k*GX+i] = labHash(i*131.7 + k*17.3 + 5) - 0.5;
  const sm = u => u*u*(3-2*u);
  const nz2 = (c, j) => { const x = c/6, z = j/8, i = Math.floor(x), k = Math.floor(z), u = sm(x-i), w = sm(z-k);
    const a = grid[k*GX+i]*(1-u) + grid[k*GX+i+1]*u, b = grid[(k+1)*GX+i]*(1-u) + grid[(k+1)*GX+i+1]*u; return a*(1-w) + b*w; };
  for(let c=0;c<ncol;c++) for(let j=0;j<nz;j++){
    const p = (j*ncol+c)*4;
    if(!has[c]){ img.data[p+3] = 0; continue; }
    const n = nz2(c, j)*noiseAmp*2;
    const v = clamp(amp[c*nz+j]/ref*1.05 + n, -1, 1);
    const rgb = col(v); img.data[p]=rgb[0]; img.data[p+1]=rgb[1]; img.data[p+2]=rgb[2]; img.data[p+3]=255;
  }
  ctx.putImageData(img, 0, 0);
  return cv.toDataURL('image/png');
}
// Tableau de traitement : ce que la sismique donne par horizon
function labHorizonTable(dispData, lv){
  const rows = [];
  const nL = STRAT.length;
  for(let li=0; li<nL; li++){
    let n=0, top=0, th=0, zS=0, vS=0, Rs=0, name=null;
    dispData.forEach((bd,i)=>{
      if(!bd.layers) return; const l = bd.layers[li]; const h = bd.b.horizons[li]; if(!l || !h || l.thickness<1) return;
      const a = labAcoustic(h, l.top + l.thickness/2); n++; top += l.top; th += l.thickness; vS += a.v; zS += a.z;
      const prev = li>0 ? bd.b.horizons[li-1] : null; const lp = li>0 ? bd.layers[li-1] : null;
      if(prev && lp && lp.thickness>=1){ const ap = labAcoustic(prev, lp.top + lp.thickness/2); Rs += (a.z-ap.z)/(a.z+ap.z); }
      if(lv[i]>=0 && !name) name = h.name;
    });
    if(!n) continue;
    const v = vS/n*(1 + (labHash(li+3)-0.5)*0.16), R = Rs/n;
    rows.push({ li, top:top/n, th:th/n, v, R, name });
  }
  const rc = r => { const a = Math.abs(r); return (a>0.15?'fort':a>0.06?'moyen':'faible') + (r>=0?' (+)':' (−)'); };
  const vc = v => v<3000 ? 'lent' : v<4200 ? 'moyen' : v<5200 ? 'rapide' : 'très rapide';
  const fr = x => Math.round(x).toLocaleString('fr-FR');
  return `<div style="overflow-x:auto;"><table class="lab-tab"><thead><tr><th>Horizon</th><th>Prof. toit</th><th>Épaisseur</th><th>Vitesse d'intervalle (±8 %)</th><th>Contraste au toit</th><th>Lithologie</th></tr></thead><tbody>${rows.map(r=>
    `<tr><td><b>H${r.li+1}</b></td><td>${fr(r.top)} m</td><td>${fr(r.th)} m</td><td>${fr(r.v)} m/s <span class="lab-mut">(${vc(r.v)})</span></td><td>${r.li===0?'—':rc(r.R)}</td><td>${r.name?`<b>${r.name}</b>`:'<span class="lab-mut">?</span>'}</td></tr>`).join('')}</tbody></table></div>
    <div class="lab-note"><b>Lire ce tableau.</b> Vitesse lente (moins de 3 000 m/s) : roches peu compactées, argiles, charbon. Vitesse très rapide (plus de 5 200) : anhydrite, dolomie, calcaire compact. Le sel est un cas à part : vitesse élevée (autour de 4 500) mais densité très basse, donc contraste d'impédance faible. <b>Contraste (+)</b> : le matériau sous l'interface est plus « dur » acoustiquement (impédance plus haute) ; <b>(−)</b> : plus mou. Ce n'est ni une densité, ni une lithologie : une même roche peut donner (+) ou (−) selon celle qui la recouvre.</div>`;
}
'''

# insérer le moteur avant renderSection
rep("function renderSection(){", LAB_JS + "\nfunction renderSection(){")

# ====================== renderSection : mode labo ======================
# 1) variables du mode, calculées après dispData
rep("""  // Transition entre deux lithologies voisines occupant la même position
  // stratigraphique (changement de province) : un BISEAU, pas une coupure""", """  const LAB_ON = !LAB.truth;
  const labLv = LAB_ON ? labLevels(dispData) : dispData.map(()=>0);
  const labVisibleAtX = x => { if(!LAB_ON) return true; let best = 0, bd = Infinity; dispData.forEach((d,i)=>{ const dd = Math.abs(xOf(d.t)-x); if(dd<bd){ bd = dd; best = i; } }); return labLv[best] >= 0; };
  // Transition entre deux lithologies voisines occupant la même position
  // stratigraphique (changement de province) : un BISEAU, pas une coupure""")
# 2) clipPaths par niveau + image sismique
rep("""  <clipPath id="sectionPlotClip"><rect x="${MARG.l}" y="${MARG.t}" width="${PW}" height="${PH}"/></clipPath>
  </defs>`;
  svg += `<g clip-path="url(#sectionPlotClip)">`;""", """  <clipPath id="sectionPlotClip"><rect x="${MARG.l}" y="${MARG.t}" width="${PW}" height="${PH}"/></clipPath>
  ${[0,1,2,3,-1].map(k=>{ const rs = []; dispData.forEach((d,i)=>{ if(labLv[i]!==k) return; const x = xOf(d.t); const xl = i>0 ? (x + xOf(dispData[i-1].t))/2 : MARG.l, xr = i<dispData.length-1 ? (x + xOf(dispData[i+1].t))/2 : MARG.l+PW; rs.push(`<rect x="${xl.toFixed(1)}" y="${MARG.t}" width="${(xr-xl).toFixed(1)}" height="${PH}"/>`); }); return `<clipPath id="labClip${k<0?'U':k}">${rs.join('')}</clipPath>`; }).join('')}
  </defs>`;
  svg += `<g clip-path="url(#sectionPlotClip)">`;
  if(LAB_ON){
    const url = labSeismicImage(dispData, dMin, dMax);
    // La sismique n'est dessinée que là où la lithologie est INCONNUE : les deux vues ne se superposent jamais
    // (superposées, elles brouillaient la lecture). Dans les colonnes dévoilées, seule la lithologie apparaît,
    // d'autant plus pâle que l'extrapolation est lointaine.
    if(url) svg += `<image href="${url}" clip-path="url(#labClipU)" x="${xOf(0).toFixed(1)}" y="${MARG.t}" width="${(xOf(1)-xOf(0)).toFixed(1)}" height="${PH}" preserveAspectRatio="none"/>`;
  }""")
# 3) polygones de lithologie : seulement dans les zones dévoilées
rep("""        svg += `<path d="${dPoly}" fill="${col}" fill-opacity="${opacity.toFixed(2)}" stroke="var(--sec-ink-edge)" stroke-width=".4" stroke-linejoin="round" class="sec-layer-poly" data-layer-name="${(refLayer.name||'').replace(/"/g,'&quot;')}" style="cursor:pointer;"/>`;
        svg += figOverlay(refLayer, dPoly, 0.5 + avgConf*0.45);""", """        const polyStr = `<path d="${dPoly}" fill="${col}" fill-opacity="${opacity.toFixed(2)}" stroke="var(--sec-ink-edge)" stroke-width=".4" stroke-linejoin="round" class="sec-layer-poly" data-layer-name="${(refLayer.name||'').replace(/"/g,'&quot;')}" style="cursor:pointer;"/>` + figOverlay(refLayer, dPoly, 0.5 + avgConf*0.45);
        if(LAB_ON){ [0,1,2,3].forEach(k=>{ svg += `<g clip-path="url(#labClip${k})" opacity="${[1,.82,.62,.46][k]}">${polyStr}</g>`; }); }
        else svg += polyStr;""")
# 4) horizons : traits uniformes en mode labo (ne désignent pas le réservoir)
rep("""        const isKey = refLayer.role==='reservoir' || refLayer.role==='source';
        const strokeCol = avgConf >= 0.7 ? 'var(--sec-line-strong)' : 'var(--sec-line-soft)';
        const sw = isKey ? (avgConf>=0.7?2:1.2) : (avgConf>=0.7?0.8:0.4);
        const dash = avgConf < 0.5 ? 'stroke-dasharray="4,3"' : '';""", """        const isKey = !LAB_ON && (refLayer.role==='reservoir' || refLayer.role==='source');
        const strokeCol = LAB_ON ? 'rgba(40,40,40,.55)' : (avgConf >= 0.7 ? 'var(--sec-line-strong)' : 'var(--sec-line-soft)');
        const sw = LAB_ON ? 0.6 : (isKey ? (avgConf>=0.7?2:1.2) : (avgConf>=0.7?0.8:0.4));
        const dash = avgConf < 0.5 ? 'stroke-dasharray="4,3"' : '';""")
rep("fragments.push({ name: refLayer.name || '', isKey, best, bandH: best.yBase-best.yTop });", "fragments.push({ name: refLayer.name || '', isKey, best, bandH: best.yBase-best.yTop, li });")
# 5) étiquettes : nom si dévoilé, sinon numéro d'horizon
rep("""      byName.forEach(f=>{
        if(f.bandH < 10) return;
        const fontSz = f.bandH >= 18 ? 7.5 : 6.5;
        const textCol = f.isKey ? 'var(--sec-text-strong)' : 'var(--sec-text-soft)';
        const label = f.name.length>14 ? f.name.slice(0,13)+'.' : f.name;""", """      byName.forEach(f=>{
        if(f.bandH < 10) return;
        const fontSz = f.bandH >= 18 ? 7.5 : 6.5;
        const textCol = f.isKey ? 'var(--sec-text-strong)' : 'var(--sec-text-soft)';
        const known = labVisibleAtX(f.best.x);
        const label = (LAB_ON && !known) ? 'H' + (f.li+1) : (f.name.length>14 ? f.name.slice(0,13)+'.' : f.name);""")
# 6) sel : « corps transparent » ; biseaux et marqueurs de réservoir : seulement si dévoilé
rep("""        svg += `<text x="${cx.toFixed(1)}" y="${(MARG.t+14).toFixed(1)}"
          font-size="7" fill="#a060b0" text-anchor="middle">🧂 Sel</text>`;""", """        svg += `<text x="${cx.toFixed(1)}" y="${(MARG.t+14).toFixed(1)}"
          font-size="7" fill="#a060b0" text-anchor="middle">${LAB_ON ? 'corps sans réflecteur (transparent)' : '🧂 Sel'}</text>`;""")
rep("""        const nominalThick = (STRAT_PROVINCES[bd.b?.provinceIdx ?? 0] || STRAT)[resIdxBiseau].thickness;""", """        if(LAB_ON && labLv[i] < 0) return; // un amincissement du réservoir le désignerait : seulement s'il est dévoilé
        const nominalThick = (STRAT_PROVINCES[bd.b?.provinceIdx ?? 0] || STRAT)[resIdxBiseau].thickness;""")
rep("""    dispData.forEach(bd=>{
      if(!bd.layers) return;
      const resIdx = STRAT.findIndex(l=>l.role==='reservoir');
      const resLy  = bd.layers[resIdx];
      if(!resLy) return;""", """    dispData.forEach((bd, di)=>{
      if(!bd.layers) return;
      if(LAB_ON && labLv[di] !== 0) return; // le repère du réservoir n'apparaît qu'aux puits
      const resIdx = STRAT.findIndex(l=>l.role==='reservoir');
      const resLy  = bd.layers[resIdx];
      if(!resLy) return;""")
# 7) légende : seulement les lithologies dévoilées + barre de couleur
rep("""  blockData.filter(d=>d.layers).flatMap(d=>d.layers).forEach(layer=>{""", """  blockData.filter((d,i)=>d.layers && (!LAB_ON || labLv[i]>=0)).flatMap(d=>d.layers).forEach(layer=>{""")
rep("""  legendHtml += `<div class="sl-item">
    <div class="sl-swatch" style="background:none;border:1px solid var(--red);"></div>""", """  if(LAB_ON) legendHtml = `<div style="width:100%;"><div style="display:flex;align-items:center;gap:6px;font-size:10px;"><span style="color:#b2182b;">− l'impédance diminue</span><span style="flex:1;max-width:160px;height:9px;border:1px solid var(--line);background:linear-gradient(90deg,#b2182b,#f7f4ec,#2166ac);"></span><span style="color:#2166ac;">+ elle augmente</span></div>
    <div class="lab-note" style="margin:4px 0 6px;">Amplitude des réflexions (polarité normale). Les couleurs montrent des CONTRASTES entre couches, pas des roches. Les roches n'apparaissent qu'aux puits (couleurs pleines) puis, de plus en plus pâles, jusqu'aux blocs voisins de la même province sans faille. Les deux vues ne se superposent jamais : là où la lithologie est connue, la sismique disparaît.</div>
    ${legendHtml ? '<div style="font-size:10px;color:var(--muted);">Lithologies débloquées :</div>' : '<div style="font-size:10px;color:var(--muted);">Aucune lithologie débloquée : forez et loguez.</div>'}</div>` + legendHtml;
  legendHtml += `<div class="sl-item">
    <div class="sl-swatch" style="background:none;border:1px solid var(--red);"></div>""")
# 8) interprétation structurale : ne désigne pas le réservoir ; tableau de traitement
rep("""  interpretSection(blockData, profileBlocks);""", """  if(LAB_ON){
    const ip = document.getElementById('sectionInterpret');
    if(ip){ ip.style.display = 'block'; ip.innerHTML = `<b style="color:var(--amber);">Traitement et interprétation</b>` + labHorizonTable(dispData, labLv) + `<div class="lab-note">Quel horizon est le réservoir ? La sismique ne le dit pas : repérez les plis, les failles et les contrastes, croisez avec la vitesse, puis <b>forez</b>. Le log débloque la lithologie sur la coupe.</div>`; }
  } else interpretSection(blockData, profileBlocks);""")

# ====================== interface ======================
rep("""<button class="study-btn study-btn-compact" onclick="openLithoLib()">📚 <span class="i18n" data-fr="Lithologies" data-en="Lithologies">Lithologies</span></button></div>""", """<button class="study-btn study-btn-compact" onclick="openLithoLib()">📚 <span class="i18n" data-fr="Lithologies" data-en="Lithologies">Lithologies</span></button> <button class="study-btn study-btn-compact" id="labTruthBtn" onclick="LAB.truth=!LAB.truth; this.textContent = LAB.truth ? '🙈 Cacher la vérité' : '👁 Voir la vérité (triche)'; renderSection();">👁 Voir la vérité (triche)</button></div>""")
rep("</body>", """
<style>
.lab-tab{border-collapse:collapse;width:100%;font-size:11px;margin:6px 0;}
.lab-tab th{text-align:left;color:var(--muted);font-weight:500;border-bottom:1px solid var(--line);padding:4px 6px;white-space:nowrap;}
.lab-tab td{border-bottom:1px solid var(--line);padding:4px 6px;white-space:nowrap;}
.lab-mut{color:var(--muted);}
.lab-note{font-size:11px;line-height:1.55;color:var(--muted);margin-top:6px;}
#labBadge{position:fixed;right:10px;bottom:62px;z-index:900;background:var(--ink);color:var(--on-ink);font-size:11px;padding:6px 10px;border-radius:8px;opacity:.88;max-width:260px;line-height:1.4;}
body.mobile-layout #labBadge{bottom:64px;}
</style>
<div id="labBadge"><b>LABO sismique</b> : la sismique ne montre plus les roches. Forez et loguez pour les débloquer. Sauvegarde séparée du jeu principal.</div>
</body>""")

# ====================== PHASE 2 : le joueur désigne son réservoir ======================
PHASE2_JS = r"""
// ---------- PHASE 2 : désigner l'horizon cible ----------
// Le jeu ne dit plus quel horizon est le réservoir. Le joueur vise un horizon (clic sur la sismique ou bouton du
// tableau). Le forage vise cet horizon : s'il se trompe, le puits est sec (mais le log lui apprend où était le
// réservoir) ; s'il a raison, il touche un bonus d'interprétation.
const LAB_PICK_BONUS = 120000;
function labPickDepth(b){ if(G.labPick==null) return null; try { const L = getBlockLayerData(b); const l = L && L[G.labPick]; return l && isFinite(l.top) ? l.top : null; } catch(e){ return null; } }
function labSetPick(li){
  G.labPick = (G.labPick===li) ? null : li;
  if(G.labPick!==null){ addLog('🎯 Cible désignée : horizon H' + (li+1) + '.', 'ev'); toast('Cible : horizon H' + (li+1) + '. Les forages la viseront.'); }
  else { addLog('Cible retirée.', 'ev'); }
  renderSection();
  if(selectedBlock!==null){ renderGeoPanel(blocks[selectedBlock]); renderStudiesPanel(blocks[selectedBlock]); }
  if(typeof renderGuide==='function') renderGuide();
  if(typeof bigView!=='undefined' && bigView.open) bvRender();
}
function labGoSection(){ if(typeof isMobileLayout==='function' && isMobileLayout()) showMobileScreen('section'); else switchTab('section'); }
function labPickAt(evt){
  const svg = evt.target.ownerSVGElement || evt.target; const raw = svg.getAttribute && svg.getAttribute('data-lab'); if(!raw) return;
  const info = JSON.parse(raw); const pt = svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  const t = (p.x - info.m[0])/info.m[2], d = info.d[0] + (p.y - info.m[1])/info.m[3]*(info.d[1]-info.d[0]);
  let bi = -1, bd = Infinity; info.b.forEach((b,i)=>{ if(!b) return; const dd = Math.abs(b.t - t); if(dd<bd){ bd = dd; bi = i; } });
  if(bi<0) return; const L = info.b[bi].L; let li = -1, best = Infinity;
  L.forEach((l,i)=>{ if(l[1]<1) return; const mid = l[0] + l[1]/2, inside = d>=l[0] && d<=l[0]+l[1]; const dist = inside ? 0 : Math.min(Math.abs(d-l[0]), Math.abs(d-(l[0]+l[1]))); if(dist<best){ best = dist; li = i; } });
  if(li>=0) labSetPick(li);
}
function labResultHtml(b, missed, resIdx){
  if(G.labPick==null) return '';
  const real = b.horizons[resIdx], mine = b.horizons[G.labPick];
  if(missed) return `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--line);"><b>Cible manquée.</b> Vous visiez H${G.labPick+1} (${mine?mine.name:'?'}). Le réservoir était H${resIdx+1} (${real?real.name:'?'}). Le log de ce puits vous donne la lithologie de la colonne : recalez votre interprétation sur la coupe, puis visez de nouveau.</div>`;
  if(G.mode!=='sandbox') G.budget += LAB_PICK_BONUS;
  addLog('🎯 Interprétation juste : H' + (resIdx+1) + ' est bien le réservoir (+' + formatM(LAB_PICK_BONUS) + ').', 'good');
  return `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--line);"><b>Interprétation juste</b> : H${resIdx+1} (${real?real.name:'?'}) est bien le réservoir. Bonus : <b>+${formatM(LAB_PICK_BONUS)}</b>.</div>`;
}
"""
rep("function renderSection(){", PHASE2_JS + "\nfunction renderSection(){")
rep("    month:0, speed:1, paused:false,", "    month:0, speed:1, paused:false, labPick:null,")
# profondeur de forage : celle de l'horizon visé
rep("""function drillDepthEstimate(b){
  if(b.estimate?.depth !== undefined) return b.estimate.depth;""", """function drillDepthEstimate(b){
  if(G.labPick!=null){ const e = labPickDepth(b); if(e!==null) return e; }
  if(b.estimate?.depth !== undefined) return b.estimate.depth;""")
# forage : il faut une cible
rep("""  if(b.studyLevel<1){addLog('Réalisez au moins une étude""", """  if(G.labPick==null && G.mode!=='sandbox'){ const m = 'Désignez d\\'abord votre horizon cible sur la coupe (clic sur la sismique ou bouton « viser » du tableau).'; addLog(m, 'bad'); toast(m); return; }
  if(b.studyLevel<1){addLog('Réalisez au moins une étude""")
# résolution : un mauvais horizon donne un puits sec
rep("""  const geoOk  = Math.random() < b.trueProbability;""", """  let geoOk  = Math.random() < b.trueProbability;
  const labResIdx = STRAT.findIndex(l=>l.role==='reservoir');
  const labMissed = G.labPick!=null && G.labPick!==labResIdx;
  if(labMissed) geoOk = false;""")
rep("""  const trueDepth = b.topOfReservoir;""", """  const trueDepth = (G.labPick!=null && b.horizons[G.labPick]) ? b.horizons[G.labPick].top : b.topOfReservoir;""")
rep("""  const calibHtml = d.est ? applyCalibration(d.est, geoOk, prodOut, b) : '';""", """  const calibHtml = (d.est ? applyCalibration(d.est, geoOk, prodOut, b) : '') + labResultHtml(b, labMissed, labResIdx);""")
# fiches du bloc et info-bulle : plus de profondeur du réservoir
rep("""  if(e?.depth !== undefined){
    out.push({n:'Réservoir', st:'ind', t:`Horizon vers ${Math.round(e.depth)} m ± ${Math.round(e.depthErr)} m.` + (e.quality!==undefined ? ` Qualité ${Math.round(e.quality)}/100 ± ${Math.round(e.qualErr)}.` : '')});
  } else out.push({n:'Réservoir', st:'inc', t:'Précisé par la sismique 2D.'});""", """  if(e?.depth !== undefined){
    const pd = labPickDepth(b);
    out.push({n:'Réservoir', st:'ind', t: G.labPick==null ? 'À identifier vous-même sur la coupe : aucun horizon n\\'est désigné comme réservoir.' : (pd!==null ? `Votre cible H${G.labPick+1} vers ${Math.round(pd)} m ± ${Math.round(e.depthErr)} m.` : `Votre cible H${G.labPick+1} : profondeur à préciser par la sismique 2D sur ce bloc.`)});
  } else out.push({n:'Réservoir', st:'inc', t:'Précisé par la sismique 2D.'});""")
rep("""  if(b.estimate?.depth) h+=`<div class="tr"><span class="tl">Prof. réservoir</span><span>${Math.round(b.estimate.depth)} m</span></div>`;""", """  { const pd = labPickDepth(b); if(pd!==null) h+=`<div class="tr"><span class="tl">Prof. cible H${G.labPick+1}</span><span>${Math.round(pd)} m</span></div>`; }""")
# guide : désigner la cible avant de forer
rep("""  if(ranked.length && ranked[0].e.ev > 0){""", """  if(G.labPick==null && ranked.length){
    return {cur:4, text:'Avant de forer, désignez sur la coupe l\\'horizon que vous pensez être le réservoir : clic sur la sismique, ou bouton « viser » du tableau. Un mauvais choix donne un puits sec.',
            act:{label:'Aller à la coupe', call:'labGoSection()', ok:true}};
  }
  if(ranked.length && ranked[0].e.ev > 0){""")
# section : clic pour viser, surbrillance de la cible, données pour le clic
rep("""    if(url) svg += `<image href="${url}" clip-path="url(#labClipU)" x="${xOf(0).toFixed(1)}" y="${MARG.t}" width="${(xOf(1)-xOf(0)).toFixed(1)}" height="${PH}" preserveAspectRatio="none"/>`;""", """    if(url) svg += `<image href="${url}" clip-path="url(#labClipU)" x="${xOf(0).toFixed(1)}" y="${MARG.t}" width="${(xOf(1)-xOf(0)).toFixed(1)}" height="${PH}" preserveAspectRatio="none"/>`;
    svg += `<rect x="${MARG.l}" y="${MARG.t}" width="${PW}" height="${PH}" fill="transparent" style="cursor:crosshair" onclick="labPickAt(event)"/>`;""")
rep("""class="sec-layer-poly" data-layer-name="${(refLayer.name||'').replace(/"/g,'&quot;')}" style="cursor:pointer;"/>` + figOverlay""", """class="sec-layer-poly" data-layer-name="${(refLayer.name||'').replace(/"/g,'&quot;')}" onclick="labPickAt(event)" style="cursor:pointer;"/>` + figOverlay""")
rep("""  svg += `</g>`;

  // ── Axes et échelle ──""", """  // Horizon visé : trait ambre sur toute sa longueur
  if(LAB_ON && G.labPick!=null){
    const pts = []; dispData.forEach(bd=>{ const l = bd.layers && bd.layers[G.labPick]; if(l && l.thickness>=1) pts.push({x:xOf(bd.t), y:yOf(l.top)}); });
    if(pts.length>=2){
      svg += `<path d="M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}${secSmoothPath(pts, faultPx)}" fill="none" stroke="var(--amber)" stroke-width="2.4" stroke-linecap="round" pointer-events="none"/>`;
      const q = pts[pts.length-1]; svg += `<rect x="${(q.x-44).toFixed(1)}" y="${(q.y-13).toFixed(1)}" width="42" height="11" rx="3" fill="var(--amber)"/><text x="${(q.x-23).toFixed(1)}" y="${(q.y-5).toFixed(1)}" font-size="7.5" font-weight="700" fill="#fff" text-anchor="middle" pointer-events="none">🎯 H${G.labPick+1}</text>`;
    }
  }
  svg += `</g>`;

  // ── Axes et échelle ──""")
rep("""  svgEl.innerHTML = svg;""", """  svgEl.innerHTML = svg;
  svgEl.setAttribute('data-lab', JSON.stringify({ m:[MARG.l, MARG.t, PW, PH], d:[dMin, dMax], b:dispData.map(bd=>bd.layers ? { t:bd.t, L:bd.layers.map(l=>[Math.round(l.top), Math.round(l.thickness)]) } : null) }));""")
# tableau : bouton viser
rep("""<th>Contraste au toit</th><th>Lithologie</th></tr></thead>""", """<th>Contraste au toit</th><th>Lithologie</th><th>Cible</th></tr></thead>""")
rep("""<td>${r.name?`<b>${r.name}</b>`:'<span class="lab-mut">?</span>'}</td></tr>`).join('')}</tbody></table></div>""", """<td>${r.name?`<b>${r.name}</b>`:'<span class="lab-mut">?</span>'}</td><td><button class="lab-pick ${G.labPick===r.li?'sel':''}" onclick="labSetPick(${r.li})">${G.labPick===r.li?'🎯 cible':'viser'}</button></td></tr>`).join('')}</tbody></table></div>""")
rep("""<div class="lab-note">Quel horizon est le réservoir ? La sismique ne le dit pas : repérez les plis, les failles et les contrastes, croisez avec la vitesse, puis <b>forez</b>. Le log débloque la lithologie sur la coupe.</div>""", """<div class="lab-note"><b>Quel horizon est le réservoir ?</b> La sismique ne le dit pas : repérez les plis, les failles et les contrastes, croisez avec la vitesse (un réservoir de grès ou de calcaire est plus « dur » que l'argile qui le scelle, donc plutôt un contraste (+) à son toit), puis <b>désignez votre cible</b> par un clic sur la sismique ou le bouton « viser ». Forer le mauvais horizon donne un puits sec, mais le log vous apprend où était le réservoir ; un bon choix rapporte ${formatM(LAB_PICK_BONUS)}.</div>""")
rep(""".lab-mut{color:var(--muted);}""", """.lab-mut{color:var(--muted);}
.lab-pick{padding:3px 9px;border:1px solid var(--line);background:var(--panel);color:var(--text);border-radius:999px;font-size:11px;cursor:pointer;font-family:var(--sans);}
.lab-pick.sel{background:var(--amber);color:#fff;border-color:var(--amber);font-weight:600;}""")
rep("""<b>LABO sismique</b> : la sismique ne montre plus les roches. Forez et loguez pour les débloquer. Sauvegarde séparée du jeu principal.""", """<b>LABO sismique, phase 2</b> : la sismique ne montre plus les roches ni le réservoir. Désignez votre cible sur la coupe, forez, loguez. Sauvegarde séparée du jeu principal.""")


rep("showDrillReveal(b, geoOk, techOk, limitingFactor, calibHtml);\n", "showDrillReveal(b, geoOk, techOk, labMissed ? 'labmiss' : limitingFactor, calibHtml);\n")
rep("""      detail.innerHTML = `Facteur limitant : <b>${FACTOR_LABEL[limitingFactor]}</b> : ${FACTOR_EXPLAIN_BAD[limitingFactor]}.`;""", """      detail.innerHTML = limitingFactor==='labmiss' ? `Cause : <b>mauvais horizon visé</b>. Le puits a traversé la colonne sans toucher le réservoir.` : `Facteur limitant : <b>${FACTOR_LABEL[limitingFactor]}</b> : ${FACTOR_EXPLAIN_BAD[limitingFactor]}.`;""")


# ====================== PHASE 3 : calage puits-sismique ======================
PHASE3_JS = r"""
// ---------- PHASE 3 : calage puits-sismique ----------
// La sismique est en temps, le puits en profondeur. Le joueur règle une vitesse moyenne de conversion jusqu'à ce que
// le sismogramme synthétique du puits se superpose à la trace sismique. Un puits calé étend sa lithologie le long du
// profil ; un puits non calé ne dévoile que sa propre colonne.
const LAB_CAL_BONUS = 80000;
const labCalOk = b => !!(b && (G.mode==='sandbox' || (G.labCal && G.labCal[b.id])));
const labRicker = (t, f) => { const a = Math.PI*f*t; return (1-2*a*a)*Math.exp(-a*a); };
function labCalModel(b){
  const L = getBlockLayerData(b); if(!L) return null;
  const rows = []; L.forEach((l,li)=>{ if(l && l.thickness>=1 && b.horizons[li]) rows.push({li, top:l.top, th:l.thickness, a:labAcoustic(b.horizons[li], l.top + l.thickness/2)}); });
  rows.sort((p,q)=>p.top-q.top); if(rows.length<3) return null;
  let t = 2*rows[0].top/rows[0].a.v; const refl = [];
  rows.forEach((r,k)=>{ if(k>0){ const A = rows[k-1].a, B = r.a; t += 2*rows[k-1].th/A.v; refl.push({li:r.li, z:r.top, R:(B.z-A.z)/(B.z+A.z), tTrue:t}); } });
  const zMax = rows[rows.length-1].top + rows[rows.length-1].th;
  const rms = V => { let s=0, w=0; refl.forEach(r=>{ const k = Math.abs(r.R)>0.03 ? 1 : 0; if(!k) return; const d = 2*r.z/V - r.tTrue; s += d*d; w++; }); return w ? Math.sqrt(s/w) : 0; };
  let best = Infinity, bestV = 3000; for(let V=1500; V<=7000; V+=25){ const e = rms(V); if(e<best){ best = e; bestV = V; } }
  return { refl, zMax, tMax: refl[refl.length-1].tTrue + 0.18, rms, bestV, tol: Math.max(0.022, best*1.5), best };
}
let labCalState = null;
function labOpenCal(id){
  const b = blocks.find(x=>x.id===id); if(!b || !labDrilled(b)) return;
  const m = labCalModel(b); if(!m){ toast('Colonne trop mince pour un calage.'); return; }
  labCalState = { id, m, V: 3000, tries: 0 };
  let el = document.getElementById('labCalModal');
  if(!el){ el = document.createElement('div'); el.id = 'labCalModal'; document.body.appendChild(el); }
  el.classList.add('open'); labCalRender();
}
function labCalClose(){ const el = document.getElementById('labCalModal'); if(el) el.classList.remove('open'); labCalState = null; }
function labCalSet(v){ if(!labCalState) return; labCalState.V = +v; labCalDraw(); }
function labCalDraw(){
  const S = labCalState; if(!S) return; const m = S.m, svg = document.getElementById('labCalSvg'); if(!svg) return;
  const W = 460, H = 360, top = 28, bot = H-12, f = 30, tMax = m.tMax;
  const yT = t => top + (t/tMax)*(bot-top);
  const cx1 = 130, cx2 = 330, amp = 34, nS = 260;
  const trace = (tf) => { let pts = [], pos = []; for(let i=0;i<=nS;i++){ const t = i/nS*tMax; let a = 0; m.refl.forEach(r=>{ a += r.R*labRicker(t - tf(r), f); });
    a += (labHash(i*3.1 + S.id*7.7)-0.5)*0.05*(typeof uncertaintyMult==='function'?uncertaintyMult():1);
    pts.push([t,a]); } const mx = Math.max(0.05, ...pts.map(p=>Math.abs(p[1]))); return pts.map(p=>[p[0], p[1]/mx]); };
  const tr = trace(r=>r.tTrue), sy = trace(r=>2*r.z/S.V);
  const line = (pts,cx) => 'M' + pts.map(p=>`${(cx+p[1]*amp).toFixed(1)},${yT(p[0]).toFixed(1)}`).join(' L');
  const fill = (pts,cx) => `M${cx},${yT(0)} L` + pts.map(p=>`${(cx+Math.max(0,p[1])*amp).toFixed(1)},${yT(p[0]).toFixed(1)}`).join(' L') + ` L${cx},${yT(tMax)} Z`;
  let h = `<text x="${cx1}" y="14" text-anchor="middle" font-size="10" font-weight="700" fill="var(--text)">Synthétique du puits</text><text x="${cx2}" y="14" text-anchor="middle" font-size="10" font-weight="700" fill="var(--text)">Trace sismique</text>`;
  for(let t=0; t<tMax; t+=0.1) h += `<line x1="40" x2="${W-10}" y1="${yT(t)}" y2="${yT(t)}" stroke="var(--line)" stroke-width=".5"/><text x="36" y="${yT(t)+3}" font-size="8" text-anchor="end" fill="var(--muted)">${Math.round(t*1000)}</text>`;
  h += `<text x="6" y="${top-8}" font-size="8" fill="var(--muted)">ms</text>`;
  [[sy,cx1,'#4a6a8a'],[tr,cx2,'#8a4a4a']].forEach(([pts,cx,col])=>{ h += `<line x1="${cx}" x2="${cx}" y1="${top}" y2="${bot}" stroke="var(--line)" stroke-dasharray="2 3"/><path d="${fill(pts,cx)}" fill="${col}" opacity=".55"/><path d="${line(pts,cx)}" fill="none" stroke="#222" stroke-width=".8"/>`; });
  m.refl.forEach(r=>{ if(Math.abs(r.R)<0.03) return; const y = yT(2*r.z/S.V); if(y>bot) return; h += `<line x1="${cx1-amp-6}" x2="${W-10}" y1="${y}" y2="${y}" stroke="var(--amber)" stroke-width=".8" stroke-dasharray="4 3" opacity=".8"/><text x="${cx1-amp-8}" y="${y-2}" font-size="8.5" font-weight="700" text-anchor="end" fill="var(--amber)">H${r.li+1} · ${Math.round(r.z)} m</text>`; });
  svg.innerHTML = h;
  const v = document.getElementById('labCalV'); if(v) v.textContent = Math.round(S.V).toLocaleString('fr-FR') + ' m/s';
}
function labCalRender(){
  const S = labCalState, el = document.getElementById('labCalModal'); if(!S || !el) return; const b = blocks.find(x=>x.id===S.id);
  el.innerHTML = `<div class="lab-cal-box"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;"><b style="font-size:14px;">Calage puits-sismique · bloc (${b.x}, ${b.y})</b><button class="lab-pick" onclick="labCalClose()">Fermer</button></div>
    <div class="lab-note" style="margin-top:4px;">La sismique est en temps, le puits en profondeur. À gauche, le sismogramme calculé depuis votre log avec une <b>vitesse moyenne</b> constante ; à droite, la trace réelle. Réglez la vitesse jusqu'à ce que les pics et les creux se superposent, surtout aux horizons marqués en ambre.</div>
    <svg id="labCalSvg" viewBox="0 0 460 360" style="width:100%;max-width:520px;background:var(--panel);border:1px solid var(--line);border-radius:6px;margin-top:6px;"></svg>
    <div style="display:flex;align-items:center;gap:10px;margin-top:6px;"><span style="font-size:11px;">Vitesse moyenne</span><input id="labCalSlider" type="range" min="1500" max="7000" step="25" value="${S.V}" oninput="labCalSet(this.value)" style="flex:1;"><b id="labCalV" style="min-width:84px;text-align:right;font-size:12px;"></b></div>
    <div id="labCalMsg" style="min-height:36px;margin-top:6px;font-size:11.5px;"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px;"><button class="lab-pick sel" onclick="labCalValidate()">Valider le calage</button></div></div>`;
  labCalDraw();
}
function labCalValidate(){
  const S = labCalState; if(!S) return; const m = S.m, e = m.rms(S.V), msg = document.getElementById('labCalMsg'); S.tries++;
  if(e <= m.tol){
    const b = blocks.find(x=>x.id===S.id); G.labCal = G.labCal || {}; const first = !G.labCal[b.id]; G.labCal[b.id] = true;
    if(first && G.mode!=='sandbox') G.budget += LAB_CAL_BONUS;
    addLog(`📐 Puits (${b.x},${b.y}) calé : vitesse moyenne ${Math.round(S.V)} m/s. Sa lithologie est étendue le long du profil` + (first ? ` (+${formatM(LAB_CAL_BONUS)})` : '') + '.', 'good');
    toast('Calage validé : la lithologie du puits se propage sur la coupe.');
    labCalClose(); renderSection();
    if(selectedBlock!==null){ renderGeoPanel(blocks[selectedBlock]); renderStudiesPanel(blocks[selectedBlock]); }
    if(typeof renderGuide==='function') renderGuide(); if(typeof bigView!=='undefined' && bigView.open) bvRender();
  } else {
    const sens = 2*m.refl[0].z/S.V; // repère : un synthétique trop profond en temps appelle une vitesse plus haute
    let tooDeep = 0, n = 0; m.refl.forEach(r=>{ if(Math.abs(r.R)>0.03){ tooDeep += (2*r.z/S.V - r.tTrue); n++; } });
    msg.innerHTML = `<span style="color:var(--red);"><b>Calage insuffisant</b> (écart moyen ${Math.round(e*1000)} ms, tolérance ${Math.round(m.tol*1000)} ms).</span> ` + (S.tries>=2 ? (tooDeep>0 ? 'Les horizons du synthétique arrivent trop tard : augmentez la vitesse.' : 'Les horizons du synthétique arrivent trop tôt : diminuez la vitesse.') : 'Superposez mieux les horizons, puis revalidez.');
  }
}
function labWellList(dispData, lv){
  const ws = dispData.map((d,i)=>({d,i})).filter(o=>o.d.b && lv[o.i]===0);
  if(!ws.length) return `<div class="lab-note"><b>Calage.</b> Aucun puits sur ce profil. Un puits foré puis calé permet d'étendre la lithologie le long de la coupe.</div>`;
  return `<div class="lab-note"><b>Calage puits-sismique.</b> ` + ws.map(o=>{ const b = o.d.b; return labCalOk(b) ? `Puits (${b.x}, ${b.y}) : <b>calé</b> ✓ ` : `Puits (${b.x}, ${b.y}) : <button class="lab-pick" onclick="labOpenCal(${b.id})">caler</button> `; }).join(' · ') + `<br>Un puits non calé ne dévoile que sa propre colonne. Calé, il étend sa lithologie aux blocs voisins du profil (jusqu'aux failles et aux limites de province).</div>`;
}
"""
rep("function renderSection(){", PHASE3_JS + "\nfunction renderSection(){")
rep("    month:0, speed:1, paused:false, labPick:null,", "    month:0, speed:1, paused:false, labPick:null, labCal:{},")
rep("if(bd.b && labDrilled(bd.b)){ lv[i] = 0; dr.push(i); }", "if(bd.b && labDrilled(bd.b)){ lv[i] = 0; if(labCalOk(bd.b)) dr.push(i); }")
rep("""<div class="lab-note"><b>Quel horizon est le réservoir ?</b>""", """${labWellList(dispData, labLv)}<div class="lab-note"><b>Quel horizon est le réservoir ?</b>""")
rep("""  if(G.labPick==null && ranked.length){
    return {cur:4,""", """  { const unc = prof.map(o=>o.b).find(b=>labDrilled(b) && !labCalOk(b));
    if(unc) return {cur:4, text:`Le puits (${unc.x}, ${unc.y}) n'est pas calé sur la sismique. Calez-le : sa lithologie se propagera alors sur le profil et vous gagnerez ${formatM(LAB_CAL_BONUS)}.`,
            act:{label:`Caler le puits (${unc.x}, ${unc.y})`, call:`labOpenCal(${unc.id})`, ok:true}}; }
  if(G.labPick==null && ranked.length){
    return {cur:4,""")
rep(""".lab-mut{color:var(--muted);}""", """.lab-mut{color:var(--muted);}
#labCalModal{position:fixed;inset:0;z-index:1350;background:rgba(0,0,0,.55);display:none;align-items:center;justify-content:center;padding:14px;}
#labCalModal.open{display:flex;}
.lab-cal-box{background:var(--panel);color:var(--text);border-radius:10px;padding:14px;max-width:560px;width:100%;max-height:96vh;overflow:auto;box-shadow:0 10px 40px rgba(0,0,0,.4);}""")
rep("""<b>LABO sismique, phase 2</b> : la sismique ne montre plus les roches ni le réservoir. Désignez votre cible sur la coupe, forez, loguez.""", """<b>LABO sismique, phase 3</b> : la sismique ne montre plus les roches ni le réservoir. Désignez votre cible, forez, loguez, puis calez le puits sur la sismique pour étendre la lithologie.""")


# ====================== PHASE 4 : options de partie + sondage stratigraphique ======================
PHASE4_JS = r"""
// ---------- OPTIONS DU LABO (écran avant la partie, verrouillables) + SONDAGE STRATIGRAPHIQUE ----------
const LAB_DEFAULT_OPT = { mute:true, pick:true, cal:true, strati:true, cheat:true, locked:false };
const LAB_PRESETS = {
  decouverte: { label:'Découverte', d:'Coupe lisible comme dans le jeu principal, aucune contrainte.', o:{ mute:false, pick:false, cal:false, strati:true, cheat:true } },
  inter:      { label:'Intermédiaire', d:'Sismique muette et cible à désigner, calage non exigé.', o:{ mute:true, pick:true, cal:false, strati:true, cheat:true } },
  complet:    { label:'Labo complet', d:'Toutes les règles du labo, bouton « vérité » disponible.', o:{ mute:true, pick:true, cal:true, strati:true, cheat:true } },
  expert:     { label:'Expert', d:'Toutes les règles, sans bouton « vérité ».', o:{ mute:true, pick:true, cal:true, strati:true, cheat:false } },
};
let LABOPT = { ...LAB_DEFAULT_OPT };
try { const r = JSON.parse(localStorage.getItem('geoexplorer_labopt')||'null'); if(r && typeof r==='object') LABOPT = { ...LAB_DEFAULT_OPT, ...r, locked:false }; } catch(e){}
function labNormOpt(o){ const n = { ...LAB_DEFAULT_OPT, ...o }; if(!n.mute) n.cal = false; if(n.locked) n.cheat = false; return n; }
function labApplyOpt(){
  const tb = document.getElementById('labTruthBtn'), ob = document.getElementById('labOptBtn');
  if(tb) tb.style.display = (LABOPT.cheat && !LABOPT.locked) ? '' : 'none';
  if(ob) ob.style.display = LABOPT.locked ? 'none' : '';
  if(!LABOPT.cheat || LABOPT.locked) LAB.truth = false;
}
let labOptDraft = null, labOptMode = 'start';
function labOptOpen(mode){
  labOptMode = mode; labOptDraft = { ...LABOPT, locked:false };
  let el = document.getElementById('labOptModal');
  if(!el){ el = document.createElement('div'); el.id = 'labOptModal'; document.body.appendChild(el); }
  el.classList.add('open'); labOptRender();
}
function labOptClose(){ const el = document.getElementById('labOptModal'); if(el) el.classList.remove('open'); }
function labOptSet(k, v){ labOptDraft[k] = v; if(k==='mute' && !v) labOptDraft.cal = false; labOptRender(); }
function labOptPreset(k){ labOptDraft = { ...labOptDraft, ...LAB_PRESETS[k].o }; labOptRender(); }
function labOptRender(){
  const el = document.getElementById('labOptModal'); if(!el) return; const o = labOptDraft;
  const row = (k, titre, desc, dis) => `<label class="lab-opt-row ${dis?'dis':''}"><input type="checkbox" ${o[k]?'checked':''} ${dis?'disabled':''} onchange="labOptSet('${k}', this.checked)"><span><b>${titre}</b><br><span class="lab-mut">${desc}</span></span></label>`;
  el.innerHTML = `<div class="lab-cal-box"><b style="font-size:15px;">Options de la partie</b>
    <div class="lab-note" style="margin-top:2px;">Réglez les règles du labo avant de commencer. Vous pouvez les verrouiller pour toute la partie.</div>
    <div class="lab-chips">${Object.entries(LAB_PRESETS).map(([k,p])=>`<button class="lab-pick" title="${p.d}" onclick="labOptPreset('${k}')">${p.label}</button>`).join('')}</div>
    ${row('mute', 'Sismique muette', 'La sismique ne montre que des contrastes (bleu : l\'impédance augmente, rouge : elle diminue), jamais les roches. La lithologie n\'apparaît sur la coupe qu\'après un forage et un log. Désactivée : la coupe affiche les lithologies comme dans le jeu principal.')}
    ${row('pick', 'Désigner la cible soi-même', 'Le jeu ne dit pas quel horizon est le réservoir. Il faut le viser sur la coupe avant de forer : un mauvais choix donne un puits sec, un bon choix rapporte un bonus.')}
    ${row('cal', 'Calage puits-sismique obligatoire', 'Un puits ne propage sa lithologie le long du profil qu\'une fois calé (mini-jeu vitesse moyenne). Sans calage, il ne dévoile que sa propre colonne. Demande la sismique muette.', !o.mute)}
    ${row('strati', 'Sondage stratigraphique disponible', 'Forage carotté moins cher (environ 30 % d\'un forage classique), qui donne le log et la lithologie mais ne peut jamais produire.')}
    ${row('cheat', 'Bouton « Voir la vérité » (triche)', 'Affiche la vraie coupe géologique à tout moment.')}
    <label class="lab-opt-row" style="border-top:1px solid var(--line);margin-top:6px;padding-top:8px;"><input type="checkbox" ${o.locked?'checked':''} onchange="labOptSet('locked', this.checked)"><span><b>🔒 Verrouiller ces options</b><br><span class="lab-mut">Aucune modification possible en cours de partie, et le bouton « vérité » est retiré.</span></span></label>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px;"><button class="lab-pick" onclick="labOptCancel()">${labOptMode==='start'?'Retour':'Annuler'}</button><button class="lab-pick sel" id="labOptGo" onclick="labOptValidate()">${labOptMode==='start'?'Lancer la partie':'Appliquer'}</button></div></div>`;
}
function labOptCancel(){ labOptClose(); }
function labOptValidate(){
  LABOPT = labNormOpt(labOptDraft);
  try { localStorage.setItem('geoexplorer_labopt', JSON.stringify({ ...LABOPT, locked:false })); } catch(e){}
  labOptClose();
  if(labOptMode==='start'){ labOptLaunch(); return; }
  G.labOpt = { ...LABOPT }; labApplyOpt();
  addLog('⚙ Options du labo modifiées' + (LABOPT.locked ? ' et verrouillées.' : '.'), 'ev');
  renderSection(); if(selectedBlock!==null){ renderGeoPanel(blocks[selectedBlock]); renderStudiesPanel(blocks[selectedBlock]); }
  if(typeof renderGuide==='function') renderGuide(); if(typeof bigView!=='undefined' && bigView.open) bvRender();
}
// profondeur de réservoir montrée au joueur
function labShownDepth(b){
  if(G.labPick!=null) return labPickDepth(b);
  if(LABOPT.pick && LABOPT.mute) return null;
  return b.estimate?.depth ?? null;
}
// Sondage stratigraphique : log et carottes, aucune production possible, la probabilité de succès n'est pas révélée
function labInjectStratiLog(b){
  if(b.studies.some(s=>s.type==='welllog')) return;
  const e = b.estimate || {};
  b.studies.push({type:'welllog', cost:0, result:{
    topReservoirEst: b.topOfReservoir, topErr:0,
    probEst: e.prob, probErr: e.probErr, qualityEst: e.quality, qualErr: e.qualErr,
    horizonsPartial: b.horizons.map(h=>({...h, topEst:h.top, porosityEst:h.porosity, hcShow:false})),
    maturityClass: b.maturityClass, tempAtRes:b.tempAtRes, pressureRes:b.pressureRes, isGas:b.isGas,
  }, month:G.month, revealed:true});
  b.studyLevel = Math.max(b.studyLevel, 3);
}
function labResolveStrati(d){
  const b = blocks[d.blockId]; b.el?.classList.remove('drilling');
  b.strati = true; labInjectStratiLog(b); updateBlockEstimate(b);
  addLog(`🧪 Sondage stratigraphique terminé : bloc (${b.x},${b.y}). Log et carottes récupérés, lithologie de la colonne dévoilée.`, 'good');
  const html = `Le sondage a traversé la colonne et ramené la lithologie. Il ne peut pas produire et ne dit rien sur la présence d'hydrocarbures.` + (LABOPT.cal && LABOPT.mute && !labCalOk(b) ? ` Calez-le sur la sismique pour étendre la lithologie le long du profil.` : '') + ` Le bloc reste forable.`;
  renderBlock(b); updateHud();
  if(selectedBlock===d.blockId){ renderGeoPanel(b); renderStudiesPanel(b); }
  showDrillReveal(b, false, true, 'strati', html);
}
"""
rep("const LAB = { truth:false, freq:28 };", PHASE4_JS + "\nconst LAB = { truth:false, freq:28 };")
rep("const labDrilled = b => !!(b && (b.well || b.dryHole));", "const labDrilled = b => !!(b && (b.well || b.dryHole || b.strati));")
rep("const labCalOk = b => !!(b && (G.mode==='sandbox' || (G.labCal && G.labCal[b.id])));", "const labCalOk = b => !!(b && (G.mode==='sandbox' || !LABOPT.cal || (G.labCal && G.labCal[b.id])));")
rep("  const LAB_ON = !LAB.truth;", "  const LAB_ON = !LAB.truth && LABOPT.mute;")
rep("  if(LAB_ON){\n    const ip = document.getElementById('sectionInterpret');", "  if(LAB_ON || (!LAB.truth && (LABOPT.pick || LABOPT.cal))){\n    const ip = document.getElementById('sectionInterpret');")
rep("  if(LAB_ON && G.labPick!=null){", "  if(!LAB.truth && G.labPick!=null){")
rep("function renderSection(){", "function renderSection(){\n  labApplyOpt();")
# cible obligatoire ou non
rep("if(G.labPick==null && G.mode!=='sandbox'){ const m =", "if(G.labPick==null && LABOPT.pick && method!=='strati' && G.mode!=='sandbox'){ const m =")
rep("  if(G.labPick==null && ranked.length){\n    return {cur:4,", "  if(G.labPick==null && LABOPT.pick && ranked.length){\n    return {cur:4,")
# profondeur montrée
rep("    const pd = labPickDepth(b);\n    out.push({n:'Réservoir', st:'ind', t: G.labPick==null ?", "    const pd = labShownDepth(b);\n    out.push({n:'Réservoir', st:'ind', t: (G.labPick==null && pd!==null) ? `Horizon vers ${Math.round(pd)} m ± ${Math.round(e.depthErr)} m.` : G.labPick==null ?")
rep("{ const pd = labPickDepth(b); if(pd!==null) h+=", "{ const pd = labShownDepth(b); if(pd!==null) h+=")
rep("Prof. cible H${G.labPick+1}", "${G.labPick==null?'Prof. réservoir':'Prof. cible H'+(G.labPick+1)}")
# liste des puits à caler
rep("const ws = dispData.map((d,i)=>({d,i})).filter(o=>o.d.b && lv[o.i]===0);\n  if(!ws.length)", "if(!LABOPT.cal) return '';\n  const ws = dispData.map((d,i)=>({d,i})).filter(o=>o.d.b && labDrilled(o.d.b));\n  if(!ws.length)")
# sondage stratigraphique
rep("  horizontal: {label:'Horizontal', costMult:1.8, prodMult:1.7},\n};", "  horizontal: {label:'Horizontal', costMult:1.8, prodMult:1.7},\n  strati:     {label:'Sondage stratigraphique (carotte + log, sans production)', costMult:0.3, prodMult:0},\n};")
rep("${Object.entries(METHODS).map(([k,m])=>`<option", "${Object.entries(METHODS).filter(([k])=>k!=='strati'||LABOPT.strati).map(([k,m])=>`<option")
rep("  // Estimation de rentabilité\n", "  if(method==='strati'){\n    summary.innerHTML=`<div class=\"tr\"><span class=\"tl\">Coût du sondage</span><span>${G.mode==='sandbox'?'Gratuit':formatM(cost)}${b.isOffshore?' (offshore)':''}</span></div><div class=\"ds-warn\" style=\"margin-top:4px;\">Carottes et log : la lithologie de la colonne est dévoilée. Aucune production possible, aucune information sur les hydrocarbures. Le bloc reste forable ensuite.</div>`;\n    if(drillBtn) drillBtn.disabled=!canAfford;\n    return;\n  }\n  // Estimation de rentabilité\n")
rep("  const drillingMonths = Math.max(2, Math.round(depth/600));", "  const drillingMonths = method==='strati' ? Math.max(1, Math.round(depth/1200)) : Math.max(2, Math.round(depth/600));")
rep("  if(d.sidetrack) return resolveSidetrack(d);", "  if(d.sidetrack) return resolveSidetrack(d);\n  if(d.method==='strati') return labResolveStrati(d);")
rep("  addLog(`⏳ Forage lancé : bloc (${b.x},${b.y}), prof. estimée", "  if(method==='strati') addLog(`🧪 Sondage stratigraphique lancé : bloc (${b.x},${b.y}).`, 'ev');\n  addLog(`⏳ Forage lancé : bloc (${b.x},${b.y}), prof. estimée")
rep("  const {b, geoOk, techOk, limitingFactor, calibHtml} = next;", "  const {b, geoOk, techOk, limitingFactor, calibHtml} = next;")
rep("    icon.classList.remove('pulse');\n    const success = geoOk && techOk;", "    icon.classList.remove('pulse');\n    if(limitingFactor==='strati'){ icon.textContent='🧪'; title.textContent='SONDAGE TERMINÉ'; title.style.color='var(--text)'; sub.textContent='Carottes et log récupérés'; detail.innerHTML = calibHtml; closeBtn.style.display=''; return; }\n    const success = geoOk && techOk;")
# démarrage : écran d'options
rep("document.getElementById('startBtn').addEventListener('click',()=>{\n  const seedVal = document.getElementById('geoSeed')?.value.trim();\n  menuConfig.seed = seedVal ? (parseInt(seedVal)||seedVal) : null;\n  document.getElementById('menu').classList.add('hidden');\n  startGame();\n});", "document.getElementById('startBtn').addEventListener('click',()=>{ labOptOpen('start'); });\nfunction labOptLaunch(){\n  const seedVal = document.getElementById('geoSeed')?.value.trim();\n  menuConfig.seed = seedVal ? (parseInt(seedVal)||seedVal) : null;\n  document.getElementById('menu').classList.add('hidden');\n  startGame();\n}")
rep("    month:0, speed:1, paused:false, labPick:null, labCal:{},", "    month:0, speed:1, paused:false, labPick:null, labCal:{}, labOpt:{ ...LABOPT },")
rep("  Object.assign(G, payload.G);\n", "  Object.assign(G, payload.G);\n  if(G.labOpt) LABOPT = labNormOpt(G.labOpt); else LABOPT = { ...LAB_DEFAULT_OPT };\n")
rep("renderSection();\">👁 Voir la vérité (triche)</button></div>", "renderSection();\">👁 Voir la vérité (triche)</button> <button class=\"study-btn study-btn-compact\" id=\"labOptBtn\" onclick=\"labOptOpen('game')\">⚙ Options</button></div>")
rep(""".lab-mut{color:var(--muted);}""", """.lab-mut{color:var(--muted);}
#labOptModal{position:fixed;inset:0;z-index:1360;background:rgba(0,0,0,.55);display:none;align-items:center;justify-content:center;padding:14px;}
#labOptModal.open{display:flex;}
.lab-opt-row{display:flex;gap:9px;align-items:flex-start;font-size:12px;line-height:1.45;padding:6px 0;cursor:pointer;}
.lab-opt-row.dis{opacity:.45;cursor:default;}
.lab-opt-row input{margin-top:3px;flex:none;}
.lab-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 4px;}""")


# ====================== PHASE 5 : indices directs de fluides + imagerie réaliste ======================
PHASE5_JS = r"""
// ---------- Indices directs de fluides (DHI) et imagerie réaliste ----------
const LAB_PROC_COST = 60000;
const labSecKey = () => G.sectionA + '-' + G.sectionB;
function labProcQ(){ if(!LABOPT.real) return 1; if(G.labProc && G.labProc[labSecKey()]) return 1; return 0.35 + 0.55*labHash((G.sectionA||0)*31 + (G.sectionB||0)*17 + 3); }
function labProcLabel(q){ return q>=0.95 ? 'optimal' : q>=0.7 ? 'bon' : q>=0.5 ? 'moyen' : 'médiocre'; }
function labReprocess(){
  const k = labSecKey(); if(G.labProc && G.labProc[k]) return;
  if(G.mode!=='sandbox' && G.budget < LAB_PROC_COST){ toast('Budget insuffisant pour retraiter la sismique.'); return; }
  if(G.mode!=='sandbox') G.budget -= LAB_PROC_COST;
  G.labProc = G.labProc || {}; G.labProc[k] = true;
  addLog('🛠 Sismique du profil retraitée (-' + formatM(LAB_PROC_COST) + ') : meilleure résolution, moins de bruit.', 'ev');
  updateHud(); renderSection(); if(typeof bigView!=='undefined' && bigView.open) bvRender();
}
function labProcHtml(){
  if(!LABOPT.real) return '';
  const q = labProcQ();
  return `<div class="lab-note"><b>Traitement de cette sismique : ${labProcLabel(q)}.</b> ` + (q<0.95 ? `Une mauvaise qualité donne moins de résolution et plus de bruit, surtout en profondeur. <button class="lab-pick" onclick="labReprocess()">Retraiter · ${G.mode==='sandbox'?'gratuit':formatM(LAB_PROC_COST)}</button>` : `Résolution et bruit au meilleur niveau possible.`) + `</div>`;
}
function labRealNote(){
  if(!LABOPT.real && !LABOPT.dhi) return '';
  return `<div class="lab-note"><b>Lire l'image.</b> ` + (LABOPT.real ? `Plus on descend, plus l'image est bruitée et faible. Un <b>multiple</b> est un faux réflecteur : il reproduit un contraste fort et proche de la surface au double de sa profondeur, avec la polarité inversée. Avant de pointer un horizon profond, vérifiez qu'il n'est pas le multiple d'un horizon superficiel. L'axe de droite donne le temps double en millisecondes. ` : '') + (LABOPT.dhi ? `Une <b>tache brillante</b> (amplitude anormalement forte sur un horizon, surtout là où une sismique 3D a été faite) peut signaler du gaz ou de l'huile. Elle peut aussi venir de charbon, d'un calcaire serré ou d'un faux signal : la sismique 3D ne donne plus qu'une classe d'anomalie, à croiser avec le reste.` : '') + `</div>`;
}
// temps double moyen en millisecondes en fonction de la profondeur (modèle de vitesse moyen du profil)
function labTwtFn(dispData){
  const nL = STRAT.length, rows = [];
  for(let li=0; li<nL; li++){ let n=0, top=0, th=0, v=0;
    dispData.forEach(bd=>{ if(!bd.layers) return; const l = bd.layers[li], h = bd.b.horizons[li]; if(!l || !h || l.thickness<1) return; n++; top += l.top; th += l.thickness; v += labAcoustic(h, l.top + l.thickness/2).v; });
    if(n) rows.push({top:top/n, th:th/n, v:v/n}); }
  rows.sort((a,b)=>a.top-b.top); if(!rows.length) return z=>2000*z/3000;
  return z => { let t = 2*Math.min(z, rows[0].top)/rows[0].v; rows.forEach(r=>{ const d = Math.max(0, Math.min(z - r.top, r.th)); t += 2*d/r.v; }); const last = rows[rows.length-1], zb = last.top + last.th; if(z>zb) t += 2*(z-zb)/last.v; return t*1000; };
}
"""
rep("const LAB = { truth:false, freq:28 };", PHASE5_JS + "\nconst LAB = { truth:false, freq:28 };")
# options
rep("const LAB_DEFAULT_OPT = { mute:true, pick:true, cal:true, strati:true, cheat:true, locked:false };", "const LAB_DEFAULT_OPT = { mute:true, pick:true, cal:true, strati:true, dhi:true, real:true, cheat:true, locked:false };")
rep("o:{ mute:false, pick:false, cal:false, strati:true, cheat:true } }", "o:{ mute:false, pick:false, cal:false, strati:true, dhi:false, real:false, cheat:true } }")
rep("o:{ mute:true, pick:true, cal:false, strati:true, cheat:true } }", "o:{ mute:true, pick:true, cal:false, strati:true, dhi:false, real:false, cheat:true } }")
rep("o:{ mute:true, pick:true, cal:true, strati:true, cheat:true } }", "o:{ mute:true, pick:true, cal:true, strati:true, dhi:true, real:true, cheat:true } }")
rep("o:{ mute:true, pick:true, cal:true, strati:true, cheat:false } }", "o:{ mute:true, pick:true, cal:true, strati:true, dhi:true, real:true, cheat:false } }")
rep("    ${row('cheat', 'Bouton « Voir la vérité » (triche)'", "    ${row('dhi', 'Indices de fluides à interpréter', 'La sismique 3D ne donne plus un pourcentage précis mais une classe d\\'anomalie d\\'amplitude (nulle, faible, modérée, forte), visible sur la coupe comme une tache brillante. Les faux positifs existent : gaz, charbon, calcaire serré.')}\n    ${row('real', 'Imagerie sismique réaliste', 'Bruit croissant avec la profondeur, multiples (faux réflecteurs), qualité de traitement variable selon la ligne (retraitement payant), axe de temps double en ms.')}\n    ${row('cheat', 'Bouton « Voir la vérité » (triche)'")
# estimation coarse
rep("  b.estimate = Object.keys(est).length ? est : null;\n}", "  if(LABOPT.dhi && !logStudy && seis3dStudy && est.prob!==undefined){\n    const pf = est.prob, cls = pf<0.08?0:pf<0.18?1:pf<0.32?2:3;\n    est.probFine = pf; est.dhiClass = cls; est.prob = [0.04,0.13,0.25,0.42][cls]; est.probErr = 0.08;\n    est.amplitude = ['pas d\\'anomalie d\\'amplitude','faible anomalie d\\'amplitude','anomalie d\\'amplitude modérée','forte anomalie d\\'amplitude (tache brillante)'][cls];\n  }\n  b.estimate = Object.keys(est).length ? est : null;\n}")
# image : fréquence, bruit, atténuation, multiples, tache brillante
rep("  const f = LAB.freq;\n  // couches par bloc", "  const Q = labProcQ(), f = LABOPT.real ? 20 + 10*Q : LAB.freq, resLi = STRAT.findIndex(l=>l.role==='reservoir');\n  const sBlk = idx.map(i=>{ const bb = dispData[i].b; const pf = bb && bb.estimate && bb.estimate.probFine!==undefined ? bb.estimate.probFine : null; return (LABOPT.dhi && pf!==null) ? clamp((pf-0.08)/0.35, 0, 1) : 0; });\n  // couches par bloc")
rep("      if(base-top < 1) continue; layers.push({top, base, a});", "      if(base-top < 1) continue; layers.push({top, base, a, li});")
rep("    for(let k=1;k<layers.length;k++){\n      const A = layers[k-1].a, B = layers[k].a, R = (B.z-A.z)/(B.z+A.z), z0 = layers[k].top, V = (A.v+B.v)/2;", "    const sCol = sBlk.length ? labInterp(sBlk, ts, t) : 0; let mult = null;\n    for(let k=1;k<layers.length;k++){\n      const A = layers[k-1].a, B = layers[k].a, z0 = layers[k].top, V = (A.v+B.v)/2;\n      let R = (B.z-A.z)/(B.z+A.z);\n      if(layers[k].li===resLi && sCol>0.001) R = R*(1+1.4*sCol) - 0.4*sCol; // tache brillante : l'impédance chute au toit du réservoir chargé\n      if(LABOPT.real){ R *= Math.exp(-(z0-dMin)/4200); if(z0 < dMin + 0.45*(dMax-dMin) && (!mult || Math.abs(R)>Math.abs(mult.R))) mult = {R, z0, V}; }")
rep("  // normalisation sur le 97e centile", "  // (les multiples sont ajoutés dans la boucle colonne ci-dessous)\n  // normalisation sur le 97e centile")
# ajouter le multiple à la fin de la boucle des interfaces : on le fait juste après la fin du for k
rep("      for(let j=Math.max(0,c0-half); j<=Math.min(nz-1,c0+half); j++){ const dzm = (j-c0)*dz; amp[c*nz+j] += R*ricker(2*dzm/V); }\n    }", "      for(let j=Math.max(0,c0-half); j<=Math.min(nz-1,c0+half); j++){ const dzm = (j-c0)*dz; amp[c*nz+j] += R*ricker(2*dzm/V); }\n    }\n    if(LABOPT.real && mult && Math.abs(mult.R) > 0.10){ const zm = dMin + 2*(mult.z0 - dMin), Rm = -mult.R*Math.abs(mult.R)*2.2, V = mult.V;\n      if(zm < dMax){ const half = Math.min(nz, Math.ceil(V/(2*f)*1.6/dz)), c0 = Math.round((zm-dMin)/dz); for(let j=Math.max(0,c0-half); j<=Math.min(nz-1,c0+half); j++){ const dzm = (j-c0)*dz; amp[c*nz+j] += Rm*ricker(2*dzm/V); } } }")
rep("  const noiseAmp = 0.07*(typeof uncertaintyMult==='function' ? uncertaintyMult() : 1);", "  const noiseAmp = 0.07*(typeof uncertaintyMult==='function' ? uncertaintyMult() : 1)*(LABOPT.real ? 2.0*(1.7 - 0.9*Q) : 1);")
rep("    const v = clamp(amp[c*nz+j]/ref*1.05 + n, -1, 1);", "    const v = clamp(amp[c*nz+j]/ref*(LABOPT.dhi ? 0.72 : 1.05) + n, -1, 1);")
rep("    const n = nz2(c, j)*noiseAmp*2;", "    const n = nz2(c, j)*noiseAmp*2*(LABOPT.real ? (0.55 + 1.2*j/nz) : 1);")
# panneau d'interprétation
rep("${labWellList(dispData, labLv)}<div class=\"lab-note\"><b>Quel horizon est le réservoir ?</b>", "${labWellList(dispData, labLv)}${labProcHtml()}${labRealNote()}<div class=\"lab-note\"><b>Quel horizon est le réservoir ?</b>")
rep("    month:0, speed:1, paused:false, labPick:null, labCal:{}, labOpt:{ ...LABOPT },", "    month:0, speed:1, paused:false, labPick:null, labCal:{}, labProc:{}, labOpt:{ ...LABOPT },")
# axe de temps double à droite
rep("  // Surface\n  const ySurf = yOf(0);", "  if(LAB_ON && LABOPT.real){ const twt = labTwtFn(dispData); const tTop = twt(dMin), tBot = twt(dMax); svg += `<text x=\"${MARG.l+PW+4}\" y=\"${MARG.t-8}\" font-size=\"7\" fill=\"var(--muted)\">ms</text>`;\n    for(let ms = Math.ceil(tTop/200)*200; ms < tBot; ms += 200){ let lo = dMin, hi = dMax; for(let it=0; it<24; it++){ const mid = (lo+hi)/2; if(twt(mid) < ms) lo = mid; else hi = mid; } const y = yOf((lo+hi)/2); if(y<MARG.t || y>MARG.t+PH) continue; svg += `<line x1=\"${MARG.l+PW}\" y1=\"${y.toFixed(1)}\" x2=\"${MARG.l+PW+3}\" y2=\"${y.toFixed(1)}\" stroke=\"var(--line)\"/><text x=\"${MARG.l+PW+5}\" y=\"${(y+3).toFixed(1)}\" font-size=\"7\" fill=\"var(--muted)\">${ms}</text>`; } }\n  // Surface\n  const ySurf = yOf(0);")
rep("<b>LABO sismique, phase 3</b>", "<b>LABO sismique, phase 4</b>")


# ====================== PHASE 5 : trait de coupe cliquable sur la carte + finance dans les options ======================
PHASE6_JS = r"""
// ---------- Trait de coupe cliquable sur la carte (flèche A vers B) ----------
function labDrawSecLine(){
  const grid = document.getElementById('grid'); if(!grid) return;
  let svg = document.getElementById('secLineSvg');
  if(G.sectionA==null || G.sectionB==null || grid.offsetParent===null){ if(svg) svg.remove(); return; }
  const ea = grid.querySelector(`.block[data-id="${G.sectionA}"]`), eb = grid.querySelector(`.block[data-id="${G.sectionB}"]`);
  if(!ea || !eb){ if(svg) svg.remove(); return; }
  const NS = 'http://www.w3.org/2000/svg';
  if(!svg){ svg = document.createElementNS(NS, 'svg'); svg.id = 'secLineSvg'; }
  if(svg.parentNode !== grid) grid.appendChild(svg);
  svg.setAttribute('width', grid.scrollWidth); svg.setAttribute('height', grid.scrollHeight);
  const c = e => ({ x: e.offsetLeft + e.offsetWidth/2, y: e.offsetTop + e.offsetHeight/2 });
  const A = c(ea), B = c(eb), dx = B.x-A.x, dy = B.y-A.y, len = Math.hypot(dx, dy) || 1, u = { x:dx/len, y:dy/len };
  const off = Math.min(len*0.4, ea.offsetWidth*0.34);
  const x1 = A.x + u.x*off, y1 = A.y + u.y*off, x2 = B.x - u.x*off, y2 = B.y - u.y*off;
  const a = blocks[G.sectionA], b = blocks[G.sectionB];
  svg.innerHTML = `<defs><marker id="secArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--amber)"/></marker></defs>
    <line class="hit" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="transparent" stroke-width="18" stroke-linecap="round"><title>Coupe A (${a.x}, ${a.y}) vers B (${b.x}, ${b.y}) : cliquer pour revoir la coupe</title></line>
    <line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="var(--amber)" stroke-width="3" stroke-linecap="round" marker-end="url(#secArrow)" opacity=".92" pointer-events="none"/>`;
  svg.querySelector('.hit').addEventListener('click', ev=>{ ev.stopPropagation(); labGoSection(); renderSection(); });
}
"""
rep("function rerenderAllBlocks(){\n  applyGridTemplate();\n  blocks.forEach(renderBlock);\n  if(typeof renderGuide==='function') renderGuide();\n}", PHASE6_JS + "\nfunction rerenderAllBlocks(){\n  applyGridTemplate();\n  blocks.forEach(renderBlock);\n  labDrawSecLine();\n  if(typeof renderGuide==='function') renderGuide();\n}")
rep("  if(name!=='map') switchTab(name);\n  renderMobileSheet();", "  if(name!=='map') switchTab(name);\n  renderMobileSheet();\n  if(name==='map') labDrawSecLine();")
rep(".grid{display:grid; gap:2px; width:fit-content;}", ".grid{display:grid; gap:2px; width:fit-content; position:relative;}\n#secLineSvg{position:absolute;left:0;top:0;pointer-events:none;overflow:visible;z-index:6;}\n#secLineSvg .hit{pointer-events:stroke;cursor:pointer;}")
# finance dans les options de la partie
rep("const LAB_DEFAULT_OPT = { mute:true,", "const LAB_DEFAULT_OPT = { finance:true, mute:true,")
rep("  labOptMode = mode; labOptDraft = { ...LABOPT, locked:false };", "  labOptMode = mode; labOptDraft = { ...LABOPT, locked:false, finance: mode==='start' ? !!menuConfig.financeMode : !!G.financeMode };")
rep("    ${row('mute', 'Sismique muette',", "    ${row('finance', 'Mode finance', 'Emprunts, stockage du pétrole, couverture du prix (hedging), récupération assistée, accidents. ' + (labOptMode==='start' ? 'Désactivé : partie centrée sur la géologie et le budget.' : 'Choisi au lancement : non modifiable en cours de partie.'), labOptMode!=='start')}\n    ${row('mute', 'Sismique muette',")
rep("  LABOPT = labNormOpt(labOptDraft);\n", "  LABOPT = labNormOpt(labOptDraft);\n  if(labOptMode==='start') menuConfig.financeMode = !!LABOPT.finance; else LABOPT.finance = !!G.financeMode;\n")


# ====================== Trait de coupe : case à cocher, conservation pendant une nouvelle coupe ======================
rep("function labDrawSecLine(){\n  const grid = document.getElementById('grid'); if(!grid) return;\n  let svg = document.getElementById('secLineSvg');\n  if(G.sectionA==null || G.sectionB==null || grid.offsetParent===null){ if(svg) svg.remove(); return; }\n  const ea = grid.querySelector(`.block[data-id=\"${G.sectionA}\"]`), eb = grid.querySelector(`.block[data-id=\"${G.sectionB}\"]`);",
"""let LAB_SECLINE = true;
try { if(localStorage.getItem('geoexplorer_secline')==='0') LAB_SECLINE = false; } catch(e){}
{ const c = document.getElementById('secLineChk'); if(c) c.checked = LAB_SECLINE; }
function labToggleSecLine(on){ LAB_SECLINE = !!on; try { localStorage.setItem('geoexplorer_secline', on ? '1' : '0'); } catch(e){} labDrawSecLine(); }
function labDrawSecLine(){
  const grid = document.getElementById('grid'); if(!grid) return;
  const chk = document.getElementById('secLineChk'); if(chk) chk.checked = LAB_SECLINE;
  let svg = document.getElementById('secLineSvg');
  // pendant le tracé d'une nouvelle coupe, la précédente reste affichée en pointillé
  let ia = G.sectionA, ib = G.sectionB, ghost = false;
  if((ia==null || ib==null) && G.labSecPrev){ ia = G.labSecPrev.a; ib = G.labSecPrev.b; ghost = true; }
  if(!LAB_SECLINE || ia==null || ib==null || grid.offsetParent===null){ if(svg) svg.remove(); return; }
  const ea = grid.querySelector(`.block[data-id=\"${ia}\"]`), eb = grid.querySelector(`.block[data-id=\"${ib}\"]`);""")
rep("  const a = blocks[G.sectionA], b = blocks[G.sectionB];\n  svg.innerHTML", "  const a = blocks[ia], b = blocks[ib];\n  svg.innerHTML")
rep('stroke="transparent" stroke-width="18" stroke-linecap="round"><title>Coupe A (${a.x}, ${a.y}) vers B (${b.x}, ${b.y}) : cliquer pour revoir la coupe</title></line>', 'stroke="transparent" stroke-width="10" stroke-linecap="round"><title>${ghost ? \'Coupe précédente\' : `Coupe A (${a.x}, ${a.y}) vers B (${b.x}, ${b.y}) : cliquer pour revoir la coupe`}</title></line>')
rep('marker-end="url(#secArrow)" opacity=".92" pointer-events="none"/>`;', 'marker-end="url(#secArrow)" opacity="${ghost ? .4 : .92}" ${ghost ? \'stroke-dasharray="6 5"\' : \'\'} pointer-events="none"/>`;')
rep("  svg.querySelector('.hit').addEventListener('click', ev=>{ ev.stopPropagation(); labGoSection(); renderSection(); });", "  if(ghost) svg.querySelector('.hit').style.pointerEvents = 'none';\n  else svg.querySelector('.hit').addEventListener('click', ev=>{ ev.stopPropagation(); labGoSection(); renderSection(); });")
rep("  if(name==='section'){ G.sectionA=null; G.sectionB=null; rerenderAllBlocks(); }", "  if(name==='section'){ if(G.sectionA!=null && G.sectionB!=null) G.labSecPrev = { a:G.sectionA, b:G.sectionB }; G.sectionA=null; G.sectionB=null; rerenderAllBlocks(); }")
rep("        G.sectionB=id;\n        // Le profil est posé", "        G.sectionB=id; G.labSecPrev = null;\n        // Le profil est posé")
rep("labPick:null, labCal:{}, labProc:{},", "labPick:null, labCal:{}, labProc:{}, labSecPrev:null,")
rep('        <button class="btn" id="zoomOut" aria-label="Zoom arrière">−</button>', '        <label class="lab-secchk" title="Afficher ou masquer le trait de coupe (flèche de A vers B) sur la carte"><input type="checkbox" id="secLineChk" checked onchange="labToggleSecLine(this.checked)"> Trait de coupe</label>\n        <button class="btn" id="zoomOut" aria-label="Zoom arrière">−</button>')
rep("#secLineSvg .hit{pointer-events:stroke;cursor:pointer;}", "#secLineSvg .hit{pointer-events:stroke;cursor:pointer;}\n.lab-secchk{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--muted);cursor:pointer;white-space:nowrap;margin-right:6px;}\n.lab-secchk input{margin:0;}")


rep("  setSpeed(G.paused ? 0 : (G.speed || 1));\n  if(typeof updateMobileLayoutClass==='function') updateMobileLayoutClass();\n}", "  setSpeed(G.paused ? 0 : (G.speed || 1));\n  if(typeof updateMobileLayoutClass==='function') updateMobileLayoutClass();\n  labDrawSecLine(); // le trait de coupe est redessiné après chargement\n}")

open(dst, 'w', encoding='utf-8').write(s)
print('ok', len(s))
