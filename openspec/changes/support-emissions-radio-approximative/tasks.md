## 1. Fixtures

- [ ] 1.1 Capturer `backend/src/imports/__fixtures__/radio-approximative-channel.html` : la page `/radiopulsar`, tronquée à quelques émissions, en gardant la forme exacte des `<li><a href="/radiopulsar/…">#NNN</a>` et le `<hr />` qui les sépare
- [ ] 1.2 Capturer `radio-approximative-manifest.txt` : un manifeste markdown récent (#076), avec sa section « Liens » et une ligne à deux séparateurs
- [ ] 1.3 Capturer `radio-approximative-manifest-bare.txt` : une playlist nue sans en-tête (#020), avec au moins une ligne sans titre après le tiret
- [ ] 1.4 Capturer `radio-approximative-manifest-md5.txt` : les sommes de contrôle de #002, qui ne doivent produire aucune piste

## 2. Analyse d'adresse et de manifeste (fonctions pures, testées d'abord)

- [ ] 2.1 `parseRadioApproximativeUrl(url)` : `{ kind: 'channel' | 'show', channel, id? }` ou `null` — hôte exact, deux formes de chemin seulement, motifs de chaîne et d'identifiant contraints, racine non réclamée (spec « Reconnaissance des adresses »)
- [ ] 2.2 `parseShowId(id)` : `{ channel, number, date? }` depuis `musiqueapproximative_radiopulsar_076_20180703132019` — une date de 14 chiffres invalide ou de longueur inattendue (#023 : `2016230505000000`) rend `date` indéfinie sans faire échouer l'analyse (design, décision 3)
- [ ] 2.3 `radioApproximativeTitle(...)` : `Radio Approximative #76 — Radiopulsar, 2018-07-03`, et sans le fragment de date quand elle est illisible
- [ ] 2.4 `parseRadioApproximativeTracks(manifest)` : ne retient que les lignes `[HH:MM:SS]`, coupe au premier ` - ` strict, replie une ligne sans séparateur en titre sans artiste (spec « Lecture de la tracklist », design décisions 2 et 5)
- [ ] 2.5 Tests de `parseRadioApproximativeTracks` sur les trois fixtures de manifeste : ligne ordinaire, ligne à deux séparateurs, ligne sans titre, puces de la section « Liens » ignorées, manifeste md5 rendant une liste vide

## 3. L'importeur

- [ ] 3.1 `RadioApproximativeImporter implements SourceImporter`, `name = 'radioapprox'`, `matches()` déléguant à 2.1
- [ ] 3.2 `importItem(ref)` : revalider la référence comme le fait `LylImporter` (l'endpoint est atteignable avec un `ref` arbitraire), puis lire `/collections/channels/<chaîne>/<id>.txt` via `safeFetch`
- [ ] 3.3 Attraper `NotFoundException` sur ce seul GET et poursuivre avec une tracklist vide ; laisser remonter les autres échecs (design, décision 8) — commenter pourquoi
- [ ] 3.4 Composer le `MixImport` : titre reconstruit, `artist` = `Radio Approximative`, tags station + chaîne, pochette `/images/logo.png`, `sourceType: 'remote'`, `sourceRef` = URL du mp3 dérivée de l'identifiant, `sourcePageUrl` = page de l'émission, `durationSec` omis (design, décision 4) — commenter l'omission de la durée avec le contre-exemple #005
- [ ] 3.5 `resolve()` : router vers l'émission ou vers la liste de chaîne
- [ ] 3.6 Énumération de chaîne : lire la page de chaîne, en extraire les `href="/<chaîne>/<id>"` dans l'ordre publié, produire un `SourceItem` par émission (référence encodée via `encodeRef`, titre distinct, pochette, `publishedAt` quand la date est lisible), sans lire aucun manifeste ; chaîne vide ou inconnue → `NotFoundException` nommant l'absence
- [ ] 3.7 Tests de l'importeur sur fixtures, `safeFetch` bouchonné : émission complète, manifeste 404 → tracklist vide, manifeste md5 → tracklist vide, liste de chaîne, chaîne inconnue, référence hors forme refusée sans requête réseau, racine du site non réclamée

## 4. Branchement

- [ ] 4.1 Enregistrer l'importeur dans `imports.module.ts`, avant `PodcastImporter` (design, décision 7)
- [ ] 4.2 Citer Radio Approximative dans le message « Sources gérées : … » de `imports.service.ts`, et ajuster son test
- [ ] 4.3 Citer la source côté front : `src/content/elsewhere.md`, `UploadView.vue`, `MixDetailView.vue`, et les tests qui énumèrent les sources

## 5. Vérification

- [ ] 5.1 Suites de tests backend et frontend au vert
- [ ] 5.2 Contre le site réel : importer #076 (manifeste complet), #020 (playlist nue), #002 (md5) et #001 (manifeste 404) — les quatre préremplissent le formulaire, seul #076 apporte une tracklist
- [ ] 5.3 Contre le site réel : coller `/radiopulsar`, vérifier que le sélecteur liste les émissions sans rien importer, et qu'un clic n'en importe qu'une
- [ ] 5.4 Lire un mix importé de bout en bout dans le lecteur (source distante, requêtes `Range`)
