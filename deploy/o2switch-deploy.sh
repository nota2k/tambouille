#!/bin/bash
#
# Ce que le serveur fait à réception d'un déploiement.
#
# Appelé par `.cpanel.yml`, donc exécuté par cPanel après qu'il a tiré la branche
# `deploy` depuis GitHub. Le répertoire courant est celui du dépôt géré —
# ~/repositories/tambouille — et non la cible servie.
#
# La logique vit ici plutôt que dans les lignes de `.cpanel.yml` pour deux
# raisons : elle reste lisible, et surtout elle reste COMMENTÉE. Les deux règles
# ci-dessous ont été payées par une production cassée ; elles doivent se trouver
# sous les yeux de qui modifie la commande, pas dans un document séparé.

set -uo pipefail

SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="$HOME/tambouille"
BACKEND="$APP/backend"
NODEVENV="$HOME/nodevenv/tambouille/backend/22/bin/activate"

echo "source      : $SOURCE"
echo "destination : $APP"

# ── Ce qu'on remplace, et ce à quoi on ne touche pas ────────────────────────
#
# Chaque répertoire est nommé un par un, et remplacé en entier. AUCUN JOKER, et
# surtout rien qui vise `$BACKEND` lui-même : à sa racine vivent `.env`,
# `node_modules` (un lien symbolique), `tmp/`, `.htaccess`, et 222 Mo
# d'`uploads/` qui ne sont sauvegardés nulle part ailleurs.
#
# Un `rm -rf $BACKEND/*` ou un `cp -R` mal cadré les emporterait. C'est la seule
# opération irréversible de tout le déploiement.
remplacer() {
  local nom=$1 src="$SOURCE/$2" dst=$3
  [ -d "$src" ] || { echo "ERREUR : $src absent du dépôt déployé" >&2; exit 1; }
  /bin/rm -rf "${dst:?}/$nom"
  /bin/cp -R "$src" "$dst/$nom"
  echo "  remplacé : $dst/$nom"
}

remplacer dist      backend/dist      "$BACKEND"
remplacer generated backend/generated "$BACKEND"
remplacer prisma    backend/prisma    "$BACKEND"
remplacer dist      frontend/dist     "$APP/frontend"

/bin/cp -f "$SOURCE/backend/package.json" "$SOURCE/backend/package-lock.json" "$BACKEND/"
echo "  copiés   : package.json, package-lock.json"

# ── Node ───────────────────────────────────────────────────────────────────
#
# `set +u` le temps de sourcer : le script d'activation de CloudLinux référence
# des variables non définies, et sous `set -u` cela ne fait pas qu'échouer, cela
# tue le shell sur-le-champ — avant même la gestion d'erreur de la ligne
# suivante. Constaté le 17 août.
set +u
# shellcheck source=/dev/null
source "$NODEVENV" || { echo "ERREUR : activation du nodevenv impossible" >&2; exit 1; }
set -u

# Le PATH du serveur porte un node 24.11.x qui ne satisfait pas le `engines` du
# projet et n'est pas celui que Passenger exécute.
node -v | grep -q '^v22\.' || { echo "ERREUR : node $(node -v) au lieu de 22.x" >&2; exit 1; }
echo "  node     : $(node -v)"

cd "$BACKEND" || { echo "ERREUR : $BACKEND introuvable" >&2; exit 1; }

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
  echo "  verrou modifié — installation"
  npm install --omit=dev || { echo "ERREUR : npm install a échoué" >&2; exit 1; }
  [ -L node_modules ] || { echo "ERREUR : node_modules n'est plus un lien symbolique" >&2; exit 1; }
  /bin/cp package-lock.json package-lock.json.deployed
else
  echo "  verrou inchangé — installation sautée"
fi

# ── Schéma, puis redémarrage ────────────────────────────────────────────────
#
# Migrer AVANT de redémarrer : pendant la fenêtre qui suit, l'ancien code tourne
# sur le nouveau schéma, ce qui est sûr tant que les migrations sont additives.
# L'inverse ne l'est jamais.
#
# `prisma` est une devDependency et le serveur n'installe que ses dépendances
# d'exécution — d'où `npx --yes`, qui télécharge la CLI le temps de la commande.
npx --yes prisma@7 migrate deploy || { echo "ERREUR : migration échouée" >&2; exit 1; }

/bin/mkdir -p tmp && /bin/touch tmp/restart.txt || { echo "ERREUR : redémarrage impossible" >&2; exit 1; }
echo "  redémarrage demandé"

echo "déploiement terminé"
