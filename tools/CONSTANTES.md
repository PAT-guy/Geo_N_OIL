# Registre des constantes : repères réels et valeurs du jeu (V5.4)

Chaque ligne compare une valeur du jeu à un repère publié. Les repères viennent de recherches web faites pendant la session (sources secondaires pour une partie : presse spécialisée, blogs ; un seul repère par ligne est parfois disponible). Ce registre ne remplace pas une vérification contre les sources primaires. Les mêmes entrées sont dans le glossaire du jeu, section « Réel ou simplifié ? » (étiquette « Repère réel sourcé »).

Statut : **aligné** (valeur du jeu dans la fourchette publiée), **ajusté** (modifiée en V5.4 pour s'aligner), **simplifié** (écart assumé et dit), **non sourcé** (aucun repère trouvé).

| Constante (code) | Valeur du jeu | Repère réel | Statut | Source |
|---|---|---|---|---|
| Eau de frac `WATER.fracBbl` | 260 000 bbl pour 2 000 m (130 bbl/m) | médiane 250 000 bbl en 2015 (Midland) ; 15,6 Mgal (~370 000 bbl) en 2018 pour ~2 900 m, soit 110 à 130 bbl/m | ajusté (était 150 bbl/m) | [BEG, UT Austin](https://www.beg.utexas.edu/files/content/beg/ext-aff/17-09/Study%20quantifies%20potential%20for%20water%20reuse%20in%20permian%20basin%20oil%20production.pdf) ; [Hart Energy](https://www.hartenergy.com/exclusives/changing-tides-180945) |
| Eau par camion `WATER.truck` | 2,5 $/bbl | ~2,50 $/bbl (pipeline ~0,30) | ajusté (était 2,2) | [Wood Mackenzie](https://woodmac.com/press-releases/permian-produced-water) |
| Injection (SWD) `WATER.swd` | 0,6 $/bbl, 2 M$ de puits | évacuation 0,25 à 1 $/bbl | ajusté (était 0,8) | [Wood Mackenzie](https://woodmac.com/press-releases/permian-produced-water) ; [Crude Truth](https://crudetruth.substack.com/p/the-crude-truth-water-management) |
| Recyclage `WATER.recycle` | 0,4 $/bbl, 1 M$ d'usine | retraitement 0,15 à 0,20 $/bbl | ajusté (était 1,2) ; plus haut que la source (conveyance et marge) | [Crude Truth](https://crudetruth.substack.com/p/the-crude-truth-water-management) (blog, moins fiable) |
| BSW frac `waterParams` | 60-75 % au départ (rapport eau-huile ~2), 75-90 % après 5 ans (tau 18 mois) | rapport eau-huile ~2 au départ, ~5 vers la 4e année, jusqu'à 7 ; eau 70-80 % dans le Delaware | ajusté (reflux creux supprimé) | [Wood Mackenzie](https://woodmac.com/press-releases/permian-produced-water) ; [JPT](https://jpt.spe.org/rising-tide-produced-water-could-pinch-permian-growth) |
| BSW conventionnel `waterParams` | max 60 à 90 % | ~13 barils d'eau par baril d'huile en moyenne (étude BEG, puits conventionnels) | simplifié (jeu plus doux) | [BEG / USGS](https://www.beg.utexas.edu/files/research-study/Will%20Water%20Issues%20Constrain%20Oil%20and%20Gas%20Production%20in%20the%20U_S__.pdf) |
| Écart de prix par API `fluidPf` | +0,8 % par °API au-dessus de 30 | ~0,7 % du Brent par °API | ajusté (était 1,2 %) | [Banque mondiale](https://openknowledge.worldbank.org/server/api/core/bitstreams/9fb0d96e-b700-5a36-9cc0-e4f8927b9222/content) |
| Écart de prix par soufre `fluidPf` | −5 % par point au-dessus de 0,7 % | non trouvé isolément ; écart LLS-Maya de 23 % | ajusté (calé sur LLS-Maya : jeu 24 %) | [EIA, Plante 2019](https://www.eia.gov/finance/markets/reports_presentations/2019/plante.pdf) |
| Seuil de biodégradation `fluidParams` | 80 °C (échelle jusqu'à 20 °C) | ~80 °C (75 à 90 selon les études), pasteurisation | ajusté (était 60 °C) ; pasteurisation non modélisée | [PetroWiki](https://petrowiki.spe.org/Biodegradation) ; [IGI](https://igiltd.com/news/lack-of-biodegradation-in-some-cool-shallow-oilfields-palaeopasteurisation) |
| GOR frac `fluidParams` | 1 600 à 4 500 scf/bbl | 2 100 à 5 000 selon les puits ; basin ~2 800 à 4 200 | ajusté (était 900 à 2 100) | [TGS](https://www.tgs.com/weekly-spotlight/05-03-2024) ; [Novi Labs](https://novilabs.com/blog/why-is-gor-relatively-stable-in-the-permian/) |
| Prix du gaz associé `FLUID.gasShare` | 25 % du prix énergétique (≈3 $/Mcf net) | gaz réel de l'ordre de 3 à 4 $/Mcf (non recherché, ordre de grandeur) | ajusté (était 55 %) ; non sourcé | n/a |
| Prix du gaz des puits à gaz | 0,18 × brut (≈14 $/Mcf) | ~3 à 4 $/Mcf | simplifié (équivalence énergétique d'origine) | n/a |
| Déclin du shale `SHALE_DECL` | b = 1,1, Di = 17 %/mois : −68 % en 1 an, pas de terminal | 60-80 % la 1re année (source peu fiable) ; b 1,5 à 2 puis ~0,5 ; terminal 5-10 %/an | simplifié | [AAPG](https://www.searchanddiscovery.com/abstracts/pdf/2016/90250sws/abstracts/16.html) ; [Novi Labs](https://novilabs.com/faq/how-do-you-perform-decline-curve-analysis-for-shale-wells) |
| Espacement des étages `fracStages` | 1 étage / 70 m | 150 à 250 ft (45 à 75 m) ; 35 étages en moyenne | ajusté (était 60 m) | [Hart Energy](https://hartenergy.com/exclusives/coil-tubing-fracks-gain-share-permian-though-plug-and-perf-remains-king-25585) |
| Coût d'un puits horizontal | ~5 100 $/m de drain (frac, médiane Permien) | D&C 4,9 à 8,3 M$ (EIA 2016) ; ~775 $/ft en 2024 (~2 540 $/m) | simplifié : ~2× le réel, avec des débits plus faibles ; calé pour l'équilibre | [EIA](https://www.eia.gov/todayinenergy/detail.php?id=25592) |
| Camion pour le brut `INFRA.truckCost` | 2,0 $/bbl | ~2 $/bbl court trajet ; estimations jusqu'à 8-20 | ajusté (était 3,0) ; sources contradictoires | [RBN Energy](https://rbnenergy.com/daily-posts/blog/costly-logistical-headaches-permian-crude-eps) ; [Texas RRC](https://www.rrc.state.tx.us/media/b21djm5d/360.pdf) |
| Pipeline pour le brut `INFRA.pipeCost` | 0,5 $/bbl | ~0,5 $/bbl (segments de 0,14 à 0,50) | ajusté (était 1,0) | [Texas RRC](https://www.rrc.state.tx.us/media/b21djm5d/360.pdf) |
| TOC de la roche-mère `genStrength` | 0,2 à 8,7 % ; seuil de frac 1,5 % | Wolfcamp : 1 à 3 % en carotte, jusqu'à 6-8 % ; maxima publiés 8-10 % | aligné | [IHS Markit](https://cdn.ihs.com/www/pdf/Wolfcamp-Horizontal-Play-of-Midland-Basin.pdf) ; [Hart Energy](https://hartenergy.com/exclusives/regional-spotlight-wolfcamp-shale-12368) |
| Tmax (maturité) | huile 435-455 ; gaz dès 460 | immature < 435 ; huile 435-455 (type II) ou jusqu'à 470 ; gaz > 470 | simplifié (gaz un peu tôt) | plusieurs articles, dont des travaux citant Espitalié et al. (1985) ; pas de lien unique retenu |
| Pression hydrostatique, Eaton ν = 0,35 | 1,00 sg ; ν 0,35 | 0,433 psi/ft (= 1,0 sg) ; ν courant de 0,25 à 0,40 | aligné (connaissance classique, non recherchée en ligne) | n/a |
| Constantes de probabilité (`ETA`, `PROD_BASE`, `SHALE_BASE`, `SHALE_BASIN`, Rose, variogramme de jeu) | voir `tools/README.md` | aucun repère trouvé | non sourcé : réglages de jeu | n/a |

## Limites de ce registre

- Une partie des chiffres vient de presse spécialisée et de blogs ; trois repères (frac 60-80 %, camion du brut, retraitement 0,15-0,20) sont explicitement de faible fiabilité.
- Plusieurs études ont de 6 à 9 ans (Wood Mackenzie 2018-2019, EIA 2016). Les ordres de grandeur sont fiables, les valeurs précises moins.
- Les coûts de forage du jeu valent à peu près le double du réel : c'est un choix d'équilibrage, pas une mesure. Les valeurs de jeu ne sont pas de la prévision.
