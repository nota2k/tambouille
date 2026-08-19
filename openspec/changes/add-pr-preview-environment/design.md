## Context

Voir `proposal.md` — *Why*. Ce document ne redit pas le motif, il rend compte
des mesures qui ont écarté les autres formes, parce qu'elles sont
contre-intuitives et qu'un lecteur qui ne les a pas sous les yeux refera les
mêmes propositions.

Contraintes du décor, dans l'ordre où elles ont mordu :

- **La production tourne sur un mutualisé o2switch.** Une application = un
  nodevenv CloudLinux, une entrée NodeJS Selector, un sous-domaine, un `.env`,
  tout créé à la main dans cPanel. Le port 22 est filtré depuis un runner
  (mesuré le 17 août 2026). Rien de tout cela n'est provisionnable par
  programme : un environnement **par** proposition de fusion y est exclu.
- **Les vérifications de proposition ne lisent aucun secret**, propriété écrite
  dans la spécification `continuous-integration` et rappelée deux fois en tête
  du workflow. Elle est ce qui rend les vérifications exécutables sur une
  proposition venue d'un fork.
- **`coverUrl` est toujours une clé R2.** `mixes.controller.ts:191` :
  l'importation d'un mix va chercher l'image de la source et **la re-téléverse**
  sur R2. Côté front, `mediaUrl()` préfixe systématiquement par
  `VITE_R2_PUBLIC_URL`.
- **Le dépôt n'a aucun script de semence.** Dix modèles Prisma, aucune donnée
  de démonstration nulle part.
- **Les identités sont chez des tiers.** Google n'accepte pas de joker dans ses
  URI de redirection ; le client Keycloak vit sur `cartemembre.jeancloude.club`.

## Goals / Non-Goals

**Goals :**

- Rendre visible, sur une URL, l'état d'une proposition de fusion — y compris
  les écrans qui exigent une session.
- Ne jamais mettre en danger les données de production : ni la base, ni les
  222 Mo d'`uploads/` que `deploy/o2switch-deploy.sh` décrit comme sauvegardés
  nulle part ailleurs.
- Préserver la propriété qui compte dans l'invariant de secrets : une
  proposition venue d'un fork reste vérifiable.
- Ne rien coûter.

**Non-Goals :**

- Répéter le chemin de déploiement de la production. Assumé, et c'est le prix
  du choix d'hébergeur — voir *Décision 4*.
- Refléter les données de production dans l'aperçu. Impossible et non
  souhaitable : les mixes antérieurs à la migration R2 portent des chemins
  `/uploads/` servis depuis un disque qui n'existe que sur o2switch.
- Plusieurs aperçus simultanés. Voir *Décision 2*.
- Faire fonctionner Google et Keycloak sur l'aperçu. Voir *Décision 1*.

## Decisions

### 1. Un backend éphémère, pas le backend de production

Trois formes ont été pesées pour le même build de front :

| | Cible de l'API | Écrit en production ? | Ce qu'on voit |
|---|---|---|---|
| A | production, déconnecté | non, **par construction** | ~50 % de chaque écran chaud |
| B | production, connecté | **oui, pour de vrai** | tout |
| C | API séparée, semée | non | tout |

A part d'une jolie propriété : sans session, le front ne peut rien écrire —
toutes les routes publiques sont en lecture, donc le mur d'authentification
fait aussi office de mur d'écriture. Mais la mesure la disqualifie :
`DiscoverView`, `MixDetailView`, `ProfileView`, `PlaylistDetailView`, `NavBar`,
`CommentsSection`, `CommentItem`, `AddToPlaylistButton` et `UploaderCard`
**branchent toutes sur la session**. Un aperçu déconnecté ne montre pas 73 % du
site, il montre **une moitié de chaque écran** : les commentaires sans champ de
saisie, les cartes sans bouton playlist, les profils sans bouton suivre. Sur une
proposition qui touche `CommentsSection`, l'aperçu compile, s'affiche, et ne
montre pas ce qui a changé. C'est le mensonge qu'on refuse — pas « on ne voit
pas `UploadView` », mais « on croit voir `MixDetailView` ».

Répartition du travail front, comptée sur toute l'histoire (108 modifications
de vues) : 53 % sur des routes publiques, 20 % sur les écrans de connexion,
27 % derrière `requiresAuth` — dont `UploadView`, quatrième vue la plus
modifiée du dépôt.

C retenu. Et C débloque ce que ni A ni B n'obtiennent : l'API a une
authentification locale (`POST /auth/register`, `POST /auth/login`, JWT
maison). Sur une base d'aperçu, **on crée un compte jetable et on voit tout**,
sans jamais toucher à une URI de redirection Google ni au realm du club. Le mur
OAuth n'est pas contourné, il n'est plus sur le chemin.

### 2. Un emplacement unique, pas un par proposition

