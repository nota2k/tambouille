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

# ── Schéma — AVANT LA MOINDRE COPIE ────────────────────────────────────────
#
# L'ordre de ce bloc n'est pas une question de lisibilité, il a été payé par une
# production hors service le 29 août 2026.
#
# Cette garde vivait autrefois APRÈS les copies. Elle refusait bien de
# redémarrer sur un schéma en retard — mais `backend/generated`, le client
# Prisma, avait déjà été remplacé. Le processus en cours a servi le client neuf,
# qui sélectionne des colonnes que la base n'avait pas encore : l'API entière a
# répondu 500 alors même que la garde faisait son travail. Elle protégeait le
# redémarrage quand ce qu'il fallait protéger, c'était les fichiers.
#
# Placée ici, un schéma en retard laisse l'ancienne version tourner intacte.
#
# Elle interroge le dépôt ENTRANT — `$SOURCE` — et non l'application installée :
# la question est « la base a-t-elle tout ce que ce code va exiger », et lire
# `$BACKEND` après copie revenait à se la poser une fois qu'il était trop tard
# pour y répondre.
#
# On détermine s'il reste quelque chose à migrer SANS lancer Prisma.
#
# La CLI Prisma 7 instancie un module WebAssembly au démarrage — avant même de
# savoir s'il y a du travail. Sous la limite mémoire que CloudLinux applique aux
# processus lancés par cPanel, cette allocation échoue :
#
#     RangeError: WebAssembly.Instance(): Cannot allocate Wasm memory
#
# La même commande passe en session SSH interactive, où la limite est plus
# large. Le déploiement ne peut donc pas l'invoquer, mais il peut comparer les
# répertoires de migrations à ce que la base déclare avoir appliqué.
#
# Migrer avant de redémarrer reste la règle : pendant la fenêtre qui suit,
# l'ancien code tourne sur le nouveau schéma, ce qui est sûr tant que les
# migrations sont additives. L'inverse ne l'est jamais.
DB_URL=$(grep -E '^DATABASE_URL=' "$BACKEND/.env" | head -1 | cut -d= -f2- | tr -d "\"'")
[ -n "$DB_URL" ] || { echo "ERREUR : DATABASE_URL introuvable dans .env" >&2; exit 1; }

# `?schema=public` est un paramètre de Prisma, pas de libpq : psql le refuse avec
# « invalid URI query parameter ». On retire donc la chaîne de requête, et on
# rétablit le schéma par PGOPTIONS — sans quoi une base employant autre chose que
# `public` verrait la table introuvable et le déploiement s'arrêterait à tort.
DB_BASE=${DB_URL%%\?*}
SCHEMA=$(echo "$DB_URL" | sed -n 's/.*[?&]schema=\([^&]*\).*/\1/p')
export PGOPTIONS="--search_path=${SCHEMA:-public}"

appliquees=$(psql "$DB_BASE" -tAc \
  "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL" 2>/dev/null | sort)
if [ -z "$appliquees" ]; then
  echo "ERREUR : impossible de lire _prisma_migrations — on ne redémarre pas à l'aveugle" >&2
  exit 1
fi
presentes=$(ls -1 "$SOURCE/backend/prisma/migrations" | grep -v migration_lock | sort)

# PAS de substitution de processus `<(…)` ici : elle n'est pas disponible dans
# l'environnement où cPanel exécute ses tâches, et `comm` échouait sur
# « /dev/fd/63: No such file or directory ». La variable restait vide, le script
# concluait « à jour », et redémarrait — une garde qui ne gardait rien, du même
# genre exactement que celles qu'elle est censée remplacer.
manquantes=$(echo "$presentes" | while IFS= read -r m; do
  [ -n "$m" ] || continue
  echo "$appliquees" | grep -qxF "$m" || echo "$m"
done)

if [ -n "$manquantes" ]; then
  echo "ERREUR : migrations non appliquées, et ce déploiement ne peut pas les appliquer." >&2
  echo "$manquantes" | sed 's/^/  - /' >&2
  echo "" >&2
  echo "  Prisma 7 ne tient pas dans la limite mémoire des processus cPanel." >&2
  echo "  À lancer en SSH, où elle fonctionne :" >&2
  echo "    cd ~/tambouille/backend && source ~/nodevenv/tambouille/backend/22/bin/activate \\" >&2
  echo "      && npx --yes prisma@7 migrate deploy" >&2
  echo "" >&2
  echo "  Si une reprise de données doit s'intercaler — une colonne à remplir" >&2
  echo "  avant qu'un NOT NULL ne la ferme — son script est déjà construit dans" >&2
  echo "  le dépôt déployé, que ce déploiement n'a pas encore recopié :" >&2
  echo "    $SOURCE/backend/dist/src/scripts/" >&2
  echo "" >&2
  echo "  Puis relancer ce déploiement." >&2
  exit 1
fi
echo "  schéma à jour — $(echo "$presentes" | wc -l | tr -d ' ') migrations appliquées"


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

# Les fournées sont des fichiers du frontend, embarqués dans son bundle au
# build. Le flux de syndication d'une fournée les lit côté backend, en fichiers,
# et `frontend/dist` ne les contient pas sous cette forme : sans cette ligne,
# `/api/fournees/:numero/rss` répond 404 en production tout en marchant en
# local. Le backend les cherche là où `FOURNEES_DIR` le dit — voir
# `backend/README.md`.
remplacer fournees  frontend/src/content/fournees "$BACKEND"

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

# ── Redémarrage ─────────────────────────────────────────────────────────────
/bin/mkdir -p tmp && /bin/touch tmp/restart.txt || { echo "ERREUR : redémarrage impossible" >&2; exit 1; }
echo "  redémarrage demandé"

echo "déploiement terminé"
