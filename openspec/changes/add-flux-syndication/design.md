## Context

Voir `proposal.md — Why`. Quatre contraintes du code existant façonnent
l'approche :

- **Trois natures de source.** `Mix` porte soit `audioUrl` (objet R2 public),
  soit `sourceType = 'remote'` + `sourceRef` (URL audio distante), soit
  `sourceType = 'mixcloud'` + `sourceRef` (clé de cloudcast). Seules les deux
  premières donnent une URL de fichier ; la troisième n'en a aucune.
- **Aucune métadonnée d'octets.** Ni la taille, ni le type MIME de l'audio ne
  sont stockés. `durationSec` est relevé côté client depuis `<audio>` et vaut
  souvent `null`.
- **`setGlobalPrefix('api')`** dans `main.ts` : toute route de ce backend sort
  sous `/api`.
- **La fournée est un fichier markdown du frontend**, analysé par
  `frontend/src/content/fournees.ts` et embarqué au build par
  `import.meta.glob`. Le backend n'en sait rien, et
  `deploy/o2switch-deploy.sh` ne déploie que `frontend/dist`.

`fast-xml-parser` est déjà une dépendance du backend (`podcast.importer.ts`).

## Goals / Non-Goals

**Goals :**

- Un seul constructeur de flux, quatre résolveurs de périmètre — l'ajout d'un
  cinquième périmètre ne doit pas toucher au XML.
- Aucune nouvelle dépendance, aucune migration.
- Des URL d'enclosure qui survivent à un changement d'hébergement.

**Non-Goals :**

- Pas de couche de cache serveur : un flux est une requête Prisma et un
  assemblage de chaînes. `ETag` suffit à absorber le repoll horaire des clients.
- Pas de comptage d'écoute dans ce change. La route de résolution le rend
  possible plus tard ; l'implémenter tout de suite demanderait de distinguer une
  vraie écoute d'une requête `Range` répétée ou d'un robot d'indexation, ce qui
  est un sujet à part entière.
- Pas d'URL « propres » (`/rss.xml`) : elles demandent une règle Apache dans
  `api/.htaccess`, donc un aller-retour de déploiement, pour un gain cosmétique.

## Decisions

### Un `FeedsModule` : un constructeur, quatre résolveurs

```
FeedsController ──▶ résolveur(périmètre) ──▶ FeedChannel ──▶ FeedBuilder ──▶ XML
                    site | user | playlist | fournee
```

`FeedChannel { title, description, link, imageUrl, items[] }` est le seul
contrat. Le constructeur ignore ce qu'est une fournée ; les résolveurs ignorent
ce qu'est une `enclosure`.

*Alternative écartée* : un contrôleur par périmètre, greffé sur
`UsersController` et `PlaylistsController`. Cela disperse le XML en quatre
endroits et fait diverger les flux dès la première correction.

### `XMLBuilder` plutôt qu'un gabarit de chaînes

`fast-xml-parser` expose `XMLBuilder`, déjà installé. Il échappe les caractères
réservés, ce qu'un gabarit à interpolation ne fait pas : une esperluette dans un
titre de mix suffit à rendre un flux non analysable, et le symptôme apparaît
chez l'abonné, pas chez nous.

*Alternatives écartées* : `feed`, `rss`, `podcast-feed-generator` — une
dépendance de plus pour un document de trente lignes de structure. Un gabarit
manuel — l'échappement est exactement le piège de ce format.

### `length="0"` dans les enclosures

Aucune taille n'est stockée. Trois issues étaient possibles : `HEAD` amont à
chaque génération, colonne `sizeBytes` remplie à l'upload et rétro-remplie, ou
`length="0"`.

`length="0"` est retenu parce que la soumission à Apple Podcasts — le seul
consommateur qui refuse un flux pour ce motif — est hors périmètre. Les clients
d'abonnement (AntennaPod, Pocket Casts, Overcast) lisent la taille réelle dans
la réponse HTTP au téléchargement.

**Le plafond est nommé dans le code** : le jour d'une soumission à Apple, la
sortie est la colonne `sizeBytes` remplie à l'upload et à l'import, avec
rétro-remplissage par `HEAD`. Le `HEAD` à la génération est écarté même alors :
50 requêtes réseau par rendu de flux, pour une valeur qui ne change jamais.

### Une URL de résolution `GET /api/mixes/:id/audio` → `302`

C'est cette URL qui entre dans les `enclosure`, jamais l'URL R2 ni l'URL
distante. Une URL d'enclosure est gravée dans la base locale de chaque client
abonné pour des années : y mettre le domaine R2 revient à s'interdire tout
changement d'hébergement, alors que le projet a déjà migré son stockage une
fois. C'est aussi le seul point de passage où un comptage d'écoute pourra un
jour se brancher.

`302` et non `301` : un `301` est mémorisé par les clients, ce qui annule
précisément le bénéfice recherché.

### Les URL absolues sont dérivées de la requête, pas d'une variable

