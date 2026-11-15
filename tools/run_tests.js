#!/usr/bin/env node
// Lance tous les tests de tools/tests un par un (jamais en parallèle : la charge CPU rend les tests de navigateur instables) et donne un verdict par test.
// Usage : node tools/run_tests.js [--only mot] [--skip mot] [--liste]
//  - un test « à verdict » se termine par TOUT OK (code de sortie 0) ou ECHECS ;
//  - un test « d'observation » (JSON sans verdict) échoue si son code de sortie est non nul, s'il imprime ECHEC, ou si sa liste d'erreurs n'est pas vide ;
//  - les mesures (MESURES) tournent mais ne comptent pas dans le verdict : elles servent à regarder des chiffres.
const { spawnSync } = require('child_process'); const fs = require('fs'); const path = require('path');
const DIR = path.join(__dirname, 'tests'), MESURES = new Set(['sim_equilibrage','mesure_gisements','sim_lab','rendement_puits','diag_guide']);
const arg = n => { const i = process.argv.indexOf(n); return i>=0 ? process.argv[i+1] : null; };
const only = arg('--only'), skip = arg('--skip');
let files = fs.readdirSync(DIR).filter(f=>f.endsWith('.js') && !f.startsWith('_')).sort();
if(only) files = files.filter(f=>f.includes(only)); if(skip) files = files.filter(f=>!f.includes(skip));
if(process.argv.includes('--liste')){ files.forEach(f=>console.log(f)); process.exit(0); }
const verdict = (name, r) => {
  const out = (r.stdout||'') + (r.stderr||''); const tail = out.trim().split('\n').slice(-3).join(' | ').slice(0, 220);
  if(MESURES.has(name)) return { kind:'mesure', ok:true, tail };
  if(r.error && r.error.code==='ETIMEDOUT') return { kind:'?', ok:false, tail:'délai dépassé' };
  if(/TOUT OK/.test(out)) return { kind:'verdict', ok: r.status===0, tail: r.status===0 ? '' : tail };
  if(/ECHECS?: \d+|ECHEC /.test(out) || r.status!==0) return { kind: /ECHECS?: \d+/.test(out) ? 'verdict' : 'observation', ok:false, tail:(out.split('\n').filter(l=>/ECHEC|Error/.test(l)).slice(0,2).join(' | ') || tail).slice(0,260) };
  // observation : une liste d'erreurs non vide (« erreurs [ "…" ] », « erreurs JS [ … ] », « erreurs page: [ … ] »)
  const m = out.match(/erreurs[^\[\n]*\[([^\]]*)\]/g); if(m && m.some(x=>/\[\s*["'A-Za-z]/.test(x) && !/\[\s*\]/.test(x))) return { kind:'observation', ok:false, tail:m.find(x=>!/\[\s*\]/.test(x)).slice(0,200) };
  return { kind:'observation', ok:true, tail:'' };
};
let ko = 0, tot = 0; const t0 = Date.now(), fails = [];
for(const f of files){
  const name = f.replace(/\.js$/,''), t1 = Date.now();
  const r = spawnSync('node', [path.join(DIR,f)], { cwd: path.join(__dirname,'..'), encoding:'utf8', timeout: 420000, maxBuffer: 64*1024*1024 });
  const v = verdict(name, r), s = Math.round((Date.now()-t1)/1000);
  tot++; if(!v.ok){ ko++; fails.push(name); }
  console.log(`${v.ok ? '✓' : '✗'} ${name.padEnd(28)} ${String(s).padStart(4)} s  [${v.kind}]${v.ok || !v.tail ? '' : '  ' + v.tail}`);
}
console.log(`\n${tot-ko}/${tot} tests réussis en ${Math.round((Date.now()-t0)/1000)} s${ko ? ' ; échecs : ' + fails.join(', ') : ''}`);
process.exit(ko ? 1 : 0);
