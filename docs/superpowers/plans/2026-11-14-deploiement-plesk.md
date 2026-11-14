# Déploiement sur Plesk — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** chaque fusion sur `main` repart en production sur le serveur Plesk, par SSH, et la CI échoue si le déploiement échoue.

**Architecture:** la CI construit, empaquette les artefacts en une archive tar.gz, et l'envoie sur l'entrée standard d'une connexion SSH en `nellybabtb`. La clé utilisée est bridée par une commande forcée : un point d'entrée fixe, installé une fois sur le serveur, déballe l'archive dans un répertoire de transit puis exécute le `deploy/plesk-deploy.sh` **contenu dans l'archive** (le script lancé est donc toujours le dernier publié). Ce script applique les migrations, remplace le code nommément, réinstalle si le verrou change, et redémarre Passenger.

**Tech Stack:** GitHub Actions, bash, ssh/tar, Prisma 7 CLI via `npx`, Node 22 de Plesk (`/opt/plesk/node/22/bin`), Passenger.

**Spec:** `docs/superpowers/specs/2026-11-14-deploiement-plesk-design.md`

## Global Constraints

- Serveur : `167.86.109.6`, utilisateur SSH `nellybabtb`.
- Racine Tambouille : `/var/www/vhosts/tambouille.pantagruweb.club` ; API dans `api.tambouille.pantagruweb.club/`, front dans `httpdocs/`.
- Ne jamais toucher : `api…/.env`, `api…/uploads/`, `api…/public/`, `api…/tmp/` (sauf `tmp/restart.txt`), ni rien hors de la racine Tambouille.
- Remplacements nommés un par un, jamais de joker ni de `rm -rf` sur un répertoire parent.
- Les migrations passent **avant** le remplacement du code ; si elles échouent, le script sort en erreur et l'ancien code continue de tourner.
- Secrets GitHub : `PLESK_SSH_KEY`, `PLESK_SSH_HOST`, `PLESK_SSH_KNOWN_HOSTS`.
- Messages et commentaires en français, dans le ton des fichiers existants.
- Ajouter une clé sur le serveur, poser ou supprimer des secrets, supprimer la branche `production` : **demander l'accord de Nelly juste avant**.

## Review Focus

