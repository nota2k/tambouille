## 1. Le peuplement, d'abord

Écrit et vérifié en local, avant toute infrastructure : c'est la seule pièce
dont la qualité décide si l'aperçu sert à quelque chose, et la seule qui se
teste entièrement sans compte chez personne.

- [x] 1.1 Écrire `backend/prisma/seed.ts` : lire les fixtures de
      `backend/src/imports/__fixtures__/` et les passer aux parseurs **déjà
      exportés** des importeurs (`parseFeed` et ses équivalents). Aucun appel
      réseau. Mesuré : **43 mixes** — 25 du flux, 2 émissions, 16 pistes
      Archive.org. LYL et SoundCloud sont hors d'atteinte : pas d'analyseur pur
      exporté (voir design, *Décision 3*).
- [x] 1.2 Créer les comptes de démonstration et les mixes, en réemployant les
      services applicatifs plutôt qu'en écrivant en base à la main — la
      contrainte « exactement une source audio » vit dans `MixesService`, pas
      dans le schéma.
- [x] 1.3 Téléverser les pochettes sur le bucket d'aperçu et renseigner
      `coverUrl`. Sans cette étape la page d'accueil est une grille de
      rectangles vides (voir design, *Context*).
- [x] 1.4 Écrire la communauté fictive : abonnements, favoris, commentaires
      (dont des réponses), playlists, écoutes. C'est du jugement éditorial —
      viser une page de profil et une page de mix qui se rendent pleines.
- [x] 1.5 Rendre le script idempotent : rejoué sur une base qu'il a déjà
      peuplée, il produit le même site. Vérifier en le lançant deux fois de
      suite contre le Postgres du `docker-compose` local.
- [x] 1.6 Déclarer le script et vérifier qu'il aboutit sur une base vierge
      migrée. Déclaré dans `backend/prisma.config.ts` (Prisma 7 y a déplacé la
      configuration) et non dans `package.json`, et comme
      `node dist/prisma/seed.js` : le client généré est du TypeScript dont les
      imports portent des suffixes `.js`, que `ts-node` ne résout pas.

## 2. L'hébergement, créé une fois à la main

- [x] 2.1 Créer le bucket R2 `tambouille-apercu` et son jeton d'accès. Vérifier
      qu'il est distinct de celui de la production, jamais nommé dans la même
      configuration.
- [x] 2.2 Créer sur Render le service web de l'API : racine `backend`,
      construction `npm ci && npm run build`, démarrage `npm run start:prod`,
      `NODE_VERSION=22`. Le backend n'a pas de champ `engines` — rien
      n'imposerait la version sans cette variable, et la production tourne
      sur 22.
- [x] 2.3 Créer la base d'aperçu et la renseigner dans `DATABASE_URL` du
      service. Noter la chaîne de connexion **externe** : c'est elle que le
      runner utilisera pour migrer et peupler.
- [x] 2.4 Créer sur Render le site statique du front : racine `frontend`,
      construction `npm ci && npm run build`, publication `dist`, et une
      réécriture `/*` vers `/index.html` — sans elle, `vue-router` en mode
      history renvoie 404 sur toute adresse autre que la racine.
- [x] 2.5 Renseigner les variables du service API : `FRONTEND_URL` à l'adresse
      du site statique (sinon le CORS de `main.ts` bloque tout), les
      identifiants R2 d'aperçu, `JWT_SECRET`. Laisser le SMTP absent : il n'est
      lu qu'à la première tentative d'envoi et n'empêche pas l'API de démarrer.
- [x] 2.6 Écrire `render.yaml` à la racine pour que cette configuration vive
      dans le dépôt plutôt que dans une interface. Descriptif, non appliqué :
      l'adopter comme Blueprint créerait des services distincts de ceux créés à
      la main. Écrit aussi `frontend/.env.apercu`, que `--mode apercu` charge —
      vérifié : le paquet construit porte l'adresse Render et celle du bucket
      d'aperçu, et non celles de la production.
- [x] 2.7 Désactiver le déploiement automatique sur les deux services : c'est la
      CI qui décide quand et sur quel commit.
- [ ] 2.8 Créer un compte dans l'aperçu et parcourir le site à la main. Vérifier
      que les écrans exigeant une session sont atteignables **sans** passer par
      Google ni Keycloak.
- [x] 2.9 Inscrire les secrets dans le dépôt : les deux crochets de
      déploiement, la chaîne de connexion externe, les identifiants R2
      d'aperçu.

## 3. La tâche `apercu`

- [x] 3.1 Ajouter la tâche à `.github/workflows/ci.yml`, sans toucher aux trois
      existantes. Condition nommant ses cas en positif :
      `github.event_name == 'pull_request' && github.event.pull_request.head.repo.full_name == github.repository`.
- [x] 3.2 `concurrency: { group: apercu, cancel-in-progress: true }` —
      l'emplacement unique, la dernière poussée gagne.
- [x] 3.3 `continue-on-error: true`, et ne l'inscrire dans aucun `needs` : la
      spécification exige que l'aperçu ne décide jamais d'une fusion.
- [x] 3.4 `permissions` : `contents: read` et `pull-requests: write` pour cette
      tâche seule. Les trois vérifications restent en lecture seule.
- [x] 3.5 Lancer `prisma migrate deploy` depuis le runner contre la base
      d'aperçu — pas depuis Render (design, *Décision 5*).
- [x] 3.6 Lancer le peuplement depuis le runner, après la migration.
- [x] 3.7 Appeler les deux crochets de déploiement avec `?ref=<sha de la tête de
      la proposition>`, et **vérifier le statut de la réponse**. Un appel dont
      on lit le statut sans le vérifier ne vérifie rien — c'est la leçon déjà
      payée par `VersionControl/update` dans la tâche `deploy`.
- [x] 3.8 Attendre que l'API réponde et que le site se charge, avec une borne de
      temps. Constater plutôt que supposer.
- [x] 3.9 Commenter la proposition : l'adresse, **le commit servi**, et le fait
      que le premier chargement peut prendre une minute après une période
      d'inactivité. Mettre à jour le même commentaire à chaque prise de
      l'emplacement plutôt que d'en empiler un par poussée.

## 4. Constater

- [ ] 4.1 Ouvrir une proposition de démonstration modifiant une vue publique et
      une vue exigeant une session. Vérifier que l'aperçu montre les deux.
- [ ] 4.2 Pousser sur une seconde proposition pendant que la première a
      l'emplacement. Vérifier que la seconde le prend et que **les deux
      commentaires disent quel commit est servi**.
- [ ] 4.3 Faire échouer délibérément le déploiement de l'aperçu et vérifier que
      la proposition reste fusionnable.
- [ ] 4.4 Vérifier depuis un fork qu'aucun aperçu n'est déclenché et que les
      trois vérifications s'exécutent normalement.
- [ ] 4.5 Déposer un mix depuis l'aperçu, puis vérifier que rien n'a atteint le
      bucket ni la base de production.
- [ ] 4.6 Vérifier que la production n'a pas bougé : `deploy`, `.cpanel.yml` et
      `deploy/o2switch-deploy.sh` inchangés, site et API toujours debout.

## 5. Consigner

- [x] 5.1 Ajouter au `README` la façon d'atteindre l'aperçu et ce qu'il ne
      vérifie pas — `trust proxy` et `/uploads` (design, *Risks*).
- [x] 5.2 Ouvrir une entrée dans `TODOS.md` pour la disparition mensuelle de la
      base d'aperçu : ce qu'on constatera, et le repli si la gêne est réelle.
