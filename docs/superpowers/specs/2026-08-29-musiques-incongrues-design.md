# Lien Musiques Incongrues → Tambouille — design

**Date :** 2026-08-29
**Statut :** en attente de relecture

## Contexte

Musiques Incongrues (`musiques-incongrues.net`) est un forum où l'auteur de ce
dépôt publie régulièrement des mix. Chaque post embarque un lecteur Mixcloud ou
SoundCloud. Ces mêmes mix sont ensuite ressaisis à la main dans Tambouille.

L'objet de ce design est de supprimer cette double saisie : **quand `nota` poste
un mix sur le forum, il paraît dans Tambouille sous son compte.**

Ce n'est pas une ingestion du forum entier. Le périmètre est un lien entre un
compte forum et un compte Tambouille, et la synchronisation ne lit jamais que
les discussions de l'auteur lié.

## Ce que le forum permet réellement

Mesuré le 29 août 2026, pas supposé.

**Le forum tourne sous Flarum** et expose une API JSON publique, sans
authentification pour la lecture. Il expose aussi des flux Atom
(`/atom/t/musique/discussions`), plus pauvres que l'API : on ne les utilise pas.

**Le filtre par auteur fonctionne** — `GET /api/discussions?filter[author]=nota`
rend les discussions de ce seul compte. C'est Flarum qui applique le filtre côté
serveur ; rien à filtrer nous-mêmes, et rien d'autre ne peut être lu par cette
route.

**`include=firstPost` donne le HTML rendu du premier message**, avec les iframes
des lecteurs sous la forme `data-s9e-mediaembed="<service>"` (extension
`s9e/mediaembed`).

**Les 24 discussions de `nota`, par type d'embed :**

| Embed | Nombre | Traitement |
|---|---|---|
| `mixcloud` | 14 | importé |
| `bandcamp` | 4 | écarté |
| aucun | 4 | écarté |
| `youtube` | 2 | écarté |

Les clés Mixcloud sortent sous la forme exacte que `MixcloudImporter` consomme :
`feed=%2Frichardfoe%2Fjapanese-synth-pop-boogie-electro-mix%2F` une fois décodé
donne `/richardfoe/japanese-synth-pop-boogie-electro-mix/`. Les embeds SoundCloud
pointent `https://api.soundcloud.com/tracks/<id>`, un hôte que
`SoundcloudImporter.matches()` accepte déjà (`endsWith('.soundcloud.com')`).

**Le contraste avec le forum entier justifie le périmètre restreint.** Sur les 50
dernières discussions de l'étiquette « musique », toutes personnes confondues, 32
sont des albums Bandcamp et seulement 13 des mix Mixcloud/SoundCloud. Une
ingestion globale aurait noyé Tambouille sous des disques qui ne sont pas des
mix. Le compte de `nota` a le profil inverse : 14 mix sur 24 posts.

**La taxonomie « Radio » existe mais ne peut pas servir de filtre.** L'extension
Flamarkt définit dix taxonomies (`Radio`, `Personne`, `Label`, `Ville`, `Année`…).
`Radio` porte des noms d'émissions (« SEER Radio ») et serait sémantiquement le
bon critère, mais :

- elle est peu appliquée — 1 discussion sur 20 sur la première page de
  `/t/musique` ;
- `/api/flamarkt/taxonomies` répond `403` en anonyme, et aucune forme de
  `filter[taxonomy:…]` n'est acceptée ;
- la relation `taxonomyTerms` est bien servie sur les discussions, mais sans
  dire à quelle taxonomie chaque terme appartient — la correspondance n'est
  lisible que dans le payload HTML de la page.

**Décision : le critère de sélection est l'embed ; la taxonomie Radio enrichit.**
Un terme Radio présent rejoint les tags du mix. Absent, il ne retire rien.

**FoF Webhooks n'émet qu'aux formats Discord, Slack et Teams**, et ne laisse
configurer qu'une URL — pas d'en-têtes. Un format libre demanderait l'extension
payante Webhooks PRO.

**Conséquence de conception, et elle est structurante : le webhook ne transporte
rien.** Il sonne, et Tambouille relit l'API Flarum pour connaître la vérité. Le
format de la charge utile devient donc sans importance, et le déclencheur devient
remplaçable — cron, bouton, visite — sans toucher au reste.

