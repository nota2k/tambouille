# Récupérer les infos depuis la source — conception courte

**Pourquoi.** Un import peut rater un morceau — une pochette Ouïedire non
importée le 14 novembre, par exemple — et une source peut évoluer après coup.
Il faut pouvoir, depuis « Modifier le mix », relire la source et reprendre ses
infos.

**Ce que fait le bouton** (choix de Nelly) : il remplace **tout** dans le
formulaire — titre, artiste, description, tags, tracklist, pochette — **sans
enregistrer**. « Enregistrer » ou « Annuler » tranchent ensuite.

**Approches considérées.**
- Côté serveur — retenue : `POST /mixes/:id/source` relit `sourcePageUrl` et
  retrouve le mix dans la source.
- Côté navigateur, par `/imports/resolve` — écartée : un flux podcast rend une
  liste d'épisodes qui ne porte pas l'adresse du fichier audio, impossible d'y
  retrouver le mix ; c'est justement le cas cité.

**La conception.**
- `POST /mixes/:id/source`, propriétaire seul (403 sinon, 404 sans mix). Sans
  `sourcePageUrl` : 400 « Ce mix n'a pas de source à relire ». Rend un
  `MixImport`.
- `ImportsService.refetch(pageUrl, sourceRef)` choisit l'importeur par
  `pageUrl`. Un importeur peut fournir `refetch?(pageUrl, sourceRef)` :
  - podcast : une lecture du flux, épisode dont l'enclosure vaut `sourceRef` ;
  - Archive.org : l'identifiant et le fichier se lisent dans `sourceRef`.
  Sinon `resolve(pageUrl)` : un mix est rendu tel quel ; une liste donne 404
  « Ce mix n'a pas été retrouvé dans sa source ».
- `PATCH /mixes/:id` accepte `coverSourceUrl` : sans fichier envoyé, la
  pochette est téléchargée et stockée comme à l'import
  (`CoverImportService.resolveCoverUrl`). Un fichier l'emporte. Un
  téléchargement raté laisse la pochette actuelle.
- `EditMixView` : bouton « Récupérer depuis la source », visible seulement si
  le mix a une `sourcePageUrl` ; il remplit les champs comme `applyImport`
  d'`UploadView`, affiche la nouvelle pochette en aperçu, et l'envoie en
  `coverSourceUrl` à l'enregistrement si aucun fichier n'est choisi.

**Hors périmètre.** Changer la source audio (`sourceType`, `sourceRef`) ; les
mix sans source (fichier envoyé, lien direct vers un fichier audio).
