#!/usr/bin/env bash
# Le point d'entrée de la clé de déploiement.
#
# Installé une fois sur le serveur, hors de toute racine web, et désigné par la
# commande forcée de la clé dans ~/.ssh/authorized_keys :
#
#   restrict,command="<chemin>/tambouille-deploy-entry.sh" ssh-ed25519 … tambouille-deploy
#
# Quoi que demande la connexion, c'est ce script qui s'exécute. Il lit une
# archive tar.gz sur l'entrée standard, la déballe dans un répertoire de
# transit VIDÉ d'abord — les restes d'un déploiement précédent ne doivent pas
# s'y mêler — puis lance le plesk-deploy.sh contenu dans l'archive.
#
# Il ne change presque jamais, et c'est voulu : toute la logique vit dans
# plesk-deploy.sh, qui arrive avec chaque archive. Qui peut pousser sur `main`
# peut donc faire exécuter du code sur ce serveur — le niveau de confiance déjà
# accordé au code applicatif, dit ici plutôt que tenu par la structure.
set -euo pipefail

TRAVAIL="${DEPLOY_WORK:-$HOME/tambouille-deploy}"
TRANSIT="$TRAVAIL/transit"

rm -rf "${TRANSIT:?}"
mkdir -p "$TRANSIT"
tar xzf - -C "$TRANSIT"

[ -f "$TRANSIT/deploy/plesk-deploy.sh" ] || {
  echo "ERREUR : l'archive ne contient pas deploy/plesk-deploy.sh" >&2
  exit 1
}
exec bash "$TRANSIT/deploy/plesk-deploy.sh" "$TRANSIT"
