## Context

Voir `proposal.md` — Why. Ce qui contraint l'approche :

**L'authentification Google existante est sans état.** Le navigateur obtient un
`id_token`, le POSTe, le backend vérifie une signature et rend un JWT maison. Pas
de redirection serveur, pas de `state` en session, pas de secret client, pas de
table de sessions. C'est la propriété la plus précieuse du système actuel, et
Keycloak peut y entrer sans la casser.

**Le realm est administré par le projet.** Découverte :
`https://cartemembre.jeancloude.club/realms/jeancloude.club`, PKCE S256 disponible,
`RS256` parmi les algorithmes — mais aussi `HS256`/`HS384`/`HS512`. Inscription
libre activée, vérification du courriel activée.

**`users.email` est immuable.** Aucun endpoint ne le modifie : `UpdateProfileDto`
ne porte que `displayName` et `bio`. Une adresse posée à la création le reste.

**Tambouille ne vérifie aucune adresse à l'inscription.** `register()` valide la
forme via `@IsEmail()` puis crée la ligne. C'est le fait dont découle tout le
raisonnement sur les conflits, et il est déjà consigné dans
`docs/superpowers/specs/2026-08-08-google-auth-design.md`.

## Goals / Non-Goals

**Goals**

- Garder le backend sans état sur la partie OAuth.
- Ne pas affaiblir d'un cran la politique établie pour Google, et n'en réécrire
  aucun argument : ce qui vaut pour un fournisseur vaut pour l'autre.
- Que le refus sur email existant soit une redirection praticable et non un cul-de-sac.

**Non-Goals**

- Toute abstraction « multi-fournisseurs » anticipant un troisième émetteur.
- Toute machinerie de provenance d'adresse (voir Décision 4 : elle n'est pas nécessaire).
- Le flux `authorization_code` côté serveur, avec secret client et état de session.

## Decisions

### 1. `users.keycloakId` en colonne, pas de table `identities`

Une colonne unique et nullable de plus, comme `googleId`.

*Alternative* : une table `identities (provider, subject, userId)` avec
`@@unique([provider, subject])`, et migration de `googleId` dedans.

*Pourquoi la colonne* : il y a un realm, celui de ce club, et aucun troisième
émetteur au programme. La table générique coûte une migration avec reprise de
données et la réécriture des recherches Google existantes — dont les commentaires
énoncent que `googleId` est *la seule* clé de recherche — pour une souplesse dont
rien n'indique le besoin. La table redevient le bon choix au troisième fournisseur,
pas au deuxième.

### 2. PKCE dans le navigateur, sur les primitives de la plateforme

Le navigateur mène le `authorization_code` + PKCE, obtient l'`id_token`, le POSTe
au backend qui le vérifie. Le backend ne parle jamais à Keycloak sauf pour lire
le JWKS.

*Alternatives* : (a) `oidc-client-ts` ou `keycloak-js` côté front ;
(b) le flux complet côté backend, avec `/auth/oidc/start`, `/auth/oidc/callback`,
secret client, `state` et `nonce` stockés serveur.

*Pourquoi celle-ci* : (a) l'`id_token` est échangé dans la seconde contre le JWT
maison, donc le renouvellement silencieux, le rafraîchissement et la surveillance
de session — l'essentiel de ce que ces bibliothèques apportent — ne s'exécutent
jamais. Il reste `crypto.subtle.digest` pour le S256, `sessionStorage` pour le
verifier et le `state`, `URLSearchParams` : de l'ordre de quarante lignes.
(b) est plus orthodoxe sur le papier mais introduit de l'état serveur là où il
n'y en a aucun, un secret à gérer, et une seconde forme d'authentification à
maintenir à côté de celle de Google. Le coût dépasse le gain.

Conséquence assumée, identique au flux Google : le backend reçoit un `id_token`
nu et ne peut pas établir qu'il a été émis pour *ce* navigateur — le `nonce` vit
côté client, il n'y a rien côté serveur à quoi le comparer. Quiconque dérobe un
`id_token` valide et non expiré peut le présenter. C'est déjà la propriété du
chemin Google ; ce changement ne la dégrade pas et ne la corrige pas.

### 3. `algorithms: ['RS256']` épinglé explicitement

Le realm annonce `HS256`, `HS384`, `HS512` parmi les algorithmes de signature.
Accepter un algorithme symétrique en vérifiant contre une clé issue du JWKS ouvre
la confusion d'algorithme : la clé publique devient le secret partagé, et
n'importe qui peut signer un token. `google-auth-library` refusait ce cas tout
seul ; avec `jose` en direct, la liste blanche est à écrire à la main. Non
négociable, et à énoncer dans le code comme telle.

