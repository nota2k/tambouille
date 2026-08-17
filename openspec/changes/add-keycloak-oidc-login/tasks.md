## 1. Prérequis du realm — bloquants

Rien d'autre ne commence avant que ces trois points soient constatés. Un échec ici
arrête le changement plutôt que de le contourner (voir `design.md` — Migration Plan).

- [x] 1.1 Vérifier qu'un SMTP fonctionnel est configuré dans Realm settings → Email, et utiliser le bouton **Test connection** de Keycloak, qui envoie un message à l'adresse du compte admin. C'est l'envoi réel qui compte : la configuration peut être remplie et l'expédition échouer. Sans lui, la vérification du courriel activée bloque les membres sur l'action requise `VERIFY_EMAIL` à leur prochaine connexion, y compris sur `vip.jeancloude.club`.
- [x] 1.2 Créer le client public `tambouille` sur le realm, avec les valeurs de `design.md` décision 7 : Client authentication **Off**, Standard flow seul (ni implicite, ni service accounts), URIs de redirection **exactes** `https://tambouille.pantagruweb.club/auth/callback` et `http://localhost:5173/auth/callback` sans aucun joker, post logout redirect URIs **vide**, Web origins `+`. Puis, dans l'onglet **Advanced** que l'assistant de création n'expose pas : *Proof Key for Code Exchange Code Challenge Method* → **`S256`**, sans quoi PKCE reste facultatif et un code s'échange sans verifier. Toujours dans Advanced, **ne pas activer le chiffrement de l'`id_token`** : le realm publie une clé `RSA-OAEP` (`use: enc`), donc il sait émettre du JWE, et un jeton chiffré ferait échouer une vérification par signature seule. Vérifier enfin dans l'onglet **Client scopes** que `email` est présent en *Default* — c'est lui qui porte `email_verified`.
- [x] 1.3 Obtenir un `id_token` réel de ce client avec le scope `email` et constater que `email_verified` y figure, ainsi que sa valeur. **Constaté : présent, à `true` sur un compte vérifié.** La garde de création a donc bien un claim sur lequel s'appuyer, et `claims_supported` était trompeur comme prévu. Le document de découverte ne l'annonce pas dans `claims_supported` et toute la garde de création en dépend. S'il est absent, arrêter et revenir sur le périmètre. Le plus simple est de faire le flux réel dans un navigateur et de lire la réponse du `token_endpoint` dans les outils de développement ; à défaut, activer « Direct access grants » le temps d'un appel, puis le remettre à Off.
- [x] 1.4 Constater les clés publiées par le realm : `RS256` (`use: sig`) et `RSA-OAEP` (`use: enc`), une seule clé de signature. À noter que l'absence de clé symétrique dans le JWKS ne diminue pas l'exigence de la tâche 3.3 mais la confirme : la confusion d'algorithme consiste précisément à reprendre la clé publique publiée comme secret HMAC.

## 2. Schéma

- [ ] 2.1 Ajouter `keycloakId String? @unique` au modèle `User`, avec le commentaire expliquant pourquoi le sujet est stocké plutôt que l'adresse (une adresse qui change sur le realm doit continuer de résoudre le même compte).
- [ ] 2.2 Générer et appliquer la migration. Vérifier qu'elle est purement additive : colonne nullable, aucune ligne existante touchée.

## 3. Vérification du jeton

- [ ] 3.1 Installer `jose` dans `backend`.
- [ ] 3.2 Écrire `OidcTokenVerifier` sur le modèle de `GoogleTokenVerifier` : lecture de `KEYCLOAK_ISSUER` et `KEYCLOAK_CLIENT_ID` au premier usage et non dans le constructeur, résolue **hors** du `try` de vérification pour qu'une configuration absente remonte en erreur serveur nommant la variable et non en 401. Retourne `{ subject, email, emailVerified }`.
- [ ] 3.3 Épingler `algorithms: ['RS256']` sur `jwtVerify`, avec le commentaire nommant la confusion d'algorithme : le realm annonce `HS256`/`HS384`/`HS512`, et vérifier un jeton symétrique contre une clé issue du JWKS transforme la clé publique en secret partagé. C'est la seule ligne du changement dont l'oubli est silencieux et total.
- [ ] 3.4 Vérifier `issuer` et `audience` dans le même appel, et mettre en cache le `createRemoteJWKSet` avec le client, pour ne pas récupérer le JWKS à chaque connexion.
- [ ] 3.5 Tests unitaires sur le modèle de `google-token-verifier.spec.ts` : jeton valide accepté ; signature altérée refusée ; jeton expiré refusé ; audience étrangère refusée ; émetteur étranger refusé ; **jeton HS256 signé avec la clé publique du JWKS refusé** ; configuration absente produisant une erreur nommant la variable et non un 401.

## 4. Service et routes