## Architecture

Cinq pièces, dont trois minuscules.

### `User.incongruesUsername`

Une colonne `String?  @unique` sur `User`, plus un champ dans les réglages du
profil. C'est tout le lien de compte.

Nullable : personne d'autre que l'auteur n'en a besoin. Unique : deux comptes
Tambouille revendiquant le même pseudo forum se voleraient mutuellement les mix,
et la contrainte est ce qui tient sous concurrence — pas une vérification
préalable.

### `FlarumClient`

Un client de lecture, deux méthodes :

- `listByAuthor(username)` → les discussions de ce compte ;
- `getDiscussion(id)` → une discussion.

Toutes deux sur l'API publique avec `include=firstPost,taxonomyTerms`, et via
`safeFetch` — comme tout appel sortant du projet.

### `MusiquesIncongruesImporter`

Un `SourceImporter` de plus, à côté des sept existants.

`matches(url)` reconnaît l'hôte `musiques-incongrues.net` et le chemin
`/d/<id>-<slug>`. Un test d'hôte, pas de sous-chaîne.

`resolve(url)` lit la discussion, extrait l'embed du premier message, et
**délègue** :

```
mixcloud   → MixcloudImporter.importItem('/compte/slug/')
soundcloud → SoundcloudImporter.importItem('https://api.soundcloud.com/tracks/<id>')
autre      → BadRequestException nommant ce qui a été trouvé
```

**Priorité, quand un post porte plusieurs embeds : `mixcloud`, puis
`soundcloud`, puis rejet.** L'ordre est celui de la richesse des métadonnées —
Mixcloud donne durée, tags et tracklist là où l'oEmbed SoundCloud n'en donne
aucun. Un post de l'échantillon porte à la fois Bandcamp et SoundCloud ; sans
règle explicite, le résultat dépendrait de l'ordre du HTML rendu.

Il reprend le `MixImport` du délégué et n'y touche que sur deux points :

- **`sourcePageUrl` devient l'URL de la discussion du forum.** C'est elle qui
  publie ce mix, et c'est elle qui ne bougera pas si Mixcloud réhéberge son
  audio. C'est aussi le second critère de `findBySource`.
- **Le terme de la taxonomie Radio, présent, rejoint les tags.**

Le titre, l'artiste, la durée, la pochette et la tracklist restent ceux du
délégué : ils sont plus riches et mieux structurés que le titre du forum.

**Placement dans `SOURCE_IMPORTERS` : avant `PodcastImporter`.** Le commentaire
d'`imports.module.ts` le dit déjà — `PodcastImporter` réclame toute URL https et
doit rester dernier ; tout ce qui est placé après lui n'est jamais atteint.

Bénéfice indépendant de l'automatisme : coller une URL du forum dans le
formulaire d'import de Tambouille marchera.

### `IncongruesSyncService`

La boucle de réconciliation. Pour chaque discussion de l'auteur lié :

```
MusiquesIncongruesImporter.resolve()   → MixImport, ou rejet motivé
MixesService.findBySource(ref, pageUrl) → trouvé ? on s'arrête là
MixesService.createFromImport(userId, …) → le mix paraît
```

**L'idempotence ne demande aucun état.** `findBySource` interroge la base, seule
source de vérité sur ce qui a déjà été importé. Pas de curseur « dernière
discussion vue » à tenir, donc pas de curseur à réparer quand il dérive. Rejouer
la synchronisation dix fois ne crée rien de plus.

**Chaque discussion est traitée dans son propre `try`.** Un cloudcast supprimé
chez Mixcloud ne doit pas empêcher les treize autres de paraître.

**Les rejets sont le cas normal, pas des erreurs.** 10 des 24 discussions n'ont
pas d'embed exploitable ; elles partent en journal `debug` avec le motif exact
(« embed bandcamp, ignoré »). Seuls les vrais incidents — Mixcloud injoignable,
réponse illisible — passent en `warn`. Sans cette distinction, le journal serait
à 40 % de bruit dès le premier passage et personne n'y lirait plus rien.

