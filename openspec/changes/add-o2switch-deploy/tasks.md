L'ordre des groupes 4 et 5 est contraint : intervertir 5.1 et 5.2 fait tomber le
site. Voir `design.md` — Migration Plan.

## 0. Prérequis, hors périmètre

- [x] 0.1 **Rattrapage manuel en SSH**, avant toute autre tâche. **Fait le 17 août**, et c'est la meilleure chose qui pouvait arriver à ce chantier : il a échoué trois fois avant d'aboutir, et chaque échec a produit une décision de conception. `npm run build` d'abord (`nest: command not found`), puis le contournement par `tsc` (`@types/express` manquant) — les devDependencies avaient disparu du serveur ; puis `npm install` lui-même, refusé, parce que le `npm ci` de la procédure avait **détruit le lien symbolique `node_modules` qu'exige CloudLinux** et vidé le virtualenv. Réparé en rétablissant le lien à la main. Le déploiement a fini par aboutir, mais par un chemin inattendu : la construction du frontend sur le serveur ayant elle aussi échoué (`run-p` introuvable), c'est le `frontend/dist` **versionné** qui a fourni l'interface. Constaté après coup : `POST /api/auth/oidc` répond 401 sur un jeton bidon, les cinq fichiers servis sont exactement ceux que `main` suit, et la connexion par carte fonctionne dans le navigateur.

## 1. L'accès, et ce qu'il a fallu abandonner

- [x] 1.1 ~~Créer une paire de clés SSH dédiée au déploiement.~~ **Faite, et sans objet.** La clé existe, elle est autorisée, elle fonctionne depuis un poste de développement — et elle ne servira jamais depuis un runner. Le port 22 est filtré par le pare-feu du mutualisé, dont la liste blanche compte cinq emplacements quand les plages de sortie des runners GitHub se comptent en milliers de blocs. Conservée décochée serait mentir dans l'autre sens : le travail a bien été fait, c'est sa cible qui a disparu.
- [x] 1.2 ~~Enregistrer les quatre secrets SSH.~~ **Faits, et sans objet** pour la même raison. `O2SWITCH_SSH_KEY` et `O2SWITCH_KNOWN_HOSTS` sont à supprimer du dépôt ; `O2SWITCH_HOST` et `O2SWITCH_USER` restent valables pour le FTP.
- [ ] 1.3 Créer dans cPanel un **compte FTP dédié**, cantonné à `/home/<compte>/tambouille`. Le cantonnement n'est pas du confort : combiné au fait que le script du cron vit dans `~/bin/`, c'est lui qui empêche un identifiant de dépôt de fichiers de valoir exécution de code. Enregistrer `O2SWITCH_FTP_USER` et `O2SWITCH_FTP_PASS`.
- [ ] 1.4 Vérifier depuis un runner que rclone atteint le serveur en **FTPS explicite** et liste `~/tambouille` sans rien écrire. Le mode `dry_run` du workflow fait exactement cela. *Vérifier aussi* que le TLS est bien actif — un FTP nu ferait voyager le mot de passe et tous les fichiers en clair, ce qui serait un recul considérable par rapport à la clé SSH qu'on abandonne.
- [ ] 1.5 Retirer du pare-feu o2switch les deux autorisations `github.com` ajoutées le 17 août. Elles n'autorisent rien d'utile — `github.com` résout vers les adresses du site, pas vers celles des runners — et occupent deux des cinq emplacements.

## 2. Le script du serveur

Ce groupe ne produit aucun fichier du dépôt : son résultat vit sur le serveur,
hors de toute gestion de version. C'est le point faible assumé du dispositif, et
la raison pour laquelle le script doit être court et lisible.

- [ ] 2.1 Écrire le script de déploiement et le déposer dans `~/bin/`, **hors du périmètre du compte FTP**. Il lit `~/tambouille/deploy/pending`, et s'il existe : active le `nodevenv`, vérifie que `node -v` répond en 22.x, installe les dépendances d'exécution si le verrou diffère de celui de la dernière installation réussie, applique les migrations, touche `backend/tmp/restart.txt`, écrit `deploy/result`, supprime `pending`.
- [ ] 2.2 **`npm install --omit=dev`, jamais `npm ci`** — avec la raison écrite dans le script, à côté de la commande. `npm ci` supprime `node_modules`, donc le lien symbolique que CloudLinux impose, et c'est ce qui a cassé la production le 17 août. Le script doit en outre **échouer explicitement** si `node_modules` cesse d'être un lien.
- [ ] 2.3 Protéger le script contre le recouvrement par `flock` : deux exécutions du cron ne doivent jamais se chevaucher, ni une exécution longue être doublée par la suivante.
- [ ] 2.4 Installer l'entrée cron, toutes les cinq minutes. *Vérifier* : déposer un `pending` à la main, attendre, constater que `result` apparaît et que `pending` a disparu.
- [ ] 2.5 **Exercer le redémarrage seul, avant d'en dépendre.** `touch tmp/restart.txt` n'a jamais été vu fonctionner : le 17 août la chaîne s'est interrompue avant, et Passenger a rechargé de lui-même. On sait que le nouveau code servait ; on ne sait pas que ce geste le provoque. Le vérifier isolément — modifier une chaîne dans `dist/`, lancer le script, constater le changement servi.

## 2bis. La tâche `deploy`

- [x] 2b.1 Ajouter la tâche `deploy` à `ci.yml` : `needs: [backend, frontend, e2e]`, `workflow_dispatch` avec entrées `ref` et `dry_run`, condition excluant les `pull_request`. **Écrit**, YAML validé, blocs `run` passés à `bash -n`. L'observation sur une vraie PR reste à faire.
- [x] 2b.2 Installer rclone par `apt-get` et construire les deux paquets dans la tâche. Pas d'action tierce, pas d'`upload-artifact`.
- [ ] 2b.3 **Réécrire le transfert en FTPS** : `RCLONE_CONFIG_O2_TYPE=ftp`, `EXPLICIT_TLS=true`, mot de passe obscurci par `rclone obscure` dans la tâche. `sync` par sous-répertoire avec son `--max-delete`, `copy` pour les manifestes, **rien qui vise `backend/` lui-même**.
- [ ] 2b.4 **Exercer la garde avant d'en dépendre** : lancer en `dry_run` et lire ce que chaque `sync` annonce supprimer ; puis, en abaissant temporairement un `--max-delete` à 1, constater que l'opération **s'interrompt** au lieu d'effacer. C'est le scénario « Portée de transfert erronée », et la seule tâche qui distingue une garde d'un commentaire rassurant.
- [ ] 2b.5 Déposer `deploy/pending` portant le SHA, puis **attendre `deploy/result`** en l'interrogeant par FTP jusqu'à y lire ce même SHA, avec un délai maximal. Échouer si le statut n'est pas `ok`, et échouer aussi si rien n'arrive — un pipeline qui dépose une demande et se déclare réussi n'annonce que son propre envoi.
- [ ] 2b.6 Retirer la sonde de ports temporaire, ainsi que les étapes SSH devenues mortes.
- [x] 2b.7 Ajouter la vérification d'après déploiement : une requête sur l'API et une sur le site, l'échec de l'une faisant échouer la tâche.

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
