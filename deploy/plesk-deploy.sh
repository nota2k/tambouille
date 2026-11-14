#!/usr/bin/env bash
# Met en ligne une version construite de Tambouille sur le serveur Plesk.
#
#   bash plesk-deploy.sh <source>
#
# <source> est l'archive envoyée par la CI, déjà déballée par plesk-entry.sh.
# Ce script est lancé DEPUIS cette archive : c'est toujours la dernière version
# publiée qui s'exécute, sans recopie à la main sur le serveur.
#
# ─────────────────────────────────────────────────────────────────────────────
# CE QU'IL NE TOUCHE JAMAIS
# ─────────────────────────────────────────────────────────────────────────────
#
# Dans le répertoire de l'API vivent `.env` (les secrets, qui ne passent jamais
# par le dépôt), `uploads/` (222 Mo, sauvegardés nulle part ailleurs),
# `public/` et `tmp/`. Les répertoires remplacés sont donc NOMMÉS un par un,
# jamais désignés par un joker, et jamais le répertoire de l'API lui-même :
# c'est la seule opération irréversible du déploiement.
#
# ─────────────────────────────────────────────────────────────────────────────
# L'ORDRE
# ─────────────────────────────────────────────────────────────────────────────
#
# 1. Tout ce qui est attendu dans l'archive est vérifié avant de rien toucher.
# 2. Les migrations passent AVANT le code. Si elles échouent, on s'arrête :
#    l'ancien code continue de tourner sur un schéma qu'il connaît. Seul le
#    répertoire `prisma/` a été remplacé à ce stade, et l'appli en marche ne le
#    lit pas — son client est dans `generated/`.
# 3. Le code, puis les dépendances si le verrou a changé, puis le front.
# 4. Le redémarrage, en dernier.
#
# Sur o2switch, Prisma 7 ne tenait pas dans la limite mémoire des processus
# cPanel et les migrations se lançaient à la main. Sur ce serveur, elles
# tournent : vérifié avec `prisma migrate status` le 14 novembre 2026.
set -euo pipefail

SOURCE="${1:?usage : plesk-deploy.sh <source>}"
SOURCE="$(cd "$SOURCE" && pwd)"
HOME_TAMBOUILLE="${TAMBOUILLE_HOME:-/var/www/vhosts/tambouille.pantagruweb.club}"
API="$HOME_TAMBOUILLE/api.tambouille.pantagruweb.club"
WEB="$HOME_TAMBOUILLE/httpdocs"
# Le Node que Passenger exécute, pas celui du PATH par défaut.
export PATH="${NODE_BIN:-/opt/plesk/node/22/bin}:$PATH"

echo "source      : $SOURCE"
echo "destination : $HOME_TAMBOUILLE"

# ── 1. L'archive est-elle complète ? ──────────────────────────────────────────
for attendu in backend/dist backend/generated backend/prisma \
  backend/package.json backend/package-lock.json \
  frontend/dist frontend/src/content/fournees; do
  [ -e "$SOURCE/$attendu" ] || {
    echo "ERREUR : $attendu absent de l'archive — rien n'a été modifié" >&2
    exit 1
  }
done
for cible in "$API" "$API/.env" "$WEB"; do
  [ -e "$cible" ] || { echo "ERREUR : $cible introuvable sur le serveur" >&2; exit 1; }
done

remplacer() {
  local src=$1 dst=$2
  rm -rf "${dst:?}"
  cp -R "$src" "$dst"
  echo "  remplacé : $dst"
}

# ── 2. Les migrations ─────────────────────────────────────────────────────────
remplacer "$SOURCE/backend/prisma" "$API/prisma"

PRISMA_VERSION=$(node -p "require('$SOURCE/backend/package.json').devDependencies.prisma")
DATABASE_URL=$(grep -E '^DATABASE_URL=' "$API/.env" | head -1 | cut -d= -f2- | tr -d "\"'")
[ -n "$DATABASE_URL" ] || { echo "ERREUR : DATABASE_URL introuvable dans .env" >&2; exit 1; }
export DATABASE_URL

echo "migrations (prisma@$PRISMA_VERSION)"
(cd "$API" && npx --yes "prisma@$PRISMA_VERSION" migrate deploy) || {
  echo "ERREUR : les migrations ont échoué — l'ancien code reste en ligne" >&2
  exit 1
}

# ── 3. Le code et les dépendances ─────────────────────────────────────────────
remplacer "$SOURCE/backend/dist" "$API/dist"
remplacer "$SOURCE/backend/generated" "$API/generated"
# Lu par le flux RSS des fournées (`FOURNEES_DIR`), qui n'existe pas sous
# `dist/` : sans cette copie, la route répond 404 en production.
remplacer "$SOURCE/frontend/src/content/fournees" "$API/fournees"
cp -f "$SOURCE/backend/package.json" "$SOURCE/backend/package-lock.json" "$API/"
echo "  copiés   : package.json, package-lock.json"

# `npm ci` est permis ici : `node_modules` est un vrai répertoire, pas le lien
# symbolique que CloudLinux imposait chez o2switch. Il n'est lancé que si le
# verrou a changé : il est lent, et il vide `node_modules` sous l'appli en
# marche.
if ! cmp -s "$API/package-lock.json" "$API/package-lock.json.deployed"; then
  echo "  verrou modifié — installation"
  (cd "$API" && npm ci --omit=dev)
  cp "$API/package-lock.json" "$API/package-lock.json.deployed"
else
  echo "  verrou inchangé — installation sautée"
fi

# ── Le front ──────────────────────────────────────────────────────────────────
for dossier in assets fonts; do
  if [ -d "$SOURCE/frontend/dist/$dossier" ]; then
    remplacer "$SOURCE/frontend/dist/$dossier" "$WEB/$dossier"
  fi
done
# Les fichiers de premier niveau, un par un — `.htaccess` compris, qui porte
# le repli de l'application monopage.
find "$SOURCE/frontend/dist" -maxdepth 1 -type f -print0 |
  while IFS= read -r -d '' fichier; do
    cp -f "$fichier" "$WEB/"
    echo "  copié    : $WEB/$(basename "$fichier")"
  done

# ── 4. Le redémarrage ─────────────────────────────────────────────────────────
mkdir -p "$API/tmp"
touch "$API/tmp/restart.txt"
echo "  redémarrage demandé"
echo "déploiement terminé"