### 4. Refus systématique sur email existant, et pas d'auto-liaison

La règle Google est reprise mot pour mot : une adresse qui a déjà un compte est
refusée, quoi que dise `email_verified` et quel que soit l'état de la ligne.

*Alternative examinée et écartée* : ouvrir l'auto-liaison quand les deux côtés du
rapprochement sont prouvés. Le calcul, en énumérant ce que `users.email` peut
valoir :

| # | Naissance / évolution de la ligne | Adresse prouvée ? | Par qui | Enregistré ? |
|---|---|---|---|---|
| P1 | `register` | non | — | s.o. |
| P2 | `register` + réinitialisation consommée | oui | la boîte elle-même | dérivable : `PasswordResetToken.usedAt != null` |
| P3 | `loginWithGoogle`, branche `create` | oui | Google | non |
| P4 | P3 + `setPassword` | oui | Google | non |
| P5 | `register` + `linkGoogle` | non | — | non |

Deux constats. D'abord **P3 et P5 sont indiscernables** : les deux portent
`googleId != null`, mais `linkGoogle` ne compare délibérément pas l'adresse du
compte Google à celle de la ligne, donc dans P5 l'adresse n'a jamais été vérifiée
par personne. Rendre P3 exploitable demanderait un champ `emailVerifiedAt`, une
migration, et une reprise de données qui ne peut retrouver P3 que par l'inférence
`googleId != null && password == null` — exactement le genre d'inférence que les
commentaires du service interdisent de faire tourner en production. Ensuite **P2
est dérivable** et non exploité : les jetons de réinitialisation ne sont jamais
supprimés (aucun cron, aucun `deleteMany`), et l'adresse étant immuable, un jeton
consommé prouve durablement que le détenteur de la boîte contrôle le compte.

*Pourquoi écarter quand même* : le coût du refus n'est pas la sécurité, c'est
l'ergonomie — et la Décision 5 le supprime sans toucher à la règle. Une politique
qu'on n'assouplit pas est une politique dont l'argument reste vrai. Le tableau
ci-dessus est conservé parce qu'il documente ce qui a été pesé, pas parce qu'il
faut le construire.

### 5. Le refus se termine par une liaison, automatiquement

Sur 409 pour email existant, le front n'affiche pas une impasse : il fait se
connecter l'utilisateur normalement, puis **refait le tour OIDC en silence** — la
session Keycloak est encore ouverte, donc c'est une redirection sans interaction —
et POSTe le token frais sur `/auth/oidc/link`.

*Alternative* : garder l'`id_token` en `sessionStorage` pendant la saisie du mot
de passe. Écartée : sa durée de vie se compte en minutes et il peut expirer entre
les deux, pour un aller-retour qu'on sait refaire gratuitement.

C'est aussi le seul mécanisme qui traite le cas où l'adresse du club diffère de
l'adresse Tambouille — cas où aucun conflit n'est détecté et où un second compte
serait créé en silence (voir Risques).

### 6. Deux fonctions, pas une abstraction paramétrée

`loginWithGoogle` et `loginWithKeycloak` restent distinctes malgré une structure
identique.

*Alternative* : extraire `loginWithFederatedIdentity(identity, provider)`.

*Pourquoi non* : le corps partagé serait de quatre étapes courtes, tandis que le
paramètre « provider » traverserait des clauses `where` Prisma, des messages
d'erreur distincts et des commentaires qui nomment Google explicitement. Deux
fonctions courtes se lisent ; une fonction paramétrée sur deux cas se déchiffre.
La règle est identique aujourd'hui, ce qui ne veut pas dire qu'elle le restera —
les gardes de Google visent une menace propre à Google (un domaine Workspace non
vérifié permet d'émettre des jetons en série), et rien ne garantit que les deux
politiques évoluent ensemble.

### 7. Un seul chemin de retour, enregistré à l'identique des deux côtés

Le retour du fournisseur arrive sur `/auth/callback`, et ce chemin est le seul
enregistré auprès du realm. Le routeur du front est en `createWebHistory`, donc le
chemin s'écrit tel quel, sans fragment.

Configuration du client public, `client_id: tambouille` :

| Champ | Valeur | Raison |
|---|---|---|
| Valid redirect URIs | `https://tambouille.pantagruweb.club/auth/callback` et `http://localhost:5173/auth/callback` | exactes, une par environnement |
| Valid post logout redirect URIs | vide | la déconnexion globale est hors périmètre ; une liste vide la refuse |
| Web origins | `+` | origines déduites des URIs de redirection, et elles restent synchronisées |
| PKCE Code Challenge Method | `S256` | onglet Advanced ; sans ce réglage, PKCE reste facultatif et un code s'échange sans verifier |
| Chiffrement de l'`id_token` | désactivé | le realm publie une clé `RSA-OAEP` (`use: enc`), donc un jeton chiffré ferait échouer une vérification par signature seule |

*Alternative écartée* : un joker, `https://tambouille.pantagruweb.club/*`. Tout
chemin du site devient alors une cible de renvoi du code, et une redirection
ouverte ou un XSS sur n'importe quelle page suffit à l'intercepter. Le gain — ne
pas éditer le realm quand le chemin change — ne vaut pas cette surface.

`Web origins` n'est pas optionnel : le navigateur appelle le `token_endpoint`
directement, donc en requête croisée, et sans origine autorisée l'échange du code
est bloqué avant d'atteindre Keycloak.

### 8. L'espace d'états des comptes ne grandit pas

Un compte né d'une carte a `username: null` et `password: null` : exactement l'état
d'un compte né de Google. Le parcours de complétion existant (`setUsername`,
`setPassword`) s'applique sans modification, et `preferred_username` n'est pas
adopté — `username` étant unique, l'adopter exigerait une branche de collision et
ferait diverger deux chemins de création pour épargner une étape.

