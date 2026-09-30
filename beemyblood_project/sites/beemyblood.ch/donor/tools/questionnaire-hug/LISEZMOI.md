# Questionnaire des HUG : mise à jour de la carte des cases

La page `donor/pages/questionnaire.html` affiche le formulaire officiel du Centre de transfusion sanguine des HUG
(`donor/assets/hug-questionnaire-v01-fev26.pdf`, ANH-Art7.6v3, 1er février 2026) et pose les réponses de la personne
par-dessus, à l'impression. Le fichier des HUG est protégé contre la modification et autorise l'impression : il n'est
donc jamais modifié ni déchiffré, seulement affiché (pdf.js) et imprimé avec un calque de réponses.

Trois éléments doivent rester cohérents avec la version du formulaire :

1. le fichier PDF officiel, copié tel quel dans `donor/assets/` ;
2. les libellés des questions (`questionnaire-hug.src.js`, tableau `QUESTIONS`), repris mot pour mot ;
3. la carte des positions (`carte.json`) : cases OUI/NON, cases d'options, lignes pointillées, en-tête.

## Quand les HUG publient une nouvelle version

`api/questionnaire-hug.php` compare chaque jour l'empreinte SHA-256 du fichier publié par les HUG avec celle du fichier
embarqué. En cas d'écart, la page avertit la personne. Il faut alors :

1. télécharger le nouveau PDF dans `donor/assets/` et mettre à jour son nom (`FICHIER` dans `questionnaire-hug.src.js`,
   `PDF` dans `extrait.js`), l'adresse et l'empreinte dans `api/questionnaire-hug.php` ;
2. relire les questions et adapter `QUESTIONS` ainsi que l'ordre des questions par page dans `carte.js` (`ORDRE`, `GROUPES`,
   repères des zones de texte) ;
3. régénérer :

```bash
npm install
npm run maj
```

`extrait.js` relève la position de chaque élément de texte (les cases à cocher sont des glyphes, donc du texte),
`carte.js` en déduit la carte et s'arrête si le nombre de cases ne correspond plus aux questions,
`construire.js` écrit `donor/assets/questionnaire-hug.js` et copie pdf.js.

4. vérifier à l'écran et à l'impression, avec toutes les réponses à « oui » et toutes les options cochées, que chaque croix
   tombe dans sa case et chaque texte sur sa ligne.

La mention rouge en bas de page, la date et la signature laissées à la main sont définies dans `questionnaire-hug.src.js`.
