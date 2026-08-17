L'ordre des groupes 4 et 5 est contraint : intervertir 5.1 et 5.2 fait tomber le
site. Voir `design.md` — Migration Plan.

## 0. Prérequis, hors périmètre

- [x] 0.1 **Rattrapage manuel en SSH**, avant toute autre tâche. **Fait le 17 août**, et c'est la meilleure chose qui pouvait arriver à ce chantier : il a échoué trois fois avant d'aboutir, et chaque échec a produit une décision de conception. `npm run build` d'abord (`nest: command not found`), puis le contournement par `tsc` (`@types/express` manquant) — les devDependencies avaient disparu du serveur ; puis `npm install` lui-même, refusé, parce que le `npm ci` de la procédure avait **détruit le lien symbolique `node_modules` qu'exige CloudLinux** et vidé le virtualenv. Réparé en rétablissant le lien à la main. Le déploiement a fini par aboutir, mais par un chemin inattendu : la construction du frontend sur le serveur ayant elle aussi échoué (`run-p` introuvable), c'est le `frontend/dist` **versionné** qui a fourni l'interface. Constaté après coup : `POST /api/auth/oidc` répond 401 sur un jeton bidon, les cinq fichiers servis sont exactement ceux que `main` suit, et la connexion par carte fonctionne dans le navigateur.

## 1. Les secrets et l'accès

- [x] 1.1 Créer une paire de clés SSH **dédiée au déploiement**, distincte de toute clé personnelle, et déposer la publique dans cPanel › Accès SSH. Une clé dédiée se révoque sans rien casser d'autre.
- [x] 1.2 Enregistrer quatre secrets de dépôt : la clé privée, l'hôte, l'utilisateur, et l'empreinte du serveur (`ssh-keyscan`) pour que `StrictHostKeyChecking` reste actif. *Vérifier* : depuis un runner, `ssh <user>@<hôte> 'echo ok'` répond `ok` sans invite ni avertissement d'hôte inconnu.
- [ ] 1.3 Vérifier depuis un runner que rclone atteint le serveur en SFTP et **liste** `~/tambouille` sans rien écrire (`rclone lsd`). C'est la première fois que le transfert est exercé ; qu'il soit en lecture seule est délibéré. **Le workflow porte désormais un mode `dry_run`** qui fait exactement cela : il liste la destination, simule les synchronisations, et saute les deux étapes qui modifient le serveur. Un seul `workflow_dispatch` coché en simulation couvre donc cette tâche et la 2.4, sans montage jetable.

## 2. La tâche `deploy`

- [x] 2.1 Ajouter la tâche `deploy` à `.github/workflows/ci.yml` : `needs: [backend, frontend, e2e]`, déclencheur `workflow_dispatch` avec une entrée `ref` facultative, et une condition qui l'empêche de s'exécuter sur une `pull_request`. *Vérifier* : ouvrir une PR quelconque et constater que seules trois tâches apparaissent. **Écrit et validé structurellement** — `if: github.event_name == 'workflow_dispatch'`, YAML chargé, quatre tâches dont `deploy` en `needs` sur les trois autres, et les huit blocs `run` passent `bash -n`. **L'observation sur une vraie PR reste à faire** : elle arrivera avec la proposition de fusion qui porte ce travail.
- [x] 2.2 Installer rclone par `apt-get` et construire les artefacts dans la tâche : `npm ci` puis `npm run build` des deux paquets, plus `prisma generate`. Pas d'action tierce, pas d'`upload-artifact` — voir `design.md`, Decisions.
- [x] 2.3 Écrire le transfert : `rclone sync` sur `backend/dist/`, `backend/generated/`, `backend/prisma/`, `frontend/dist/`, chacun avec son `--max-delete` ; `rclone copy` pour `package.json` et `package-lock.json`. **Aucune commande ne vise `backend/` lui-même.** Configuration par variables `RCLONE_SFTP_*`, pas par fichier encodé dans un secret.
- [ ] 2.4 **Exercer la garde avant d'en dépendre** : lancer une fois le transfert en `--dry-run` et lire ce qu'il annonce supprimer ; puis, sur une copie jetable ou en abaissant temporairement `--max-delete` à 1, constater que l'opération **s'interrompt** au lieu d'effacer. C'est le scénario « Portée de transfert erronée » de la spécification, et la seule tâche qui distingue une garde d'un commentaire rassurant.
- [x] 2.5 Écrire l'installation conditionnelle des dépendances d'exécution : comparer le `package-lock.json` distant au nouveau, et n'installer que s'il diffère. **`npm install --omit=dev`, jamais `npm ci`** — `npm ci` supprime `node_modules`, donc le lien symbolique que CloudLinux exige, ce qui a cassé la production le 17 août. Écrire la raison dans le workflow, à côté de la commande, pour que personne ne « simplifie » en `npm ci` plus tard.
- [ ] 2.6 **Vérifier que le lien symbolique survit** à une installation déclenchée : `ls -ld node_modules` doit toujours commencer par `l` et pointer vers le virtualenv. C'est le scénario « Le verrou de dépendances a changé » de la spécification, et c'est la seule assertion qui protège de la panne qu'on vient de subir.
- [x] 2.7 Écrire l'étape SSH : activation du `nodevenv`, `node -v` **dont la sortie est vérifiée à 22.x**, `npx --yes prisma@7 migrate deploy`, puis `touch backend/tmp/restart.txt`. Migrer avant de redémarrer, jamais l'inverse.
- [ ] 2.8 **Exercer le redémarrage seul, avant d'en dépendre.** `touch tmp/restart.txt` n'a jamais été vu fonctionner : pendant le rattrapage du 17 août la chaîne s'est interrompue avant, et Passenger a rechargé de lui-même. On sait que le nouveau code sert ; on ne sait pas que ce geste le provoque. Le vérifier isolément — modifier une chaîne dans `dist/`, toucher le fichier, constater le changement servi — puis seulement l'inscrire dans la séquence.
- [x] 2.9 Ajouter la vérification d'après déploiement : une requête sur l'API et une sur le site, l'échec de l'une faisant échouer la tâche.

