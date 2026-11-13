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
- `rig_forage.js` : console de forage (retard de circulation, récapitulatif du projet, GR en direct, arrêt décidé au GR, aide des règles simplifiées) : physique des incidents (kick, perte, coincement, nettoyage, outil usé, tuer le puits, tubage) vérifiée sur 40 scénarios, solvabilité, trois niveaux de joueurs automatiques (bon foreur 100 %, réactif sans anticipation, ignorant 0 %), partie en cours intacte, parcours complet au doigt sur téléphone simulé.
- `rig_drain.js` : drain horizontal (géosteering) après le puits vertical : 60 scénarios (colonne d'hydrocarbures >= 18 m partout, talon dans la zone, GR et Rt contrastés, trajectoire plate qui sort entre 120 et 340 m), mesures GR et Rt conformes à la zone, pilotage limité à 2° par 10 m avec intégration cos et sin, capteurs en retard (GR 12 m, Rt 6 m), score cohérent, suiveur des diagraphies contre trajectoire horizontale (écart >= 8 points), parcours au doigt sur téléphone simulé.
- `quiz_revoir.js` : répétition espacée des quiz : une question fixe ratée revient dans chaque manche (marquée « À revoir »), une bonne réponse l'efface, les questions générées ne sont jamais mémorisées.
- Dans `log_repondable.js` (V4.61) : une question « piège » par manche (résistivité élevée dans une roche compacte), recalculée depuis les valeurs affichées.
- `defi_jour.js` : défi du jour : configuration déterministe par date, même carte à chaque lancement, record du jour mémorisé sans être écrasé, retour aux réglages du joueur, défi annulé si les réglages changent.
- `abandon_puits.js` : abandon des puits : 12 % du coût de forage à terre et 18 % en mer, payé une seule fois (fermeture ou épuisement), gratuit en bac à sable, non rétroactif, affiché dans le panneau du puits et au bilan.
- `systeme_classique.js` : dans chaque partie, au moins 25 % de la carte a une roche-mère sous le réservoir et une couverture au-dessus ; zones sans roche-mère profonde possibles mais stériles ; cas particulier (roche-mère superficielle en plus) minoritaire.
- `mesure_gisements.js` : mesure (sans verdict) de la densité et de la taille des gisements sur cartes 12, 25 et 50. Avant V4.58, un gisement sur 50×50 pouvait dépasser 100 blocs.
- `materiel_forage.js` : matériel de forage : fiabilité selon la charge (profondeur / limite) reproduite exactement par le tirage du jeu, débrief de l'échec technique, mini-jeu « Dimensionner son forage » (gain net espéré et fiabilité recalculés, bonnes réponses équilibrées).
- `quiz_generes.js` : quiz Maturation, Rock-Eval, Sismique et Lithofaciès générés par le moteur géologique : réponse recalculable à partir des valeurs affichées, marges aux seuils, classes équilibrées, manche de 8 questions (générées + fixes), partie en cours intacte. Sismique : polarité, force de réflexion, temps double, calage, multiple, résolution, chacun recalculé depuis les valeurs affichées. Lithofaciès : mesures de log, bonne roche nettement la plus proche. Cartes : formule de probabilité du moteur reproduite sur 3600 blocs.
- `log_repondable.js` : mini-jeu « Lire un log » (9 questions : roche ou volume d'argile, fluide, puis porosité-densité, saturation d'Archie ou contact, toutes recalculées depuis les valeurs affichées) : chaque question de fluide doit être répondable avec les repères affichés (lecteur idéal : 0 erreur sur 300 logs), fluides équilibrés, tableau de valeurs lues, pas de roche répétée dans une manche.
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
- V4.50 (fiabilité du matériel selon la charge, finance activée, Découverte, 80 parties) : prudent 33 % (35 % avant), guide 21 % (20 %), hasard 4 % (5 %), parfait 60 % (76 %) ; à 120 parties, parfait 62 % contre 71 %. Le joueur qui connaît les vraies valeurs perd environ 9 points car il ne peut plus exploiter le matériel léger près de sa limite.
- Non mesuré : le sondage stratigraphique (le robot n'en tire aucun avantage), l'effet du bruit, des multiples et du retraitement (aucun effet économique dans le simulateur), la lisibilité pour un humain.