- Une migration qui échoue : l'API en ligne doit rester sur l'ancien code, non redémarrée → test « migration en échec ».
- Un verrou npm inchangé : pas de `npm ci` (lent, et `node_modules` en cours d'usage) → test « verrou inchangé ».
- Deux déploiements qui se suivent : le répertoire de transit d'un déploiement précédent ne doit pas polluer le suivant → le point d'entrée vide le transit avant de déballer (test « transit déjà présent »).
- Une archive incomplète (un répertoire attendu absent) : arrêt avant toute modification → test « archive incomplète ».
- La clé utilisée pour autre chose qu'un déploiement (`ssh … bash`) : la commande forcée l'ignore → vérification manuelle en tâche 3.

---

### Task 1: Le script serveur et son test

**Files:**
- Create: `deploy/plesk-deploy.sh`
- Create: `deploy/plesk-entry.sh`
- Create: `deploy/plesk-deploy.test.sh`
- Modify: `.github/workflows/ci.yml` (job `backend` : une étape qui lance le test)

**Interfaces:**
- Produces : `deploy/plesk-deploy.sh <source>` où `<source>` est la racine de l'archive déballée (`<source>/backend/{dist,generated,prisma,package.json,package-lock.json}`, `<source>/frontend/dist`, `<source>/frontend/src/content/fournees`). Variables lues : `TAMBOUILLE_HOME` (défaut `/var/www/vhosts/tambouille.pantagruweb.club`), `NODE_BIN` (défaut `/opt/plesk/node/22/bin`, préfixé au `PATH`). Code de sortie 0 seulement si tout est fait.
- Produces : `deploy/plesk-entry.sh`, lancé par la commande forcée, sans argument : vide puis crée `$HOME/tambouille-deploy/transit`, y déballe `tar xz` depuis l'entrée standard, puis `exec bash transit/deploy/plesk-deploy.sh transit`. Variable lue : `DEPLOY_WORK` (défaut `$HOME/tambouille-deploy`), pour le test.

Ordre des opérations dans `plesk-deploy.sh` :
1. vérifier que chaque élément attendu de `<source>` existe, sinon sortir 1 sans rien modifier ;
2. remplacer `api…/prisma` (le schéma n'est pas lu par l'appli en marche) ;
3. dans `api…/`, `DATABASE_URL` lu depuis `.env`, puis `npx --yes prisma@<devDependencies.prisma du package.json de la source> migrate deploy` ; échec → sortie 1 ;
4. remplacer `dist`, `generated`, `fournees` dans `api…/`, copier `package.json` et `package-lock.json` ;
5. si `package-lock.json` diffère de `package-lock.json.deployed` : `npm ci --omit=dev`, puis copier le verrou en `.deployed` ;
6. dans `httpdocs/` : remplacer `assets/` et `fonts/`, copier un à un les fichiers de premier niveau de `frontend/dist` (`.htaccess` compris) ;
7. `touch api…/tmp/restart.txt`.

- [ ] **Step 1: Écrire `deploy/plesk-deploy.test.sh`**

Un script bash autonome (`set -euo pipefail`, sortie non nulle au premier échec) qui, pour chaque cas, fabrique dans un `mktemp -d` un faux `TAMBOUILLE_HOME` (`api…/` avec `.env` contenant `DATABASE_URL="postgresql://u:p@localhost/x?schema=public"`, `uploads/garde.txt`, `dist/ancien.txt`, `tmp/`, `package-lock.json.deployed` ; `httpdocs/assets/ancien.js`), une fausse source, et un `NODE_BIN` contenant des faux `npx` et `npm` qui écrivent leurs arguments dans un journal (le faux `npx` sort 1 si `FAUX_NPX_ECHOUE=1`). Cas et assertions :
- `nominal` : sortie 0 ; `api…/dist/nouveau.txt` existe et `dist/ancien.txt` non ; `uploads/garde.txt` et `.env` inchangés ; `httpdocs/assets/nouveau.js` présent, `ancien.js` absent ; `tmp/restart.txt` existe ; le journal contient `prisma@^7.9.1 migrate deploy` avant toute ligne `npm`.
- `migration en échec` (`FAUX_NPX_ECHOUE=1`) : sortie non nulle ; `dist/ancien.txt` toujours là ; `tmp/restart.txt` absent.
- `verrou inchangé` (même contenu que `.deployed`) : aucune ligne `npm ci` au journal.
- `verrou modifié` : une ligne `ci --omit=dev` au journal, et `.deployed` égal au nouveau verrou.
- `archive incomplète` (pas de `backend/generated`) : sortie non nulle ; rien de modifié (`dist/ancien.txt` présent, journal vide).
- `transit déjà présent` (via `plesk-entry.sh`, `DEPLOY_WORK` dans le `mktemp`, un fichier `transit/vieux.txt` préexistant, l'archive passée par `tar cz | DEPLOY_WORK=… TAMBOUILLE_HOME=… NODE_BIN=… bash deploy/plesk-entry.sh`) : sortie 0 et `transit/vieux.txt` absent.

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `bash deploy/plesk-deploy.test.sh`
Expected: échec, `deploy/plesk-deploy.sh` introuvable.

- [ ] **Step 3: Écrire `deploy/plesk-deploy.sh` et `deploy/plesk-entry.sh`**

En tête de `plesk-deploy.sh`, un commentaire qui dit ce qu'il ne touche jamais et pourquoi (reprendre l'esprit des « règles de sûreté » de `deploy/o2switch-deploy.sh`, sans ce qui tenait à CloudLinux). Chaque étape écrit une ligne lisible dans le journal de la CI.

- [ ] **Step 4: Relancer le test**

Run: `bash deploy/plesk-deploy.test.sh`
Expected: tous les cas passent, sortie 0.

- [ ] **Step 5: Brancher le test dans la CI**

Dans le job `backend` de `.github/workflows/ci.yml`, une étape `Tester le script de déploiement` : `run: bash deploy/plesk-deploy.test.sh` (depuis la racine du dépôt).

- [ ] **Step 6: Commit**

```bash
git add deploy/plesk-deploy.sh deploy/plesk-entry.sh deploy/plesk-deploy.test.sh .github/workflows/ci.yml
git commit -m "feat(deploy): script de déploiement Plesk et son test"
```

---

### Task 2: La tâche `deploy` de la CI

**Files:**
- Modify: `.github/workflows/ci.yml` (job `deploy`, lignes ~188-363)

**Interfaces:**
- Consumes : `deploy/plesk-entry.sh` installé côté serveur derrière la clé (tâche 3) ; l'archive doit contenir `deploy/plesk-deploy.sh`.

- [ ] **Step 1: Réécrire le job `deploy`**

Garder : `needs`, `if`, `concurrency`, le checkout de `inputs.ref`, `setup-node` 22, les deux constructions, et l'étape finale « Vérifier que le site répond ». Remettre `permissions: contents: read` (plus de poussée de branche) et `fetch-depth` par défaut. Supprimer : `CP_HOST`, `REPO_ROOT`, « Publier les artefacts sur la branche production », « Déclencher le déploiement cPanel », « Attendre le résultat du serveur ». Ajouter :
- `Préparer la clé SSH` : écrire `secrets.PLESK_SSH_KEY` dans `~/.ssh/deploy` (mode 600) et `secrets.PLESK_SSH_KNOWN_HOSTS` dans `~/.ssh/known_hosts`.
- `Envoyer et déployer` : `tar czf - backend/dist backend/generated backend/prisma backend/package.json backend/package-lock.json frontend/dist frontend/src/content/fournees deploy/plesk-deploy.sh | ssh -i ~/.ssh/deploy -o StrictHostKeyChecking=yes -o BatchMode=yes nellybabtb@${{ secrets.PLESK_SSH_HOST }}` avec `set -euo pipefail` : le code de retour du script distant fait échouer l'étape.

- [ ] **Step 2: Vérifier la syntaxe du workflow**

Run: `npx --yes @action-validator/cli .github/workflows/ci.yml` (ou `actionlint` s'il est installé)
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "feat(ci): déployer sur Plesk par SSH au lieu de l'API cPanel"
```

---

### Task 3: Mise en place sur le serveur et dans GitHub (manuelle, avec accord)

**Files:** aucun dans le dépôt.

- [ ] **Step 1: Générer la clé dédiée** — `ssh-keygen -t ed25519 -N "" -C tambouille-deploy -f <scratchpad>/tambouille-deploy`. La clé privée ne quitte le scratchpad que pour le secret GitHub.
- [ ] **Step 2: Installer le point d'entrée** — copier `deploy/plesk-entry.sh` en `/var/www/vhosts/nellybabillon.fr/bin/tambouille-deploy-entry.sh` (hors racine web), mode 700.
- [ ] **Step 3: (accord) Autoriser la clé** — ajouter à `~/.ssh/authorized_keys` de `nellybabtb` la ligne `restrict,command="/var/www/vhosts/nellybabillon.fr/bin/tambouille-deploy-entry.sh" ssh-ed25519 … tambouille-deploy`.
- [ ] **Step 4: Vérifier la bride** — `ssh -i <clé> nellybabtb@167.86.109.6 bash -c id < /dev/null` ne doit **pas** afficher `uid=` : la commande forcée s'exécute et échoue sur une archive vide, sans rien modifier (vérifier que `api…/dist` n'a pas bougé).
- [ ] **Step 5: (accord) Poser les secrets** — `gh secret set PLESK_SSH_KEY < <clé>`, `gh secret set PLESK_SSH_HOST -b 167.86.109.6`, `ssh-keyscan -t ed25519 167.86.109.6 | gh secret set PLESK_SSH_KNOWN_HOSTS`. Puis supprimer la clé privée du scratchpad.

---

### Task 4: Retirer o2switch et réécrire la documentation

**Files:**
- Delete: `.cpanel.yml`, `deploy/o2switch-deploy.sh`
- Modify: `backend/README.md` (sections déploiement, propriété perdue, règles de sûreté, migrations, secrets)
- Modify: `README.md` (paragraphe déploiement, s'il cite cPanel)

- [ ] **Step 1: Supprimer les fichiers o2switch et réécrire les sections** — décrire le chemin Plesk : la clé bridée et son point d'entrée, l'archive, l'ordre migrations → code, ce qui n'est jamais touché, les trois secrets, et le retour arrière par `workflow_dispatch` avec `ref`. Garder la note sur `.env` serveur jamais transféré et sur `INCONGRUES_WEBHOOK_SECRET`.
- [ ] **Step 2: Vérifier qu'il ne reste rien** — Run: `grep -rniE "cpanel|o2switch|production\b" --exclude-dir=node_modules --exclude-dir=.git . | grep -v docs/superpowers` ; Expected: plus aucune mention liée au déploiement (le SMTP `.env` serveur n'est pas dans le dépôt).
- [ ] **Step 3: Commit**

```bash
git add -A .cpanel.yml deploy/o2switch-deploy.sh backend/README.md README.md
git commit -m "docs(deploy): décrire le déploiement Plesk, retirer o2switch"
```

---

### Task 5: Premier déploiement réel

- [ ] **Step 1: Ouvrir la PR, la faire passer, la fusionner** (fusion par Nelly).
- [ ] **Step 2: Suivre le job `deploy`** sur `main` ; Expected: « Envoyer et déployer » et « Vérifier que le site répond » en succès.
- [ ] **Step 3: Contrôler en ligne** — `api…/dist` daté du jour sur le serveur ; un MP3 de want.incongru.org se résout par l'API de production (preuve que la PR #57 est en ligne).
- [ ] **Step 4: (accord) Nettoyer** — supprimer la branche distante `production` et les secrets `O2SWITCH_CPANEL_*`.
