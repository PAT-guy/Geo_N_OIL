# Outils de test et d'équilibrage

Tests Playwright et simulateur d'équilibrage du jeu (`index.html`). Le jeu est un fichier unique édité directement.

## Historique : le labo est fusionné dans le jeu (V4.33)

Jusqu'à la V4.32, `labo-sismique.html` était généré à partir de `index.html` par `tools/archive/mklab.py`. Depuis la V4.33, ces règles font partie du jeu : `index.html` contient tout le code (objet d'options `LABOPT`, écran d'options de la partie, préréglages Découverte, Intermédiaire, Complet et Expert). `tools/archive/mklab.py` et `tools/archive/merge_labo.py` sont conservés pour l'historique seulement : ne pas les relancer sur l'index.html actuel (leurs remplacements exacts ne correspondent plus). `labo-sismique.html` n'est plus qu'une redirection vers le jeu.

Préréglage proposé par niveau (modifiable dans l'écran d'options, mémorisé par niveau) : Junior en Découverte, Senior en Intermédiaire, Grande exploration en Complet. Une sauvegarde d'avant la V4.33 se recharge en Découverte (règles d'origine).

## Tests

Les tests utilisent Playwright (Chromium) sur `index.html` et écrivent leurs captures d'écran dans le dossier courant : les lancer depuis un dossier temporaire. Ils choisissent le préréglage Complet avant de lancer la partie (le défaut du niveau Junior est Découverte).

```bash
cd /tmp && node /chemin/vers/Geo_N_OIL/tools/tests/chk_lab.js
```

- `chk_lab.js` : chargement sans erreur JS.
- `lab431.js` : désignation de la cible (phase 2).
- `lab432.js` : calage puits-sismique (phase 3).
- `lab433.js` : écran d'options, préréglages, verrouillage, sondage stratigraphique.
- `lab434.js` : indices de fluides et imagerie réaliste (phase 4).
- `lab435.js` : trait de coupe cliquable avec flèche sur la carte, finance dans les options.
- `lab436.js` : case à cocher du trait de coupe (mémorisée), coupe précédente en pointillé, blocs cliquables, rechargement.
- `lab437.js` : sondage stratigraphique avec carotte et Rock-Eval, la carotte cale le puits et double la portée de sa lithologie.
- `couche_clic.js` : clic sur une couche de la coupe du jeu principal (toit, mur, épaisseur, biseau, surlignage).
- `lab438.js` : épaisseurs variables des couches (option du labo) : variation, cohérence des piles, cartes identiques hors épaisseur.
- `coupe_points.js` : rangée de points des blocs sous la coupe (visible, cliquable), trait vertical du bloc sélectionné, forage visé dans le labo.
- `tactile_mobile.js` : téléphone simulé (iPhone 13, 390 et 360 px) : cibles tactiles >= 40 px, en-tête sans chevauchement ni rognage, guide replié par défaut, tap décalé sur un point de coupe.
- `pwa_hors_ligne.js` : installation et hors ligne : manifeste, icônes, service worker, rechargement du jeu sans réseau (serveur http local).
- `quiz_generes.js` : quiz Maturation, Rock-Eval et Sismique générés par le moteur géologique : réponse recalculable à partir des valeurs affichées, marges aux seuils, classes équilibrées, manche de 8 questions (générées + fixes), partie en cours intacte. Sismique : polarité, force de réflexion, temps double, calage, multiple, résolution, chacun recalculé depuis les valeurs affichées.
- `log_repondable.js` : mini-jeu « Lire un log » : chaque question de fluide doit être répondable avec les repères affichés (lecteur idéal : 0 erreur sur 300 logs), fluides équilibrés, tableau de valeurs lues, pas de roche répétée dans une manche.
- `minijeux_tel.js` : mini-jeux sur téléphone simulé (390, 360 et 320 px) : log avec fenêtre défilante recadrée sur A ou B, question et réponses toujours visibles, cartes du prospect en colonne, boutons >= 40 px, quiz >= 44 px ; contrôle de non-régression sur ordinateur.
- `sim_lab.js` : simulation d'équilibrage (parties de 25 ans jouées par des robots).
- `guide_plafond.js` : plafond d'études du guide (35 % du budget de départ), pari raisonné ou attente selon les puits.
- `rendement_puits.js` : rendement d'un puits productif, à terre et en mer.
- `voisinage.js` : effet de voisinage autour d'une découverte (probabilité estimée et réelle des blocs proches).
- `audit_contraste.js` : contraste du texte (WCAG AA) sur les écrans principaux, ordinateur et téléphone simulé.
- `quiz_tuto.js` : quiz sismique et tutoriel de l'accueil.
- `pret_guide.js` : emprunt (capacité, valeur nette, remboursement), bonus de cible par province, option sans limite de temps, guide (extension, emprunt).
- `alertes_prix.js` : prix de départ 80 $, alertes de prix (création, franchissement, pause, répétition, sauvegarde).
- `diag_guide.js` : le guide est-il bien calibré ? espérance de gain du guide contre espérance vraie sur les blocs étudiés en 3D.
- `fusion.js` : préréglage par niveau, Découverte par défaut, ancienne sauvegarde, redirection de l'ancien lien du labo.

## Dernier bilan d'équilibrage (`sim_lab.js`, 60 à 150 parties par cellule, junior, 25 ans)

Commande : `node tools/tests/sim_lab.js 60 decouverte,inter,complet,expert oracle,sism100,sism60,sism30,random`

- Repères conservés : le joueur qui connaît les vraies valeurs (`oracle`) gagne 55 à 57 % des parties dans tous les préréglages, le tireur au hasard 2 à 3 %.
- Le robot sismique (études puis forages d'espérance positive) gagne 6 à 8 % des parties quel que soit le préréglage (écart de plus ou moins 2 points à 150 parties) : les règles du labo ne déplacent pas l'économie pour lui. Ce robot est prudent, ce n'est pas un joueur humain.
- Désigner la mauvaise cible coûte en moyenne 0,4 à 0,6 puits par partie, car après un puits manqué le log apprend le bon horizon.
- Bonus de calage : environ 0,33 M$ par partie pour un robot à 4 puits, à comparer à l'objectif de 40 M$.
- Indices de fluides (classes au lieu du pourcentage fin) : environ 11 % de forages en moins (4,6 contre 4,1) et 24 % de puits producteurs en moins (1,7 contre 1,3) pour le robot, sans effet mesurable sur le taux de victoire.
- V4.45 (rappel léger du prix vers 80 $, `PRICE_REVERT` = 0,003, finance activée, 60 parties, Découverte) : prudent 33 %, guide 20 %, parfait 77 %, hasard 7 %. Parties de 25 ans passant plus de 5 ans sous 40 $ : 5,3 % avant, 1,4 % après (simulation du seul prix, 4000 tirages).
- Non mesuré : le sondage stratigraphique (le robot n'en tire aucun avantage), l'effet du bruit, des multiples et du retraitement (aucun effet économique dans le simulateur), la lisibilité pour un humain.
