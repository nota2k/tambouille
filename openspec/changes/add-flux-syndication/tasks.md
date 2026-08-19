## 1. Socle du module

- [x] 1.1 Créer `backend/src/feeds/` avec `FeedsModule`, l'enregistrer dans `AppModule`
- [x] 1.2 Définir le contrat `FeedChannel` / `FeedItem` (`feed.types.ts`) : titre, description, lien, image, items ; un item porte guid, titre, lien, URL d'enclosure, date, description texte, durée et image optionnelles
- [x] 1.3 Écrire `FeedBuilder` (`feed.builder.ts`) : `FeedChannel` → XML RSS 2.0 + espace de noms `itunes`, via `XMLBuilder` de `fast-xml-parser`, avec le commentaire nommant le plafond `length="0"` et sa sortie (colonne `sizeBytes`)
- [x] 1.4 Test unitaire du constructeur : document bien formé, esperluette et chevrons dans un titre, durée omise quand elle est inconnue, image d'item omise quand il n'y en a pas, item sans `enclosure` quand l'audio n'est pas adressable

## 2. Résolution de l’audio

- [x] 2.1 Écrire `audioUrlFor(mix)` : URL publique R2 pour un mix hébergé, `sourceRef` pour `remote`, `null` pour `mixcloud` — un seul endroit décide si l'audio est adressable ; `null` ne retire pas le mix du flux, il retire l'`enclosure` de son item
- [x] 2.2 Ajouter `GET /api/mixes/:id/audio` : 302 vers l'URL résolue, 404 sur mix inexistant ou dont l’audio n’est pas adressable
- [x] 2.3 Tests : les trois natures de source, et le mix inexistant

## 3. Rendu HTTP

- [x] 3.1 Servir les flux en `application/rss+xml; charset=utf-8` (sortir de la sérialisation JSON par défaut de Nest)
- [x] 3.2 Calculer l'`ETag` faible depuis (nombre d'items, plus grande `updatedAt` du périmètre), poser `Cache-Control: public, max-age=900`, répondre 304 sur `If-None-Match` correspondant
- [x] 3.3 Construire les URL absolues : `FRONTEND_URL` pour les liens de page, protocole et hôte de la requête pour les enclosures
- [x] 3.4 Tests : en-têtes du premier appel, 304 sur rappel inchangé, corps complet après modification

## 4. Les quatre périmètres

- [x] 4.1 Résolveur site : 50 mix les plus récents, du plus récent au plus ancien
- [x] 4.2 Résolveur curateur : par nom d'utilisateur, 404 si inconnu ou si le nom d'utilisateur est nul ; titre et image tirés du profil
- [x] 4.3 Résolveur playlist : ordre des positions, 50 premiers, 404 si inconnue
- [x] 4.4 Brancher les trois routes sur `FeedsController` ; vérifier qu'aucun mix n'est omis, que l'item d'un mix Mixcloud porte lien et description sans `enclosure`, et que la description du flux annonce que certains épisodes s'écoutent sur le site
- [x] 4.5 Tests d'intégration des trois flux : périmètre mixte (cinq items, trois enclosures), périmètre entièrement Mixcloud (autant d'items que de mix, zéro enclosure), 404, ordre, troncature à 50

## 5. Fournées

- [x] 5.1 Écrire le lecteur de fournées du backend (frontmatter restreint : scalaires, listes en ligne), chemin du dossier lu dans une variable d'environnement avec valeur par défaut relative au dépôt
- [x] 5.2 Test lisant les fichiers réels de `frontend/src/content/fournees/` : chacun s'analyse, garde-fou contre la divergence des deux analyseurs
- [x] 5.3 Résolveur fournée : par numéro, ordre du fichier, déduplication des identifiants répétés en gardant la première occurrence, servi hors de sa fenêtre de publication
- [x] 5.4 `GET /api/fournees/:numero/rss` : 404 sur numéro inconnu, erreur serveur nommant le fichier fautif si un fichier est illisible
- [x] 5.5 Tests : ordre, doublon, fournée périmée servie, numéro inconnu, fichier illisible

## 6. Déploiement

- [x] 6.1 Ajouter dans `deploy/o2switch-deploy.sh` la copie de `frontend/src/content/fournees` à côté du backend, et documenter la variable de chemin dans `backend/README.md`
- [ ] 6.2 Vérifier après déploiement que les quatre URL rendent un document analysable en production _(bloqué : demande une fusion sur `main` puis un déploiement)_

## 7. Frontend et documentation

- [x] 7.1 Ajouter les `<link rel="alternate" type="application/rss+xml">` sur les pages concernées (accueil, profil, playlist, fournée)
- [x] 7.2 Ajouter un lien d'abonnement visible sur ces mêmes pages
- [x] 7.3 Documenter les quatre flux dans `README.md` : URL, limite de 50 items, présence des mix Mixcloud sans `enclosure`

## 8. Vérification finale

- [x] 8.1 Passer les quatre flux au validateur du W3C (ou équivalent hors ligne)
- [ ] 8.2 S'abonner depuis un vrai client de podcast et lire un épisode de bout en bout _(bloqué : demande une URL publique, donc le déploiement de 6.2)_
- [x] 8.3 `npm run lint` et `npm test` verts sur `backend` et `frontend`