`concurrency: apercu` avec `cancel-in-progress: true`. La dernière poussée, sur
n'importe quelle proposition, prend l'emplacement.

Presque tout le coût d'un environnement d'aperçu est dans « par proposition »,
pas dans « séparé de la production » :

| | un par proposition | emplacement unique |
|---|---|---|
| base | créée et migrée à chaque fois | une, migrée à chaque poussée |
| DNS | joker, noms dérivés | un enregistrement |
| `VITE_API_BASE_URL` | dérivée au build, fragile | **constante, en dur** |
| Google / Keycloak | cassés | enregistrables une fois |
| propositions vues à la fois | N | 1 |

La colonne de droite garde tout ce qui a fait choisir C et n'abandonne qu'une
chose. Sur le rythme de ce dépôt, le troc est favorable, et l'utilisateur l'a
confirmé.

Le piège est nommé plutôt que combattu : une proposition qui a perdu
l'emplacement garde une URL qui sert le code d'une autre. La tâche **commente
le commit servi** à chaque prise de l'emplacement. On ne cherche pas à empêcher
la collision, on la rend lisible.

### 3. Les fixtures d'importeurs comme source de semence

Mesuré : les parseurs sont **purs et exportés** — `parseFeed(xml)` est appelé
directement par `podcast.importer.spec.ts` sur un fichier gelé, sans réseau, et
les autres importeurs suivent la même forme. Le script de semence réemploie ce
code tel quel, sans le refactoriser et sans dépendre qu'un site tiers soit
debout.

Rendement **mesuré à l'implémentation** : 25 items du flux Ouïedire gelé,
2 émissions Ouïedire, 16 pistes de l'item Archive.org une fois les formats
regroupés — **43 mixes** avec titres, descriptions, tags, artistes, durées et
tracklists réels.

L'estimation portée par une version antérieure de ce document — 35 mixes tirés
de cinq sources — était fausse dans sa composition. LYL et SoundCloud n'ont
**pas** de fonction d'analyse pure exportée : leurs fixtures sont des réponses
HTTP que les tests injectent en simulant `safeFetch`, et les atteindre depuis
un script demanderait de remanier ces importeurs, ce que cette décision exclut.
En sens inverse, l'item Archive.org rend 16 pistes et non une seule. Trois
sources, et plus de mixes que prévu.

Mais les fixtures peuplent le contenu, pas la vie du site. Sur dix modèles,
elles en couvrent deux :

| Modèle | Depuis les fixtures | Ce qui en dépend à l'écran |
|---|---|---|
| `Mix` | oui, 35 | Discover, MixDetail |
| `TracklistEntry` | oui | MixDetail |
| `User` | non — `POST /auth/register` | partout |
| `Comment` | non | `CommentsSection`, `CommentItem` |
| `Follow` | non | Profile, `UserConnectionsView`, `AvatarStack` |
| `Favorite` | non | Collection |
| `Playlist` / `PlaylistItem` | non | `AddToPlaylistButton`, PlaylistDetail |
| `PlayHistory` | non | Discover |

Les six derniers sont **exactement les branches connectées** qu'on est allé
chercher en choisissant C. `ProfileView` — deuxième vue la plus modifiée du
dépôt — est entièrement sociale et ne tire rien des fixtures. La petite
communauté fictive est donc écrite à la main, et c'est du jugement éditorial,
pas de la technique.

### 4. Render, en offre gratuite

Écartés, et pourquoi :

- **o2switch, seconde application.** Zéro euro marginal, et le **seul** choix
  qui répéterait le vrai chemin de déploiement — Passenger, le nodevenv,
  `o2switch-deploy.sh` et ses gardes, exercés sur du code non fusionné. C'était
  la recommandation. Écarté par l'utilisateur.
- **Cloudflare Containers.** Un seul compte (R2 y est déjà), un seul jeton.
  Écarté par la contrainte de coût : Containers n'a pas de palier gratuit, il
  exige le plan Workers payant avant la première seconde de conteneur.
  (Cloudflare **Workers** n'était de toute façon pas une option : Express, le
  pool Prisma persistant, `useStaticAssets` et `trust proxy` demandent un vrai
  Node.)
- **Fly.io.** Plus de véritable offre gratuite.

Render tombe juste sans qu'on ait rien à fabriquer : `prebuild` fait
`prisma generate`, `build` fait `nest build`, `start:prod` fait
`node dist/src/main.js` — **aucun `Dockerfile`, aucun `wrangler.toml`**. Le
front part en site statique, gratuit lui aussi, donc **un seul fournisseur**.

Le déploiement depuis la CI est un POST sur un crochet de déploiement avec
`?ref=<sha>` : Render clone lui-même la proposition à ce commit et construit.
Aucun artefact à transporter, un secret opaque par service.

