## Why

Les membres du club disposent déjà d'une identité sur le realm Keycloak
`cartemembre.jeancloude.club`, partagé avec au moins une autre application
(`vip.jeancloude.club`). Aujourd'hui ils doivent tenir un mot de passe Tambouille
séparé. Ajouter ce realm comme fournisseur d'identité leur donne une porte de
plus sur leur compte, et une inscription en un clic pour les nouveaux membres.

Le realm est configuré avec l'inscription libre (`User registration: On`) et la
vérification du courriel activée (`Vérification du courriel: On`). Cette seconde
valeur est la condition de tout le reste : c'est elle qui rend la création de
comptes sûre, par le standard déjà établi pour Google en 2026-08-08. Si elle
repassait à Off, la création devrait être retirée.

## What Changes

- **Nouveau fournisseur d'identité** : `POST /auth/oidc` accepte un `id_token`
  Keycloak, le vérifie contre le JWKS du realm, et ouvre une session Tambouille.
  Même forme que `POST /auth/google` : le navigateur obtient le token, le
  backend le vérifie, aucun état serveur.
- **Création de comptes autorisée** depuis une carte de membre, sous la même
  garde que Google : refus si `email_verified` est faux.
- **Refus sur email existant**, comme Google, sans exception ni auto-liaison.
- **Liaison depuis le profil** : `POST /auth/oidc/link` attache une carte à un
  compte déjà ouvert, la session servant de preuve de propriété du compte.
- **Reprise automatique après refus** : un 409 pour email existant conduit le
  front à faire se connecter l'utilisateur, puis à rattacher la carte tout seul,
  sans nouvelle saisie. C'est ce qui rend le refus praticable et couvre aussi le
  cas où l'adresse du club diffère de l'adresse Tambouille.
- **Nouvelle colonne** `users.keycloakId`, unique et nullable.
- Aucun changement sur les chemins existants : mot de passe, Google,
  réinitialisation et `POST /auth/register` sont intouchés. Pas de rupture.

## Capabilities

### New Capabilities

- `keycloak-login`: authentification par le realm Keycloak du club — vérification
  de l'`id_token`, ouverture de session sur une carte déjà rattachée, création de
  compte, refus sur email déjà pris, et rattachement d'une carte à un compte
  existant.

### Modified Capabilities

Aucune. `openspec/specs/` ne contient aucune capacité à ce jour ; les
comportements existants (mot de passe, Google, réinitialisation) ne sont pas
modifiés par ce changement.

## Impact

**Backend**

- `prisma/schema.prisma` : `users.keycloakId String? @unique` + migration.
- `src/auth/` : un `OidcTokenVerifier` calqué sur `GoogleTokenVerifier`
  (lecture paresseuse de la configuration incluse), deux méthodes de service,
  deux routes sur `AuthController`.
- `toPublicUser` : un champ `hasKeycloak` booléen, sur le modèle de `hasGoogle`
  — le `sub` lui-même ne sort jamais de l'API, c'est une clé de recherche.
- Nouvelle dépendance : `jose`, pour la vérification JWKS générique.
  `google-auth-library` reste en place pour Google.

**Frontend**

- Un flux `authorization_code` + PKCE écrit sur les primitives de la plateforme
  (`crypto.subtle`, `sessionStorage`, `URLSearchParams`), sans bibliothèque OIDC :
  l'`id_token` est échangé immédiatement contre le JWT maison, donc renouvellement
  silencieux et surveillance de session — ce que ces bibliothèques apportent —
  ne servent jamais.
- Une route de retour, un bouton sur les vues de connexion et d'inscription, une
  section « carte de membre » dans les réglages.

**Configuration**

- Backend : `KEYCLOAK_ISSUER`, `KEYCLOAK_CLIENT_ID`.
- Frontend : `VITE_KEYCLOAK_ISSUER`, `VITE_KEYCLOAK_CLIENT_ID`.
- Keycloak : un client public avec PKCE S256 et les URIs de redirection du site.

**Prérequis côté realm, à vérifier avant l'implémentation**

- Un SMTP fonctionnel dans Realm settings → Email. La vérification du courriel
  activée sans SMTP bloque les membres sur l'action requise `VERIFY_EMAIL` à leur
  prochaine connexion, sans moyen de la franchir.
- Que `email_verified` arrive effectivement dans l'`id_token` avec le scope
  `email` : le document de découverte du realm ne l'annonce pas dans
  `claims_supported`, et toute la garde de création en dépend.

**Hors périmètre**

- La révocation d'adhésion. Le JWT Tambouille vit 7 jours et ne reconsulte jamais
  le realm, donc un membre radié conserve sa session jusqu'à expiration. Question
  distincte, qui touche la durée de vie des sessions et non ce flux.
- La déconnexion globale (`end_session_endpoint`). `logout()` reste local.
- La désliaison d'une carte, comme il n'y a pas de désliaison Google.
- L'adoption de `preferred_username` comme nom d'utilisateur.
- Le champ `roles` du realm : l'adhésion authentifie, elle n'autorise rien.