## Risks / Trade-offs

**SMTP du realm absent alors que la vérification du courriel est active** →
Keycloak ajoute l'action requise `VERIFY_EMAIL` aux comptes non vérifiés à leur
prochaine connexion ; sans SMTP, le message ne part pas et le membre reste bloqué
dessus, y compris pour `vip.jeancloude.club`. À vérifier dans Realm settings →
Email **avant** toute implémentation. Ce risque porte sur le realm, pas sur
Tambouille, mais c'est ce changement qui le déclenche.

**Les membres déjà inscrits portent `emailVerified: false`** → la bascule ne
rétroagit pas. Les premiers jours, une part des cartes tombera sur le refus « non
vérifié » au lieu de créer un compte. Cela se répare de soi-même à la première
connexion sur le realm, à condition que le SMTP marche. Le message d'erreur doit
dire quoi faire, pas seulement que c'est refusé.

**`email_verified` absent de l'`id_token`** → le document de découverte du realm
ne le liste pas dans `claims_supported`. En pratique Keycloak l'émet avec le scope
`email` et cette liste est statique et incomplète, mais toute la garde de création
en dépend : à constater sur un token réel, pas à supposer. S'il était absent, la
création devrait être retirée du périmètre — le refus par défaut de
`emailVerified === true` s'en charge sans code supplémentaire.

**Second compte silencieux quand les adresses diffèrent** → un membre dont le
compte Tambouille porte l'adresse personnelle et la carte l'adresse du club ne
déclenche aucun conflit : un compte vide est créé, ses mixs restent sur l'autre.
Le rapprochement par adresse est aveugle à ce cas par construction. Atténué par la
Décision 5, qui rend la liaison depuis le profil le chemin visible et non un
repli ; pas éliminé.

**L'inscription libre sur le realm** → n'importe qui peut se créer une « carte de
membre ». Avec la vérification du courriel active, il faut contrôler la boîte pour
obtenir `email_verified: true`, donc cela ne donne pas accès à l'adresse d'un
tiers ; le pouvoir obtenu ne dépasse pas celui de `POST /auth/register`, déjà
ouvert. Si la vérification repassait à Off, cette équivalence tomberait et la
création deviendrait la faille décrite dans le document de 2026-08-08.

**Aucune désliaison** → une carte attachée le reste, comme une identité Google.
Sans conséquence tant que la vérification du courriel garantit qu'une carte
correspond à une boîte réellement contrôlée.

## Migration Plan

1. Vérifier les deux prérequis du realm (SMTP, présence de `email_verified` dans
   un token réel). Un échec ici arrête le déploiement, il ne se contourne pas.
2. Créer le client public sur le realm : PKCE S256 obligatoire, URIs de
   redirection du site, pas de secret.
3. Migration Prisma additive : `keycloakId String? @unique`. Nullable, aucune
   reprise de données, aucune ligne existante touchée.
4. Déployer le backend. Les nouvelles routes sont inertes tant que le front
   n'appelle pas ; les chemins existants ne changent pas de comportement.
5. Déployer le front.

**Retour arrière** : retirer les boutons du front suffit à rendre le chemin
inaccessible. La colonne peut rester en place sans effet — nullable, lue par une
seule route. Aucune donnée existante n'est convertie, donc aucun retour arrière
destructeur.
