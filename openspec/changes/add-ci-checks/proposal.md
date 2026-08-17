## Why

Rien ne vérifie ce dépôt automatiquement. La PR #4, qui portait 32 fichiers et
2794 lignes ajoutées, a été fusionnée avec un `statusCheckRollup` vide : aucune
vérification n'a tourné, et rien n'aurait signalé un test rouge ou un build
cassé. Les deux paquets se construisent aujourd'hui sur des machines de
développement, et `frontend/dist/` est commité précisément parce qu'un build
oublié partait autrement en silence — le `.gitignore` du frontend porte la
cicatrice en commentaire.

Ce changement met en place la moitié intégration seule. Le déploiement
automatique vers o2switch reste hors périmètre et attend son propre chantier,
consigné dans `TODOS.md`.

## What Changes

- Un workflow GitHub Actions déclenché sur chaque `pull_request` et sur `push`
  vers `main`, avec deux tâches indépendantes — une par paquet npm.
- **Bloquant** : la suite unitaire du backend (539 tests, 21 suites), la
  construction du backend (`nest build`), le typage et la construction du
  frontend (`vue-tsc --build` puis `vite build`), le formatage des deux paquets
  (`prettier --check`), et `oxlint` côté frontend.
- **Non bloquant** : `eslint` sur les deux paquets, en rapport seulement. Le
  dépôt compte 659 problèmes côté backend (dont ~294 non auto-corrigeables) et
  22 côté frontend ; les rendre bloquants tout de suite reviendrait à embarquer
  une remise à plat de cette taille dans un changement dont l'objet est
  d'ajouter un fichier de workflow.
- Des scripts npm de vérification qui **échouent au lieu de corriger**. Tous les
  scripts de lint actuels passent `--fix` (`eslint --fix`, `oxlint --fix`,
  `prettier --write`) : branchés tels quels sur une CI, ils passent au vert sur
  tout ce qui est auto-corrigeable et le correctif est jeté avec le runner.
- Mise au propre du formatage : 41 fichiers côté backend, 38 côté frontend.
  Mécanique, une commande.
- Un `ignore` sur `dist/` dans `.oxlintrc.json`. `frontend/dist/` est commité et
  le reste dans ce périmètre, donc `oxlint` l'analyse aujourd'hui et se noie
  dans les bundles construits. `eslint.config.ts` l'ignore déjà.
- Suppression de `backend/test/app.e2e-spec.ts`, le fichier généré par
  `nest new`. C'est la seule suite rouge du dépôt, et elle échoue **à l'import**
  sur `R2_ACCOUNT_ID` manquant — pas sur l'assertion `Hello World` que
  `TODOS.md` lui prête. Une fois retirée, `npm run test:e2e` est vert.

## Capabilities

### New Capabilities

- `continuous-integration`: ce que le dépôt vérifie automatiquement avant
  qu'un changement puisse être fusionné, ce qui bloque et ce qui ne fait que
  rapporter, et les dépendances que ces vérifications n'ont pas le droit
  d'avoir.

### Modified Capabilities

Aucune. Le comportement du produit ne change pas.

## Impact

**Ajouté** : `.github/workflows/ci.yml`.

**Modifié** : `backend/package.json` et `frontend/package.json` (scripts de
vérification sans `--fix`) ; `frontend/.oxlintrc.json` (ignore `dist/`) ;
le formatage de 79 fichiers.

**Supprimé** : `backend/test/app.e2e-spec.ts`.

**Mesuré sur le dépôt avant d'écrire cette proposition**, et qui explique la
forme retenue :

- `npm test` (backend) passe 539/539 avec une base injoignable **et** dans un
  environnement entièrement vierge (`env -i`). Aucun service PostgreSQL n'est
  donc nécessaire pour la partie bloquante du workflow.
- `prisma generate`, que `postinstall` déclenche à chaque `npm ci`, fonctionne
  sans `DATABASE_URL`. Le hook ne gêne pas la CI. Il gênera le déploiement,
  pour une raison différente et hors périmètre ici.
- `nest build`, `vue-tsc --build` et `vite build` passent tous les trois en
  l'état.
- La suite e2e restante (`mail-boot.e2e-spec.ts`, 2 tests) passe, mais son
  propre commentaire annonce qu'elle exige PostgreSQL. Son inclusion dans le
  workflow est traitée dans `design.md` : elle épingle une garantie qu'aucun
  test unitaire ne couvre, au prix d'un service dans le workflow.

**Risque connu, non diagnostiqué** : sur huit exécutions observées de la suite
unitaire, une a échoué — 3 tests dans 2 suites, en 25 s contre 5 à 15 s
habituellement. Non reproduite depuis, y compris sous une charge CPU saturant
les huit cœurs. Les runners GitHub sont plus lents et plus bruyants que la
machine où cette mesure a été faite, donc une instabilité liée au temps s'y
manifestera davantage. « Tests bloquants » n'a de valeur que si le rouge est
toujours un vrai rouge ; `design.md` en tire les conséquences.