L'endormissement au bout de 15 minutes d'inactivité, qui serait un défaut
ailleurs, est le bon comportement ici : un aperçu est inactif l'essentiel du
temps. On paie une minute de réveil, une fois, à l'ouverture du lien.

### 5. Les migrations partent du runner, pas du service

`prisma migrate deploy` est lancé par la tâche CI contre la base d'aperçu,
avant le déclenchement du déploiement. Deux raisons : le runner n'a pas la
limite mémoire qui empêche Prisma 7 de tourner sous cPanel (`RangeError:
WebAssembly.Instance(): Cannot allocate Wasm memory`, constaté en production),
et migrer avant de redémarrer est la règle déjà retenue pour la production —
pendant la fenêtre qui suit, l'ancien code tourne sur le nouveau schéma, ce qui
est sûr tant que les migrations sont additives ; l'inverse ne l'est jamais.

### 6. L'invariant de secrets, reformulé plutôt que contourné

La parade orthodoxe est `workflow_run` : la tâche non privilégiée construit, un
second workflow privilégié déploie l'artefact. C'est de la machinerie, et un
endroit exact où l'on peut se tromper d'une façon qui donne les clés à un
inconnu.

Retenu à la place, sur décision de l'utilisateur : deux lignes de condition.

```
if: github.event_name == 'pull_request'
    && github.event.pull_request.head.repo.full_name == github.repository
```

La propriété qui compte — une proposition venue d'un fork reste vérifiable —
survit intacte : les trois tâches bloquantes ne changent pas et ne lisent
toujours rien. Ce qui change, c'est qu'une proposition de fork n'obtient pas
d'aperçu. C'est dit dans la spécification plutôt que laissé à dériver.

## Risks / Trade-offs

- **Le Postgres gratuit de Render expire** (de l'ordre de 30 jours) → retire la
  propriété qui avait fait pencher pour l'emplacement fixe : « semer une fois à
  la main, puis laisser la base s'enrichir ». Une base qui meurt chaque mois
  n'accumule rien. **Mitigation, et c'est un choix** : le script de semence est
  complet et idempotent, la tâche le rejoue sur base vide, et la disparition
  mensuelle devient un non-événement parce que rien d'humain n'y était déposé.
  La contrainte force le seed à être honnête, ce qu'on voulait de toute façon.
  Repli si elle mord quand même : porter la base sur Neon, dont l'offre gratuite
  n'expire pas — un fournisseur de plus pour une propriété dont on aura alors
  mesuré qu'elle manquait.
- **`trust proxy: 1` n'est pas exercé par l'aperçu** → la valeur vaut pour
  l'Apache d'o2switch, et le limiteur de `PasswordResetService` en dépend. Le
  commentaire de `main.ts` dit pourquoi elle n'est ni `true` ni absente.
  Mitigation : aucune, et c'est assumé — c'est précisément la ligne que
  l'aperçu ne peut pas vérifier, et elle est nommée ici pour qu'on ne croie pas
  le contraire.
- **`/uploads` n'existe pas sur l'aperçu** → les mixes antérieurs à la
  migration R2 s'y afficheraient cassés. Mitigation : sans objet, la semence ne
  fabrique que des clés R2. Conséquence à accepter : cloner les données de
  production dans l'aperçu est définitivement hors de portée.
- **La semence écrit sur R2** → obligatoire, puisque `coverUrl` est une clé R2
  et qu'un Discover sans pochettes est une grille de rectangles vides, soit
  exactement le rendu qu'on voulait relire. Mitigation : un bucket
  `tambouille-apercu` distinct. Le bucket de production n'est jamais nommé dans
  la configuration de l'aperçu.
- **Un aperçu déploie du code non relu** → irréductible : c'est ce qu'on
  demande. Mitigation : la condition de la *Décision 6* borne l'exposition aux
  propositions issues du dépôt lui-même, et l'aperçu ne partage aucune donnée
  ni aucun identifiant avec la production.
- **Le premier chargement prend ~1 minute** après une période d'inactivité →
  peut se lire comme une panne. Mitigation : le commentaire de la proposition
  le dit.

## Migration Plan

Rien à migrer : la tâche est ajoutée à côté des autres, et aucune tâche
existante ne change. Le retour arrière est la suppression de la tâche `apercu`
et des services Render ; la production n'a jamais été dans le chemin.

Les créations manuelles à faire une fois, hors dépôt : les deux services
Render et leur base, le bucket R2 `tambouille-apercu`, et les quatre secrets
correspondants dans les paramètres du dépôt.

## Open Questions

- Faut-il enregistrer l'URL fixe de l'aperçu comme URI de redirection chez
  Google et sur le realm Keycloak ? L'authentification locale suffit à tout
  voir, donc la réponse peut attendre d'avoir une proposition qui touche
  précisément ces chemins. Ni les spécifications ni le découpage des tâches
  n'en dépendent.