**Un verrou de sérialisation par utilisateur** empêche deux synchronisations
simultanées de franchir toutes deux `findBySource` avant que l'une ait écrit. Le
projet n'a ni file d'attente ni `Throttler` ; une promesse gardée en mémoire
suffit à cette échelle.

### `IncongruesWebhookController`

`POST /webhooks/musiques-incongrues/:secret`, hors `JwtAuthGuard`.

**Le secret est dans l'URL, et c'est imposé** : FoF Webhooks ne laisse
configurer qu'une URL, pas d'en-têtes. `INCONGRUES_WEBHOOK_SECRET` en variable
d'environnement, lue via `process.env` — le projet n'utilise pas de
`ConfigService`, et ce design ne l'introduit pas pour une seule clé.

**Conséquence à assumer : cette URL est un mot de passe.** Elle ne doit
apparaître ni dans les journaux d'accès, ni dans un dépôt. La comparaison se
fait en temps constant, et un secret absent ou faux répond `404` — un `401`
confirmerait que la route existe.

Le risque résiduel reste faible par construction : la route ne lit pas sa charge
utile et ne sait faire qu'une chose, relire les discussions de l'auteur lié.
Quelqu'un qui trouverait l'URL ne pourrait que déclencher une resynchronisation
de posts déjà publics.

**Un anti-rebond** : une sonnerie survenue moins d'une minute après la précédente
ne relance rien. La route est publique et déclenche des appels sortants ; c'est
la garde la moins chère contre une boucle.

### Filet de rattrapage

**Le webhook seul perd des mix en silence.** S'il part pendant que Mixcloud est
indisponible, ou si FoF Webhooks rate l'événement, rien ne repassera derrière.

La même `IncongruesSyncService` est donc aussi déclenchée à la visite de l'auteur
sur Tambouille, si le dernier passage remonte à plus d'une heure — exactement le
motif déjà écrit dans `veille.service.ts` (`CACHE_TTL_MS`). Trois lignes, aucune
infrastructure, et un dispositif qui se rattrape tout seul.

## Amélioration ciblée du code existant

Aujourd'hui, la logique « transformer un `MixImport` en mix créé » vit dans
`mixes.controller.ts` (lignes 287-298) : c'est le contrôleur qui appelle
`CoverImportService.importFromUrl()` quand la pochette est distante, avant de
passer `files.coverUrl` à `MixesService.create()`.

Si `IncongruesSyncService` réimplémente ce bout, les deux chemins divergeront au
premier changement — un mix importé à la main aurait sa pochette, un mix
automatique non.

**Extraction en `MixesService.createFromImport(userId, mixImport)`**, appelée par
le contrôleur et par le service de synchronisation. C'est un déplacement, pas une
réécriture, et strictement au service de ce qui est construit ici.

## Flux de bout en bout

```
nota poste sur le forum
  └→ FoF Webhooks « Discussion Started »
       └→ POST /webhooks/musiques-incongrues/<secret>
            └→ anti-rebond, puis verrou
                 └→ IncongruesSyncService.sync(user)
                      └→ FlarumClient.listByAuthor('nota')
                           └→ pour chaque discussion :
                                resolve()       → MixImport ou rejet journalisé
                                findBySource()  → déjà là ? on s'arrête
                                createFromImport() → le mix paraît
```

Le même `sync()` est atteint par la visite quand le dernier passage date de plus
d'une heure.

## Tests

Écrits en TDD, selon la convention déjà en place dans `imports/` : fixtures
figées depuis de vraies URL, `safe-fetch` moqué, fonctions de parsage exportées
et testées isolément.

### Fixtures à figer

```
mi-discussion-mixcloud.json    une des 14 (ex. Japanese Synth Pop)
mi-discussion-soundcloud.json  embed api.soundcloud.com/tracks/<id>
mi-discussion-bandcamp.json    le rejet le plus fréquent
mi-author-nota.json            listByAuthor : les 24, dont les 10 à écarter
```

### Niveau 1 — parsage (`extractEmbed`, fonction pure exportée)

