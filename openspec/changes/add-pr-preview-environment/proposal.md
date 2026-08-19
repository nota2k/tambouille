## Why

Une proposition de fusion se relit aujourd'hui sur du texte. Les trois
vérifications disent que le code compile, se formate et passe ses tests ; aucune
ne montre ce que le changement fait à l'écran. Sur un dépôt dont la vue la plus
modifiée est `DiscoverView` — 21 commits, une grille de pochettes — c'est
précisément la partie qu'on ne peut pas relire.

L'occasion est là parce que le déploiement vient d'être automatisé : la prod
n'est plus un endroit qu'on touche à la main, et un second environnement cesse
d'être un chantier pour devenir une variante d'un chemin déjà écrit.

## What Changes

- Un **emplacement d'aperçu unique**, à URL fixe, réécrit à chaque poussée sur
  une proposition de fusion. La dernière poussée prend l'emplacement ; les
  autres attendent. Un seul aperçu vit à la fois, délibérément.
- Une **tâche `apercu`** dans `.github/workflows/ci.yml`, non bloquante, qui
  migre la base d'aperçu, la sème, déclenche le déploiement des deux services
  et commente la proposition avec l'URL **et le commit servi**.
- Un **script de semence** (`backend/prisma/seed.ts`) qui reconstruit une
  Tambouille de démonstration depuis les fixtures d'importeurs déjà présentes
  au dépôt, plus une petite communauté fictive écrite à la main. Idempotent :
  il doit produire le même site sur une base vide comme sur une base déjà
  semée.
- Deux services **Render** en offre gratuite — un service web pour l'API, un
  site statique pour le front — et un **bucket R2 d'aperçu** distinct de celui
  de la production.
- La tâche `apercu` lit des secrets pendant une `pull_request`. L'exigence
  existante de `continuous-integration` reste vraie telle quelle — elle ne
  contraint que l'ensemble **bloquant**, qui ne change pas. Ce qui manque, et
  qui est ajouté, c'est la contrainte symétrique sur les autres tâches : celle
  qui lit un secret ne s'exécute jamais sur du code venu d'un fork.

## Capabilities

### New Capabilities
- `pull-request-preview`: ce que le dépôt donne à voir d'une proposition de
  fusion avant qu'elle soit fusionnée — l'emplacement unique et sa règle de
  préemption, ce que l'aperçu contient (une base semée, jamais celle de la
  production), ce qu'il ne vérifie pas, et son rattachement à la proposition.

### Modified Capabilities
- `continuous-integration`: **une exigence ajoutée**, aucune modifiée. Le texte
  actuel restreint déjà sa contrainte de secrets à l'ensemble bloquant ; ce
  qu'il ne dit pas, c'est ce qu'il advient des autres tâches. L'ajout l'énonce :
  une tâche qui lit un secret ne s'exécute jamais sur une proposition venue d'un
  fork, et sa condition nomme les cas où elle s'exécute plutôt que d'écarter
  ceux où elle ne le doit pas.

## Impact

- `.github/workflows/ci.yml` — une tâche ajoutée, aucune tâche existante
  modifiée.
- `backend/prisma/seed.ts` — nouveau. Réemploie les parseurs déjà exportés des
  importeurs (`parseFeed` et consorts), qui sont purs et testés contre des
  fixtures gelées : aucun accès réseau, aucun site tiers dans le chemin.
- `render.yaml` — nouveau, à la racine. Aucun `Dockerfile` : Render construit
  les deux paquets avec les scripts npm déjà présents.
- Aucune modification du code applicatif. Vérifié : le backend n'ouvre aucun
  fichier hors le montage statique `/uploads` de `main.ts`, et
  `start:prod` existe déjà.
- Secrets ajoutés au dépôt : deux crochets de déploiement Render, la chaîne de
  connexion de la base d'aperçu, les identifiants du bucket R2 d'aperçu.
- Rien de ce qui touche la production ne change : ni `deploy`, ni
  `.cpanel.yml`, ni `deploy/o2switch-deploy.sh`, ni le bucket R2 de production.
