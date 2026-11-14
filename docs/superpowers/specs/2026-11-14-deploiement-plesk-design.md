# Déploiement sur Plesk — conception

## Pourquoi

Tambouille a quitté o2switch (cPanel) pour un serveur Plesk mutualisé
(pastis-hosting, 167.86.109.6). La tâche `deploy` de la CI appelle toujours
l'API cPanel : elle échoue en 403, et rien n'a été mis en ligne depuis le
30 août. Le but est que chaque fusion sur `main` reparte en production, seule,
et que la CI dise vrai sur le résultat.

## L'installation trouvée sur le serveur

- Abonnement `tambouille.pantagruweb.club`, utilisateur système `tambouille`.
- API : `~/api.tambouille.pantagruweb.club/`, lancée par Passenger (Node.js
  Toolkit de Plesk) via `app.js` → `dist/src/main.js`. Node 22 dans
  `/opt/plesk/node/22/bin`. Redémarrage : toucher `tmp/restart.txt`.
- Front : `~/httpdocs/` (le contenu de `frontend/dist`, `.htaccess` compris).
- À ne jamais toucher : `.env`, `uploads/` (222 Mo), `public/`, `tmp/`.
- `node_modules` est un vrai répertoire : `npm ci --omit=dev` est permis, ce
  qui n'était pas le cas sous CloudLinux.
- PostgreSQL local, 21 migrations appliquées. `prisma migrate` fonctionne sur
  ce serveur (vérifié avec `migrate status`), contrairement à o2switch.
- `nellybabtb` (l'abonnement `nellybabillon.fr`) a les droits rwx sur le
  dossier par ACL.

## Approches considérées

- **SSH depuis la CI** — retenue. La CI construit, envoie, lance le script et
  lit son code de retour : elle sait si le déploiement a réussi.
- Extension Git de Plesk — écartée : la CI n'aurait aucun retour, et il
  faudrait garder la branche `production` et régler finement l'extraction pour
  ne pas écraser `.env` ni `uploads/`.

Compte SSH : **`nellybabtb`, avec une clé de déploiement bridée** (choix de
Nelly). `tambouille` n'a pas de clé autorisée, et son dossier en 770 (pour
l'ACL de `nellybabtb`) ferait refuser toute clé par sshd.

## La conception

1. **Une clé dédiée**, `tambouille-deploy`, générée pour l'occasion. Sa moitié
   publique entre dans `~/.ssh/authorized_keys` de `nellybabtb` avec
   `restrict,command="…/deploy-tambouille.sh"` : elle ne peut que lancer ce
   script, ni shell, ni redirection. La moitié privée devient le secret GitHub
   `PLESK_SSH_KEY` ; l'hôte va dans `PLESK_SSH_HOST`, l'empreinte du serveur
   dans `PLESK_SSH_KNOWN_HOSTS`.
2. **La CI** garde ses trois vérifications et la construction. Elle empaquette
   `backend/dist`, `backend/generated`, `backend/prisma`,
   `backend/package*.json`, `frontend/dist` et les fournées en une archive, et
   l'envoie sur l'entrée standard de la connexion SSH.
3. **Le script serveur** (`deploy/plesk-deploy.sh`, versionné ; une copie
   installée hors du site est ce que la clé lance) :
   - déballe l'archive dans un répertoire de transit ;
   - applique les migrations (`prisma migrate deploy`) **avant** de remplacer
     le code, et s'arrête en cas d'échec — l'ancien code continue de tourner ;
   - remplace un par un, nommément, `dist`, `generated`, `prisma`, `fournees`
     et les fichiers de `httpdocs`, sans jamais toucher `.env`, `uploads/`,
     `public/`, `tmp/` ;
   - lance `npm ci --omit=dev` seulement si le verrou a changé ;
   - touche `tmp/restart.txt`.
4. **La CI vérifie** ensuite que l'API et le site répondent, comme aujourd'hui.
5. **Ce qui disparaît** : la branche `production`, `.cpanel.yml`,
   `deploy/o2switch-deploy.sh`, les secrets `O2SWITCH_*`, et la section
   o2switch de `backend/README.md`, réécrite pour Plesk.

## Non-objectifs

- Pas de déploiement sans coupure : Passenger redémarre, comme avant.
- Pas de changement du `.env` de production (le SMTP pointe encore sur
  o2switch : à traiter à part).

## Laissé au constructeur

- Le format exact de l'archive et le répertoire de transit.
- L'emplacement de la copie du script lancée par la clé (hors de la racine
  web).
- La remise en route manuelle par `workflow_dispatch` avec `ref`, conservée.
