# Backend Tambouille

API NestJS. Pour l'installation et le démarrage en local, voir le
[README racine](../README.md).

Ce fichier documente le **déploiement**, parce que c'est ici que vivent les
détails qui le contraignent : Passenger, le virtualenv Node de l'hébergeur, et
les migrations Prisma.

## Comment une version arrive en production

Rien n'est manuel, et rien ne se déclenche tout seul non plus — le déploiement
part sur commande, depuis *Actions › CI › Run workflow*.

```
push / PR ──▶ backend · frontend · e2e          les trois vérifications
                    │
                    ▼  needs
              deploy (workflow_dispatch seulement)
                    │
     construit les deux paquets sur le runner
                    │
     rclone en FTPS ─────────────▶  ~/tambouille/{backend,frontend}
                    │
     dépose deploy/pending (SHA) ─▶  lu par le cron, toutes les 5 min
                    │                       │
                    │              ~/bin/o2switch-cron.sh
                    │                 npm install --omit=dev  (si le verrou a changé)
                    │                 prisma migrate deploy
                    │                 touch tmp/restart.txt
                    │◀───── deploy/result (SHA + statut) ─────┘
                    │
     attend le résultat, échoue s'il n'arrive pas
                    │
     vérifie que l'API et le site répondent
```

Compter environ **quatre minutes**, dont une à deux d'attente du cron.

## Entrées du déclenchement manuel

| Entrée | Effet |
|---|---|
| `ref` | Déploie une référence précise. **C'est le retour arrière** : redéployer un commit connu-bon, sans rien révoquer ni réécrire |
| `dry_run` | N'écrit rien. rclone liste et simule, les étapes qui modifient le serveur sont sautées. À employer pour voir ce qu'un déploiement effacerait avant de le lancer |

## Pourquoi FTPS et pas SSH

Le port 22 est filtré depuis un runner GitHub : le pare-feu du mutualisé
n'accepte que des adresses déclarées, et sa liste blanche compte cinq
emplacements quand les plages de sortie des runners se comptent en milliers de
blocs CIDR. Ce n'est pas une adresse à trouver, c'est une impossibilité de
structure. Le port 21 répond, en TLS explicite.

Le FTP transférant des fichiers sans rien exécuter, migrations, installation et
redémarrage passent par un cron du serveur.

## La règle de sûreté à ne pas défaire

**Le script du cron vit dans `~/bin/`, le compte FTP est cantonné à
`~/tambouille`.**

C'est ce qui empêche un identifiant de dépôt de fichiers de valoir exécution de
code : le pipeline peut déposer une *demande*, jamais changer ce qui s'exécute en
réponse. Déplacer ce script sous `~/tambouille` annulerait toute la propriété.

Deux corollaires, écrits aussi dans le script lui-même :

- **`npm install --omit=dev`, jamais `npm ci`.** `npm ci` supprime
  `node_modules`, or CloudLinux exige que ce soit un lien symbolique vers le
  virtualenv. Un `npm ci` a cassé la production le 17 août 2026 et il a fallu
  rétablir le lien à la main.
- **Activer le `nodevenv` avant toute commande Node.** Le `PATH` du serveur porte
  un node 24.11.x qui ne satisfait pas le `engines` du projet et n'est pas celui
  que Passenger exécute.

## Secrets

Trois, tous relatifs au compte FTP dédié : `O2SWITCH_FTP_HOST`,
`O2SWITCH_FTP_USER`, `O2SWITCH_FTP_PASS`. Les trois tâches de vérification n'en
lisent aucun — elles restent donc exécutables depuis un fork.

`backend/.env` vit sur le serveur et n'est jamais transféré : le déploiement ne
peut pas l'écraser, et ne peut pas non plus le renseigner. Une variable nouvelle
demande un geste manuel, et son absence ne se voit qu'en empruntant le chemin
qui la lit.

## Ce qui reste manuel

- Installer le script du cron : le copier depuis `deploy/o2switch-cron.sh` vers
  `~/bin/`, et poser l'entrée cron. Le fichier versionné est la source ; c'est la
  copie qui s'exécute, et les deux peuvent diverger sans que rien ne le signale.
- Ajouter une variable d'environnement en production.
- Tout ce qui touche à cPanel : compte FTP, pare-feu, entrée cron.
