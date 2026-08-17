## Purpose

Permet aux membres du club de s'authentifier sur Tambouille avec l'identité qu'ils
détiennent déjà sur le realm Keycloak du club, que ce soit pour ouvrir une session
sur un compte existant, pour créer un compte, ou pour rattacher leur carte à un
compte qu'ils possèdent déjà.

## ADDED Requirements

### Requirement: Vérification du jeton d'identité

Le système MUST vérifier tout jeton d'identité présenté avant d'en tirer la
moindre conséquence : signature contre les clés publiées par le realm, émetteur
égal à l'émetteur configuré, audience égale au client configuré, et jeton non
expiré. La vérification MUST n'accepter qu'un algorithme de signature asymétrique ;
un jeton signé avec un algorithme symétrique MUST être refusé, y compris lorsque
le realm l'annonce comme disponible.

Un défaut de configuration du serveur (émetteur ou client absent) MUST se
distinguer d'un jeton invalide : il MUST produire une erreur serveur nommant la
variable manquante, et non un refus d'authentification. Cette configuration MUST
n'être lue qu'au premier usage de ce flux, jamais à la construction du service, de
sorte qu'une variable absente n'empêche pas l'API de démarrer.

#### Scenario: Jeton valide

- **WHEN** un jeton signé par le realm, destiné au client configuré et non expiré est présenté
- **THEN** le système en retient le sujet et l'adresse, et poursuit le traitement

#### Scenario: Jeton altéré, expiré, ou émis pour un autre client

- **WHEN** la signature, l'émetteur, l'audience ou l'expiration ne sont pas conformes
- **THEN** le système répond 401 sans consulter ni modifier aucun compte

#### Scenario: Jeton signé avec un algorithme symétrique

- **WHEN** un jeton signé en HS256, HS384 ou HS512 est présenté
- **THEN** le système répond 401, quelle que soit la clé utilisée

#### Scenario: Émetteur ou client non configuré

- **WHEN** un jeton est présenté alors que la configuration du realm est absente côté serveur
- **THEN** le système répond par une erreur serveur nommant la variable manquante
- **AND** les autres moyens de connexion restent opérationnels

### Requirement: Connexion par une carte déjà rattachée

Le système MUST ouvrir une session sur le compte portant le sujet du jeton, et
MUST identifier le compte par ce seul sujet — jamais par l'adresse. Le fait que le
compte possède ou non un mot de passe, un nom d'utilisateur ou une identité
Google MUST rester sans effet sur cette connexion.

#### Scenario: Le sujet correspond à un compte

- **WHEN** un jeton valide dont le sujet est déjà rattaché à un compte est présenté sur `POST /auth/oidc`
- **THEN** le système répond 200 avec un jeton de session et le compte correspondant

#### Scenario: L'adresse du jeton a changé sur le realm

- **WHEN** le sujet est rattaché à un compte mais l'adresse du jeton diffère de celle du compte
- **THEN** le système ouvre la session sur ce compte
- **AND** l'adresse enregistrée sur le compte reste inchangée

### Requirement: Refus lorsque l'adresse a déjà un compte

Lorsque le sujet du jeton n'est rattaché à aucun compte mais que l'adresse du
jeton correspond à celle d'un compte existant, le système MUST refuser avec un
409 et MUST laisser ce compte inchangé. La comparaison des adresses MUST être
insensible à la casse.

Ce refus MUST s'appliquer sans exception : quelle que soit la valeur de la
vérification d'adresse portée par le jeton, et quelle que soit la manière dont le
compte existant a été créé. Le système MUST NOT rattacher automatiquement le sujet
à ce compte, et MUST NOT ouvrir de session dessus.

Le message de refus MUST indiquer que la carte se rattache depuis le profil, une
fois connecté.

#### Scenario: L'adresse correspond à un compte à mot de passe

