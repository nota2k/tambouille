#!/usr/bin/env bash
# Test hors ligne de deploy/plesk-deploy.sh et deploy/plesk-entry.sh.
#
# Rien ne touche le serveur : chaque cas fabrique un faux TAMBOUILLE_HOME et
# une fausse source dans un répertoire temporaire, et remplace `npx` et `npm`
# par des doublures qui notent leurs arguments dans un journal. C'est ce
# journal qui prouve l'ORDRE — migrations avant tout le reste — et ce qui n'a
# PAS été lancé.
#
# Lancer depuis la racine du dépôt : bash deploy/plesk-deploy.test.sh
set -euo pipefail

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$RACINE/deploy/plesk-deploy.sh"
ENTREE="$RACINE/deploy/plesk-entry.sh"
API_NOM=api.tambouille.pantagruweb.club
echecs=0

echouer() { echo "  ÉCHEC : $*"; echecs=$((echecs + 1)); }
verifier() { if eval "$1"; then :; else echouer "$2"; fi; }

# Prépare $T (racine du cas) : $T/home, $T/source, $T/bin, $T/journal.
preparer() {
  T=$(mktemp -d)
  local api="$T/home/$API_NOM"
  mkdir -p "$api/uploads" "$api/dist" "$api/tmp" "$api/public" "$api/prisma" \
    "$T/home/httpdocs/assets" "$T/bin"
  echo 'DATABASE_URL="postgresql://u:p@localhost/x?schema=public"' > "$api/.env"
  echo garde > "$api/uploads/garde.txt"
  echo ancien > "$api/dist/ancien.txt"
  echo ancien > "$api/package-lock.json.deployed"
  echo ancien > "$T/home/httpdocs/assets/ancien.js"

  local s="$T/source"
  mkdir -p "$s/backend/dist" "$s/backend/generated" "$s/backend/prisma/migrations" \
    "$s/frontend/dist/assets" "$s/frontend/dist/fonts" \
    "$s/frontend/src/content/fournees" "$s/deploy"
  echo nouveau > "$s/backend/dist/nouveau.txt"
  echo client > "$s/backend/generated/client.js"
  echo schema > "$s/backend/prisma/schema.prisma"
  echo '{"devDependencies":{"prisma":"^7.9.1"}}' > "$s/backend/package.json"
  echo nouveau > "$s/backend/package-lock.json"
  echo nouveau > "$s/frontend/dist/assets/nouveau.js"
  echo police > "$s/frontend/dist/fonts/police.woff2"
  echo '<html>' > "$s/frontend/dist/index.html"
  echo 'RewriteEngine On' > "$s/frontend/dist/.htaccess"
  echo '# n1' > "$s/frontend/src/content/fournees/1.md"
  cp "$SCRIPT" "$s/deploy/plesk-deploy.sh"

  : > "$T/journal"
  cat > "$T/bin/npx" <<EOF
#!/usr/bin/env bash
echo "npx \$*" >> "$T/journal"
[ "\${FAUX_NPX_ECHOUE:-0}" = 1 ] && exit 1
exit 0
EOF
  cat > "$T/bin/npm" <<EOF
#!/usr/bin/env bash
echo "npm \$*" >> "$T/journal"
EOF
  # `node` réel est nécessaire pour lire package.json : on garde le PATH.
  chmod +x "$T/bin/npx" "$T/bin/npm"
}

lancer() {
  TAMBOUILLE_HOME="$T/home" NODE_BIN="$T/bin" bash "$SCRIPT" "$T/source" > "$T/sortie" 2>&1
}

API() { echo "$T/home/$API_NOM"; }

echo "cas : nominal"
preparer
if lancer; then
  verifier '[ -f "$(API)/dist/nouveau.txt" ]' "dist/nouveau.txt absent"
  verifier '[ ! -e "$(API)/dist/ancien.txt" ]' "dist/ancien.txt toujours là"
  verifier '[ "$(cat "$(API)/uploads/garde.txt")" = garde ]' "uploads modifié"
  verifier 'grep -q "^DATABASE_URL=" "$(API)/.env"' ".env modifié"
  verifier '[ -f "$(API)/generated/client.js" ]' "generated non remplacé"
  verifier '[ -f "$(API)/fournees/1.md" ]' "fournées non copiées"
  verifier '[ -f "$T/home/httpdocs/assets/nouveau.js" ]' "assets/nouveau.js absent"
  verifier '[ ! -e "$T/home/httpdocs/assets/ancien.js" ]' "assets/ancien.js toujours là"
  verifier '[ -f "$T/home/httpdocs/.htaccess" ]' ".htaccess non copié"
  verifier '[ -f "$T/home/httpdocs/fonts/police.woff2" ]' "fonts non copiées"
  verifier '[ -f "$(API)/tmp/restart.txt" ]' "restart.txt absent"
  verifier '[ "$(head -1 "$T/journal")" = "npx --yes prisma@^7.9.1 migrate deploy" ]' \
    "la première commande n'est pas la migration : $(head -1 "$T/journal")"
else
  echouer "sortie non nulle : $(tail -3 "$T/sortie")"
fi

echo "cas : migration en échec"
preparer
if FAUX_NPX_ECHOUE=1 lancer; then
  echouer "sortie 0 malgré l'échec de la migration"
fi
verifier '[ -f "$(API)/dist/ancien.txt" ]' "le code a été remplacé malgré l'échec"
verifier '[ ! -e "$(API)/tmp/restart.txt" ]' "redémarrage demandé malgré l'échec"

echo "cas : verrou inchangé"
preparer
echo nouveau > "$(API)/package-lock.json.deployed"
lancer || echouer "sortie non nulle : $(tail -3 "$T/sortie")"
verifier '! grep -q "^npm ci" "$T/journal"' "npm ci lancé alors que le verrou n'a pas changé"

echo "cas : verrou modifié"
preparer
lancer || echouer "sortie non nulle : $(tail -3 "$T/sortie")"
verifier 'grep -qx "npm ci --omit=dev" "$T/journal"' "npm ci --omit=dev non lancé"
verifier 'cmp -s "$(API)/package-lock.json" "$(API)/package-lock.json.deployed"' ".deployed non mis à jour"

echo "cas : archive incomplète"
preparer
rm -rf "$T/source/backend/generated"
if lancer; then echouer "sortie 0 sur une archive incomplète"; fi
verifier '[ -f "$(API)/dist/ancien.txt" ]' "dist modifié sur une archive incomplète"
verifier '[ ! -s "$T/journal" ]' "des commandes ont tourné : $(cat "$T/journal")"
verifier '[ ! -e "$(API)/prisma/schema.prisma" ]' "prisma remplacé sur une archive incomplète"

echo "cas : transit déjà présent"
preparer
mkdir -p "$T/travail/transit"
echo vieux > "$T/travail/transit/vieux.txt"
if (cd "$T/source" && tar czf - .) |
  DEPLOY_WORK="$T/travail" TAMBOUILLE_HOME="$T/home" NODE_BIN="$T/bin" \
    bash "$ENTREE" > "$T/sortie" 2>&1; then
  verifier '[ ! -e "$T/travail/transit/vieux.txt" ]' "le transit précédent n'a pas été vidé"
  verifier '[ -f "$(API)/dist/nouveau.txt" ]' "le déploiement par le point d'entrée n'a rien posé"
else
  echouer "sortie non nulle : $(tail -3 "$T/sortie")"
fi

if [ "$echecs" -gt 0 ]; then
  echo "$echecs échec(s)"
  exit 1
fi
echo "tous les cas passent"