- [ ] 4.1 Écrire `loginWithKeycloak` : recherche par `keycloakId` → session ; sinon recherche par email en `mode: 'insensitive'` → 409 dont le message dit de se connecter puis de rattacher la carte depuis le profil ; sinon `!emailVerified` → 409 disant de vérifier l'adresse sur le realm ; sinon création avec `username: null` et `password: null` → session. Ne pas reprendre `preferred_username`.
- [ ] 4.2 Reporter dans les commentaires les raisons qui ne se déduisent pas du code : pourquoi la recherche par email est insensible à la casse, pourquoi le refus ne connaît aucune exception, et pourquoi la création exige `emailVerified` — en renvoyant à `design.md` décision 4 plutôt qu'en recopiant le tableau.
- [ ] 4.3 Écrire `linkKeycloak` sur le modèle de `linkGoogle` : pré-test « ce sujet appartient-il à un autre compte », `updateMany` conditionnel sur `keycloakId: null`, rattrapage du `P2002` en 409. **Sans** le test `emailVerified` de `linkGoogle`, avec le commentaire disant pourquoi : aucune adresse n'est consommée par cette opération, la session prouve le compte et le jeton prouve le sujet.
- [ ] 4.4 Ne pas extraire d'abstraction commune avec `loginWithGoogle` (voir `design.md` décision 6).
- [ ] 4.5 Ajouter `POST /auth/oidc` (non gardée, 200) et `POST /auth/oidc/link` (gardée par `JwtAuthGuard`, 200) sur `AuthController`, avec un DTO portant le jeton.
- [ ] 4.6 Ajouter `hasKeycloak` à `toPublicUser`, jamais le sujet lui-même, avec le commentaire existant de `hasGoogle` comme modèle : publier le sujet permettrait de retrouver un compte depuis une réponse publique.
- [ ] 4.7 Tests sur le modèle de `auth.service.spec.ts`, un par scénario du spec : sujet connu → session ; adresse prise → 409 et compte inchangé ; casse différente → 409 ; adresse non vérifiée → 409 ; déclaration absente → traitée comme non vérifiée ; création → compte sans mot de passe ni nom d'utilisateur ; rattachement nominal ; adresse différente → rattachement accepté ; sujet pris ailleurs → 409 ; compte déjà porteur → 409 ; concurrence → un seul aboutit.

## 5. Front — flux PKCE

- [ ] 5.1 Écrire le flux d'autorisation sur les primitives de la plateforme, sans bibliothèque OIDC : `crypto.getRandomValues` pour le verifier et le `state`, `crypto.subtle.digest` pour le S256, `sessionStorage` pour les conserver le temps de l'aller-retour, `URLSearchParams` pour l'URL d'autorisation.
- [ ] 5.2 Ajouter la route de retour sur **`/auth/callback`** — exactement le chemin enregistré auprès du realm, toute divergence casse l'authentification — et sa vue : vérifier le `state`, échanger le code contre les jetons au `token_endpoint`, puis POSTer l'`id_token` sur `/auth/oidc`. Nettoyer `sessionStorage` dans tous les cas, y compris en erreur et en abandon.
- [ ] 5.3 Ajouter `loginWithKeycloak` et `linkKeycloak` au store `auth`, sur le modèle exact des actions Google : la première pose une session, la seconde ne met à jour que `user`.
- [ ] 5.4 Ajouter le bouton sur `LoginView` et `RegisterView`, et une section « carte de membre » dans `SettingsView` affichant l'état d'après `hasKeycloak`.
- [ ] 5.5 Vérifier qu'un compte créé par une carte atterrit bien sur `ChooseUsernameView`, sans traitement particulier — le parcours de complétion existant doit s'appliquer tel quel.

## 6. Front — reprise après refus

- [ ] 6.1 Distinguer les deux 409 dans la vue de retour : adresse déjà prise (reprise possible) et adresse non vérifiée (rien à reprendre, afficher quoi faire sur le realm).
- [ ] 6.2 Implémenter la reprise pour le premier cas : mémoriser l'intention de rattachement — **et non le jeton**, qui expire en quelques minutes — inviter à se connecter par le moyen habituel, puis refaire le tour OIDC en silence après ouverture de la session et POSTer le jeton frais sur `/auth/oidc/link`.
- [ ] 6.3 Vérifier qu'un abandon en cours de route ne laisse ni rattachement ni intention résiduelle : quitter la page de connexion doit ramener à un état propre.

## 7. Configuration et documentation

- [ ] 7.1 Ajouter `KEYCLOAK_ISSUER="https://cartemembre.jeancloude.club/realms/jeancloude.club"` et `KEYCLOAK_CLIENT_ID="tambouille"` à `backend/.env.example`, avec le commentaire d'usage en français comme les autres entrées, et la mention que ces variables sont lues au premier usage donc leur absence ne casse que ce flux.
- [ ] 7.2 Ajouter `VITE_KEYCLOAK_ISSUER` et `VITE_KEYCLOAK_CLIENT_ID` (mêmes valeurs, le client est public et son identifiant n'est pas un secret) à `frontend/.env.example` et `frontend/.env.production`.
- [ ] 7.3 Mentionner la connexion par carte de membre dans la liste des fonctionnalités du `README.md`.

## 8. Vérification de bout en bout

Contre le realm réel, par requête et réponse, en complément des tests unitaires.

- [ ] 8.1 Nouveau membre sans compte Tambouille : un clic crée le compte et amène au choix du nom d'utilisateur.
- [ ] 8.2 Membre disposant déjà d'un compte à la même adresse : refus, connexion, rattachement automatique, et à l'arrivée `hasKeycloak` vrai sans nouvelle action.
- [ ] 8.3 Membre dont l'adresse du club diffère de son adresse Tambouille : constater qu'aucun conflit n'est détecté et qu'un second compte serait créé — c'est le risque connu et non éliminé. Vérifier que le rattachement depuis les réglages est le chemin qui marche, et qu'il est visible.
- [ ] 8.4 Membre non encore vérifié sur le realm : refus avec un message qui dit quoi faire.
- [ ] 8.5 Jeton altéré à la main et jeton expiré : 401 dans les deux cas.
- [ ] 8.6 Compte créé par une carte, puis réinitialisation de mot de passe sur son adresse : le mail arrive et le mot de passe s'installe — la perte de la carte n'enferme pas dehors.
- [ ] 8.7 Vérifier qu'aucune réponse de l'API ne contient le sujet : `GET /auth/me`, le profil public, la recherche d'utilisateurs.
- [ ] 8.8 Vérifier que les chemins existants n'ont pas bougé : inscription, connexion par mot de passe, connexion Google, réinitialisation.