Un flux RSS n'admet que des URL absolues. Les liens vers les pages de mix
utilisent `FRONTEND_URL`, déjà configurée. Les URL d'enclosure, elles, pointent
vers ce backend : elles sont construites depuis le protocole et l'hôte de la
requête entrante. `app.set('trust proxy', 1)` est déjà en place dans `main.ts`,
donc l'hôte vu est celui qu'Apache a transmis, pas celui du socket Passenger.

*Alternative écartée* : une variable `API_PUBLIC_URL`. Une variable de plus à
tenir juste sur trois environnements, pour une valeur que la requête porte déjà.

### Les fournées sont lues dans les fichiers markdown du frontend

Le backend lit `frontend/src/content/fournees/*.md` et réimplémente l'analyse du
frontmatter — quarante lignes, sur un format volontairement restreint à des
scalaires et des listes en ligne, déjà décrit dans
`frontend/src/content/fournees.ts`.

*Alternatives écartées* : faire redescendre la fournée en base — cela défait la
décision explicite du change `fournee-markdown` (« pas de modèle en base, pas
d'endpoint, pas d'écran d'administration ») pour un seul flux. Partager le
module d'analyse entre les deux paquets — il n'y a pas de paquet commun dans ce
dépôt, en créer un pour quarante lignes coûte plus qu'il ne rend.

Le chemin du dossier est lu dans une variable d'environnement avec une valeur
par défaut relative, parce que l'arborescence de production diffère de celle du
dépôt (voir *Migration Plan*).

**Conséquence assumée** : deux analyseurs pour un même format. Le garde-fou est
un test du backend sur les fichiers réels du dépôt — si un fichier cesse d'être
lisible par l'un des deux, la CI le dit.

### `ETag` faible dérivé du périmètre

`ETag` = empreinte de (nombre d'items, plus grande date de modification du
périmètre). Un ajout change le compte, une modification change la date, une
suppression change le compte. `Cache-Control: public, max-age=900` en
complément.

*Alternative écartée* : `Last-Modified` seul — il ne bouge pas sur une
suppression, et un mix retiré resterait servi.

## Risks / Trade-offs

- **Republication d'audio distant** → Les mix `remote` mettent en enclosure une
  URL hébergée par un tiers ; le trafic d'abonnement retombe sur son serveur.
  C'est un choix explicite du projet, pas un oubli. Atténuation : la route de
  résolution est le point unique où une exclusion par domaine pourra être posée
  si un hébergeur s'en plaint.
- **Deux analyseurs de fournée** → Un test du backend lit les fichiers réels du
  dépôt ; une divergence de format casse la CI plutôt qu'un flux en production.
- **Le déploiement oublie le dossier des fournées** → Le flux de fournée
  répondrait 404 en production tout en marchant en local. Atténuation : le
  script échoue déjà bruyamment sur un répertoire source absent
  (`remplacer()`), et une vérification post-déploiement est listée dans les
  tâches.
- **Identifiants de mix répétés dans un fichier de fournée** → Le fichier
  `2026-hiver.md` du dépôt cite deux fois le même identifiant. Deux items de même
  `guid` font que certains clients n'en gardent qu'un et que d'autres affichent
  un doublon. Atténuation : le résolveur déduplique en conservant la première
  occurrence.
- **`length="0"`** → Flux irrecevable par Apple Podcasts, et barre de
  progression parfois approximative avant le début du téléchargement. Assumé,
  avec la sortie décrite plus haut.
- **Flux vide pour un périmètre entièrement Mixcloud** → Un abonné voit un
  podcast sans épisode. Atténuation : la description du flux dit que les mix non
  téléchargeables en sont absents.

## Migration Plan

1. Livrer le backend : les trois premiers flux et la route de résolution ne
   dépendent d'aucun changement d'infrastructure.
2. Ajouter au `remplacer()` de `deploy/o2switch-deploy.sh` la copie de
   `frontend/src/content/fournees` vers l'arborescence du backend, et pointer la
   variable de chemin dessus en production. **Sans cette étape, seul le flux de
   fournée est en panne** — les trois autres fonctionnent.
3. Vérifier en production : les quatre URL rendent un document analysable, et un
   client de podcast réel s'abonne et lit un épisode.
4. Ajouter les liens `rel="alternate"` côté frontend.

**Retour arrière** : la fonctionnalité est en lecture seule et n'écrit rien. Un
retour arrière est le redéploiement de la révision précédente ; le seul effet de
bord subsistant est que les abonnés déjà pris reçoivent des 404, sans perte de
données.

## Open Questions

- Faut-il, plus tard, une URL courte hors `/api` (`/rss.xml`) via `api/.htaccess`
  pour la lisibilité publique ? Sans effet sur les specs ni sur le découpage.
- Le compteur d'écoutes doit-il un jour inclure les écoutes de podcast, et
  selon quelle règle de déduplication ? Décision reportée, la route de
  résolution la laisse ouverte.