| Entrée | Attendu |
|---|---|
| iframe mixcloud, `feed` percent-encodé | `{ mixcloud, '/richardfoe/japanese…/' }` |
| `feed` avec accents (`déviances-w-witxes`) | clé décodée correctement |
| iframe soundcloud api | `{ soundcloud, 'https://api.soundcloud.com/…' }` |
| span bandcamp | `null` |
| bandcamp **et** soundcloud dans le même post | `{ soundcloud, … }` |
| aucun embed | `null` |

L'avant-dernier cas mérite son test : un post de l'échantillon porte les deux, et
sans règle explicite le résultat dépendrait de l'ordre du HTML. **Le lisible
gagne.**

### Niveau 2 — reconnaissance d'URL

Les mêmes gardes que la spec Ouïedire, qui a déjà rencontré ces pièges :

| URL | Attendu |
|---|---|
| `https://www.musiques-incongrues.net/d/15633-seer-…` | `true` |
| `https://musiques-incongrues.net/d/15633` | `true` |
| `https://www.musiques-incongrues.net/t/musique` | `false` |
| `https://evil.test/?x=musiques-incongrues.net/d/1` | `false` |

### Niveau 3 — l'importeur

`safeFetch` moqué sur les fixtures, délégués moqués. Trois assertions portent la
conception :

- `sourcePageUrl` vaut la discussion du forum, **pas** l'URL Mixcloud rendue par
  le délégué ;
- le terme Radio rejoint les tags quand il est là, et son absence ne casse rien ;
- un post Bandcamp lève une `BadRequestException` dont le message nomme ce qui a
  été trouvé.

### Niveau 4 — la synchronisation

Tout moqué. Ce sont les tests qui comptent le plus :

- discussion inconnue → `createFromImport` appelé une fois ;
- la même rejouée → `findBySource` la trouve, `createFromImport` **jamais**
  appelé ;
- la troisième discussion lève → les autres passent, l'échec part en `warn` ;
- post Bandcamp → rien créé, journal `debug`, **pas** de `warn` ;
- deux sonneries concurrentes → une seule passe, l'autre attend le verrou ;
- deux sonneries à dix secondes d'écart → la seconde ne relance rien.

### Niveau 5 — le webhook

- mauvais secret → `404`, `IncongruesSyncService` jamais appelé ;
- bon secret → appelé une fois ;
- charge utile absurde ou vide → réussit quand même.

Le dernier verrouille la propriété qui rend le format Discord sans importance.

### Ce qui n'est pas testé

L'API Flarum réelle et les oEmbed Mixcloud/SoundCloud. Ces réponses sont figées
en fixtures. Un test qui appelle le réseau échoue un jour sans que le code ait
bougé, et le projet a déjà fait ce choix partout ailleurs.

## Migration

Une seule, d'une colonne :

```prisma
incongruesUsername String? @unique
```

Aucune reprise de données. Les mix déjà saisis à la main pour des discussions du
forum ne portent pas `sourcePageUrl` vers `musiques-incongrues.net` ; ils seront
donc reconnus comme doublons par le premier critère de `findBySource`
(`sourceRef`, la clé du cloudcast) — qui est justement le critère le plus sûr.

## Configuration hors dépôt

Deux gestes, une fois :

1. `INCONGRUES_WEBHOOK_SECRET` dans l'environnement de production o2switch.
2. Dans l'administration Flarum, FoF Webhooks → nouvelle entrée, URL
   `https://<api>/webhooks/musiques-incongrues/<secret>`, événement
   « Discussion Started ».

## Ce qui n'est pas fait

**Les autres membres du forum.** Le dispositif est un lien de compte personnel.
Rien n'empêche d'en ouvrir d'autres plus tard — `incongruesUsername` est une
colonne sur `User`, pas une constante — mais publier automatiquement le contenu
d'autrui poserait des questions de modération que ce design n'aborde pas.

**Bandcamp et YouTube.** Ni l'un ni l'autre n'a d'importeur de mix dans
Tambouille, et un album Bandcamp n'est pas un mix. Ils sont écartés, avec un
journal qui le dit.

**La mise à jour d'un mix déjà importé.** Si le post du forum est corrigé après
coup, Tambouille ne le suit pas. `findBySource` le reconnaît et s'arrête. Une
synchronisation bidirectionnelle est un autre sujet, avec sa propre question de
qui gagne en cas de divergence.
