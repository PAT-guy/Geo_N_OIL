# Outils du labo sismique

`labo-sismique.html` n'est pas édité à la main : il est généré à partir de `index.html` par un script de patchs.

## Régénérer le labo

```bash
python3 tools/mklab.py
```

Le script lit `index.html`, applique une série de remplacements exacts (`rep(ancien, nouveau)`) et écrit `labo-sismique.html`. Chaque remplacement vérifie que le texte ancien existe une seule fois. Si `index.html` change dans une zone patchée, le script s'arrête en indiquant quel remplacement a échoué : il faut alors adapter l'ancre dans `mklab.py`.

Ne jamais modifier `labo-sismique.html` directement : la prochaine régénération écraserait la modification.

## Tests

Les tests utilisent Playwright (Chromium) et écrivent leurs captures d'écran dans le dossier courant : les lancer depuis un dossier temporaire.

```bash
cd /tmp && node /chemin/vers/Geo_N_OIL/tools/tests/chk_lab.js
```

- `chk_lab.js` : chargement sans erreur JS.
- `lab430.js`, `lab430b.js` : sismique muette, dévoilement de la lithologie, recherche de fuites.
- `lab431.js` : désignation de la cible (phase 2).
- `lab432.js` : calage puits-sismique (phase 3).
- `lab433.js` : écran d'options, préréglages, verrouillage, sondage stratigraphique.
- `lab434.js` : indices de fluides et imagerie réaliste (phase 4).
- `sim_lab.js` : simulation d'équilibrage (parties de 25 ans jouées par des robots).

## Dernier bilan d'équilibrage (`sim_lab.js`, 60 à 150 parties par cellule, junior, 25 ans)

Commande : `node tools/tests/sim_lab.js 60 decouverte,inter,complet,expert oracle,sism100,sism60,sism30,random`

- Repères conservés : le joueur qui connaît les vraies valeurs (`oracle`) gagne 55 à 57 % des parties dans tous les préréglages, le tireur au hasard 2 à 3 %.
- Le robot sismique (études puis forages d'espérance positive) gagne 6 à 8 % des parties quel que soit le préréglage (écart de plus ou moins 2 points à 150 parties) : les règles du labo ne déplacent pas l'économie pour lui. Ce robot est prudent, ce n'est pas un joueur humain.
- Désigner la mauvaise cible coûte en moyenne 0,4 à 0,6 puits par partie, car après un puits manqué le log apprend le bon horizon.
- Bonus de calage : environ 0,33 M$ par partie pour un robot à 4 puits, à comparer à l'objectif de 40 M$.
- Indices de fluides (classes au lieu du pourcentage fin) : environ 11 % de forages en moins (4,6 contre 4,1) et 24 % de puits producteurs en moins (1,7 contre 1,3) pour le robot, sans effet mesurable sur le taux de victoire.
- Non mesuré : le sondage stratigraphique (le robot n'en tire aucun avantage), l'effet du bruit, des multiples et du retraitement (aucun effet économique dans le simulateur), la lisibilité pour un humain.