- **WHEN** un jeton valide et vérifié porte l'adresse d'un compte existant
- **THEN** le système répond 409 en indiquant de se connecter puis de rattacher la carte
- **AND** le compte existant n'est modifié en aucune façon

#### Scenario: L'adresse ne diffère que par la casse

- **WHEN** le jeton porte `Nelly@Example.com` et un compte existe avec `nelly@example.com`
- **THEN** le système répond 409 et ne crée aucun compte

### Requirement: Refus d'une adresse non vérifiée par le realm

Lorsque le sujet est inconnu et l'adresse libre, le système MUST refuser avec un
409 si le realm ne déclare pas l'adresse comme vérifiée. Le système MUST NOT créer
de compte sur une adresse dont l'émetteur ne se porte pas garant, et MUST traiter
l'absence de cette déclaration dans le jeton comme une adresse non vérifiée.

Le message de refus MUST indiquer que l'adresse doit être vérifiée sur le realm.

#### Scenario: Adresse déclarée non vérifiée

- **WHEN** un jeton valide dont l'adresse est libre déclare l'adresse comme non vérifiée
- **THEN** le système répond 409 en indiquant de vérifier l'adresse
- **AND** aucun compte n'est créé

#### Scenario: Déclaration de vérification absente du jeton

- **WHEN** le jeton ne porte aucune déclaration de vérification d'adresse
- **THEN** le système se comporte comme si l'adresse n'était pas vérifiée

### Requirement: Création d'un compte depuis une carte

Lorsque le sujet est inconnu, l'adresse libre et déclarée vérifiée par le realm,
le système MUST créer un compte portant ce sujet et cette adresse, et MUST ouvrir
une session dessus.

Le compte créé MUST NOT avoir de mot de passe ni de nom d'utilisateur : son
titulaire les choisit ensuite par les parcours existants. Le système MUST NOT
reprendre le nom d'utilisateur porté par le realm.

Le titulaire d'un compte ainsi créé MUST pouvoir obtenir un mot de passe par la
réinitialisation par courriel, de sorte que la perte de la carte ne l'enferme pas
hors de son compte.

#### Scenario: Nouveau membre sans compte Tambouille

- **WHEN** un jeton valide, de sujet inconnu, d'adresse libre et déclarée vérifiée est présenté
- **THEN** le système crée un compte et répond 200 avec un jeton de session
- **AND** le compte est sans mot de passe et sans nom d'utilisateur

#### Scenario: Complétion du compte créé

- **WHEN** le titulaire d'un compte créé par une carte choisit un nom d'utilisateur puis un mot de passe
- **THEN** les deux sont enregistrés par les parcours existants, sans traitement particulier

#### Scenario: Perte de la carte

- **WHEN** le titulaire d'un compte créé par une carte demande une réinitialisation de mot de passe pour son adresse
- **THEN** le système la traite comme pour tout autre compte

### Requirement: Rattachement d'une carte à un compte existant

Le système MUST permettre à un utilisateur connecté de rattacher une carte à son
compte, la session servant de preuve qu'il détient ce compte. Cette opération
MUST exiger une session valide et MUST NOT demander de ressaisir le mot de passe.

Le système MUST NOT exiger que l'adresse de la carte corresponde à celle du
compte : la session prouve un côté du rapprochement et le jeton l'autre, une
comparaison d'adresses n'y ajoute rien.

Un sujet MUST NOT être rattaché à deux comptes. Le système MUST refuser avec un
409 si le sujet appartient déjà à un autre compte, et MUST refuser avec un 409 si
le compte visé porte déjà une carte. Cette unicité MUST tenir sous requêtes
concurrentes : de deux rattachements simultanés, un seul MUST aboutir.

#### Scenario: Rattachement à un compte sans carte

- **WHEN** un utilisateur connecté présente un jeton valide dont le sujet est libre sur `POST /auth/oidc/link`
- **THEN** le système rattache le sujet à son compte et répond 200 avec le compte mis à jour
- **AND** aucune nouvelle session n'est émise

