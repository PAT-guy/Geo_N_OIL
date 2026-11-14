# Usage : python3 tools/i18n/batch.py N [TAILLE]  → écrit /tmp/i18n/batch_N.json et affiche le lot (indice | français)
import sys, json, subprocess, os
n = int(sys.argv[1]); size = int(sys.argv[2]) if len(sys.argv)>2 else 70
todo = json.loads(subprocess.run(['python3', os.path.join(os.path.dirname(__file__),'extract.py')], capture_output=True, text=True).stdout)
lot = [x['fr'] for x in todo][(n-1)*size : n*size] if False else [x['fr'] for x in todo][:size]
os.makedirs('/tmp/i18n', exist_ok=True); json.dump(lot, open(f'/tmp/i18n/batch_{n}.json','w'), ensure_ascii=False)
for i,t in enumerate(lot): print(f"{i}|{t}")
sys.stderr.write(f"{len(lot)} chaînes ; reste {len(todo)-len(lot)} après ce lot\n")