## 3. Le premier déploiement piloté

- [ ] 3.1 Déclencher un `workflow_dispatch` sur la référence courante, alors que la production est déjà à jour par la tâche 0.1 : l'écart est nul, donc un échec ne peut venir que du pipeline. Relever la durée.
- [ ] 3.2 **Vérifier sur le serveur que rien n'a été détruit** : `backend/.env` intact, `backend/uploads` toujours à 222 Mo, `node_modules/` en place, `.htaccess` inchangé. C'est l'exigence « Le transfert ne peut pas détruire ce qu'il ne dépose pas », constatée plutôt que supposée.
- [ ] 3.3 Faire un déploiement qui **change quelque chose de visible** — une chaîne de l'interface suffit — et le constater en production. Un pipeline qu'on n'a jamais vu livrer n'a rien prouvé.
- [ ] 3.4 Exercer le retour arrière : redéployer par `workflow_dispatch` la référence précédente et constater que le changement visible a disparu. Puis redéployer la courante.

## 4. La bascule, première moitié

- [ ] 4.1 Constater que le serveur n'a plus besoin d'être un clone : plus aucune construction locale, plus aucun `git pull` dans la procédure. Sauvegarder au préalable la sortie de `git status --porcelain` et la liste des fichiers non suivis de `frontend/dist`, pour trace.
- [ ] 4.2 Supprimer le `.git` de `~/tambouille`. À partir de là, aucun `git pull` ne peut plus effacer quoi que ce soit — c'est ce qui autorise l'étape suivante.
- [ ] 4.3 Redéployer et vérifier que le site fonctionne toujours. Le serveur n'est plus un dépôt ; si quelque chose dépendait silencieusement de git, ça se voit maintenant.

## 5. La bascule, seconde moitié

- [ ] 5.1 `git rm -r --cached frontend/dist`, l'ajouter au `.gitignore`, et **réécrire le commentaire qui s'y trouve** : il justifie aujourd'hui le versionnement par « la prod le récupère par `git pull`, il n'y a pas d'étape de build côté serveur », affirmation fausse depuis au moins le 9 août — le serveur construisait, et le `dist` versionné n'était plus servi. Dire pourquoi il en sort, et que son maintien rendait le `git status` de la production illisible. **Condition dure, apprise le 17 août** : ne pas exécuter cette tâche avant d'avoir constaté qu'un déploiement par le pipeline livre effectivement le bundle. Ce soir-là, la construction du frontend sur le serveur a échoué et c'est ce répertoire versionné qui a fourni l'interface — il était la seule source du site. Le retirer avant que le pipeline ne prenne le relais laisserait le domaine sans rien à servir.
- [ ] 5.2 Supprimer la branche `o2switch-db`, locale et distante. Elle ne sert plus : le serveur ne suivait déjà plus aucune branche depuis 4.2.
- [x] 5.3 **Fait dans le commit `2b27fcd`**, avant même le début de l'implémentation. Corriger l'entrée « Automate the build and deployment to o2switch » de `TODOS.md`. Elle porte plusieurs affirmations que la reconnaissance a démenties, dont l'analyse des quatre modalités fondée sur une base joignable depuis internet — elle écoute sur `localhost`. La conclusion tenait par accident ; le raisonnement doit être corrigé ou retiré, pas laissé tel quel.

## 6. Passage en automatique

- [ ] 6.1 Après deux ou trois déploiements pilotés sans surprise, ajouter `push` sur `main` au déclencheur, en gardant `workflow_dispatch` — c'est le retour arrière. *Vérifier* : fusionner une PR anodine et constater que le déploiement part de lui-même, après les trois vérifications.
- [ ] 6.2 Vérifier qu'un `push` dont les vérifications échouent **ne déploie pas** : casser volontairement un test sur une branche, la fusionner si la protection de branche ne l'en empêche pas, et constater qu'aucun déploiement n'a lieu. Rétablir aussitôt. C'est le scénario « Une vérification échoue », et il ne vaut que constaté.
- [ ] 6.3 Documenter la procédure dans `backend/README.md`, qui est encore le gabarit NestJS intact. Ce que fait le pipeline, ce qui reste manuel, et où sont les secrets — pas leurs valeurs.