#### Scenario: Adresse de la carte différente de celle du compte

- **WHEN** l'adresse portée par le jeton diffère de celle du compte connecté
- **THEN** le rattachement aboutit

#### Scenario: Sujet déjà rattaché à un autre compte

- **WHEN** le sujet du jeton appartient déjà à un autre compte
- **THEN** le système répond 409 et ne modifie aucun des deux comptes

#### Scenario: Compte portant déjà une carte

- **WHEN** le compte connecté porte déjà une carte
- **THEN** le système répond 409 et la carte enregistrée reste celle d'origine

#### Scenario: Deux rattachements concurrents du même sujet

- **WHEN** deux requêtes rattachent simultanément le même sujet à deux comptes
- **THEN** une aboutit et l'autre reçoit un 409

#### Scenario: Sans session

- **WHEN** un jeton est présenté sur `POST /auth/oidc/link` sans session valide
- **THEN** le système répond 401

### Requirement: Reprise du refus par une liaison

Le site MUST transformer un refus pour adresse déjà prise en un parcours qui
aboutit, sans que l'utilisateur ait à comprendre ce qui s'est passé : il l'invite
à se connecter par son moyen habituel, puis rattache la carte de lui-même et le
laisse sur un compte auquel sa carte est liée.

Le site MUST NOT conserver de jeton d'identité pendant la saisie des identifiants ;
il en obtient un nouveau après la connexion.

#### Scenario: Membre disposant déjà d'un compte Tambouille

- **WHEN** une tentative de connexion par carte est refusée parce que l'adresse a déjà un compte
- **THEN** le site invite à se connecter par le moyen habituel
- **AND** une fois la session ouverte, il rattache la carte sans nouvelle action de l'utilisateur

#### Scenario: Connexion abandonnée

- **WHEN** l'utilisateur quitte le parcours avant d'ouvrir une session
- **THEN** aucun rattachement n'a lieu et aucun compte n'est modifié

### Requirement: Chemin de retour unique

Le site MUST exposer le retour du fournisseur sur `/auth/callback`, et ce chemin
MUST être le seul enregistré comme URI de redirection auprès du realm. Les URIs
enregistrées MUST être exactes, une par environnement ; aucun joker MUST être
enregistré, car tout chemin couvert par un joker devient une cible où le code
d'autorisation peut être renvoyé.

Le site MUST rejeter un retour dont l'`state` ne correspond pas à celui qu'il a
émis, et MUST effacer les valeurs conservées le temps de l'aller-retour dans tous
les cas, y compris en erreur et en abandon.

#### Scenario: Retour nominal

- **WHEN** le fournisseur renvoie sur `/auth/callback` avec un code et l'`state` émis
- **THEN** le site échange le code et poursuit l'authentification
- **AND** les valeurs conservées pour l'aller-retour sont effacées

#### Scenario: `state` non concordant

- **WHEN** le retour porte un `state` différent de celui émis, ou aucun
- **THEN** le site n'échange pas le code et n'ouvre aucune session

#### Scenario: Retour en erreur

- **WHEN** le fournisseur renvoie une erreur au lieu d'un code
- **THEN** le site l'affiche sans ouvrir de session
- **AND** les valeurs conservées pour l'aller-retour sont effacées

### Requirement: Le sujet OIDC ne sort pas de l'API

Le sujet porté par le realm MUST NOT figurer dans aucune réponse de l'API : il est
la seule clé de recherche d'un compte par ce flux, et le publier permettrait de
retrouver un compte à partir d'une réponse publique. L'API MUST se limiter à
indiquer si le compte porte ou non une carte.

#### Scenario: Consultation de son propre compte

- **WHEN** un utilisateur consulte son compte
- **THEN** la réponse indique si une carte est rattachée, sans révéler le sujet

#### Scenario: Consultation d'un profil public

- **WHEN** un visiteur consulte le profil d'un membre
- **THEN** la réponse ne contient ni le sujet ni l'indication d'une carte
