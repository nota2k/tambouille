#!/bin/bash
#
# Script de déploiement côté serveur, appelé par cron toutes les cinq minutes.
#
# ─────────────────────────────────────────────────────────────────────────────
# CE FICHIER DOIT VIVRE DANS ~/bin/, JAMAIS DANS ~/tambouille/
# ─────────────────────────────────────────────────────────────────────────────
#
# C'est la seule chose qui rend le dispositif sûr, et elle tient en une phrase :
# le compte FTP employé par la CI est cantonné à ~/tambouille, ce script est
# ailleurs. Le pipeline peut donc déposer une DEMANDE, mais pas modifier ce qui
# s'exécute en réponse.
#
# S'il était placé sous ~/tambouille, un identifiant censé ne déposer que des
# fichiers vaudrait exécution de code arbitraire sur le serveur : il suffirait de
# le réécrire et d'attendre cinq minutes.
#
# Installation :
#   cp deploy/o2switch-cron.sh ~/bin/o2switch-cron.sh
#   chmod +x ~/bin/o2switch-cron.sh
#   crontab -e   →   */5 * * * * /home/<compte>/bin/o2switch-cron.sh
#
# Il est versionné dans le dépôt pour être relisible et comparable, mais c'est
# la copie déposée dans ~/bin/ qui s'exécute. Les deux peuvent diverger sans que
# rien ne le signale : le vérifier fait partie du diagnostic quand un
# déploiement se comporte mal.

set -uo pipefail

APP="$HOME/tambouille"
BACKEND="$APP/backend"
NODEVENV="$HOME/nodevenv/tambouille/backend/22/bin/activate"
PENDING="$APP/deploy/pending"
RESULT="$APP/deploy/result"
LOCK="$HOME/.o2switch-deploy.lock"

# Rien à faire tant qu'aucune demande n'est déposée. C'est le cas de la très
# grande majorité des exécutions : ce script tourne toutes les cinq minutes.
[ -f "$PENDING" ] || exit 0

SHA=$(head -c 100 "$PENDING" | tr -d '[:space:]')

# Le résultat porte le SHA demandé : sans lui, le pipeline pourrait lire le
# résultat d'un déploiement antérieur et le prendre pour le sien.
report() {
  local status=$1 detail=${2:-}
  mkdir -p "$APP/deploy"
  {
    echo "sha=$SHA"
    echo "status=$status"
    echo "at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    [ -n "$detail" ] && echo "detail=$detail"
  } > "$RESULT"
  rm -f "$PENDING"
  [ "$status" = "ok" ] || exit 1
  exit 0
}

# Deux exécutions ne doivent jamais se chevaucher. `-n` renonce plutôt que
# d'attendre : si la précédente dure encore, celle-ci n'a rien à faire — le
# témoin sera toujours là dans cinq minutes.
#
# L'absence de `flock` est signalée plutôt que subie : sans cette vérification,
# un `flock` manquant ferait sortir le script en silence à chaque exécution, et
# comme le crontab porte `MAILTO=""` personne ne le saurait — le pipeline
# attendrait quinze minutes puis échouerait sans dire pourquoi.
command -v flock >/dev/null || report failed "flock introuvable sur ce serveur"
exec 9>"$LOCK"
flock -n 9 || exit 0

# Le PATH du serveur porte un node 24.11.x qui ne satisfait pas le `engines` du
# projet et n'est pas celui que Passenger exécute. Sans cette activation, tout ce
# qui suit s'exécuterait contre le mauvais runtime — en silence, la plupart du
# temps.
# shellcheck source=/dev/null
source "$NODEVENV" || report failed "activation du nodevenv impossible"
node -v | grep -q '^v22\.' || report failed "node $(node -v) au lieu de 22.x"

cd "$BACKEND" || report failed "$BACKEND introuvable"

# ── Dépendances d'exécution, seulement si le verrou a changé ────────────────
#
# `npm install --omit=dev`, JAMAIS `npm ci`.
#
# `npm ci` commence par supprimer node_modules. Or CloudLinux NodeJS Selector
# exige que ce répertoire soit un LIEN SYMBOLIQUE vers le virtualenv de
# l'application. Un `npm ci` détruit le lien, vide sa cible, et toute commande
# npm ultérieure est refusée — c'est exactement ce qui a cassé la production le
# 17 août 2026, et il a fallu rétablir le lien à la main. Ne « simplifiez » pas
# cette ligne.
if ! cmp -s package-lock.json package-lock.json.deployed; then
  npm install --omit=dev || report failed "npm install a échoué"
  # La structure imposée par l'hébergeur doit avoir survécu.
  [ -L node_modules ] || report failed "node_modules n'est plus un lien symbolique"
  cp package-lock.json package-lock.json.deployed
fi

# ── Schéma, puis redémarrage ────────────────────────────────────────────────
#
# Migrer AVANT de redémarrer : pendant la fenêtre qui suit, l'ancien code tourne
# sur le nouveau schéma, ce qui est sûr tant que les migrations sont additives.
# L'inverse ne l'est jamais.
#
# `prisma` est une devDependency et le serveur n'installe que ses dépendances
# d'exécution — d'où `npx --yes`, qui télécharge la CLI le temps de la commande.
npx --yes prisma@7 migrate deploy || report failed "migration échouée"

mkdir -p tmp && touch tmp/restart.txt || report failed "redémarrage impossible"

report ok
