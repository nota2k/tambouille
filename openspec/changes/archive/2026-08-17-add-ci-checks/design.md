## Context

Voir `proposal.md` — Why. Les contraintes qui façonnent l'approche, toutes
mesurées sur le dépôt avant d'écrire :

- Deux paquets npm indépendants, chacun avec son `package-lock.json`.
- La suite unitaire du backend passe 539/539 dans un environnement entièrement
  vierge et sans base joignable. Elle n'a besoin de rien.
- `postinstall` déclenche `prisma generate` à chaque `npm ci`, et cela
  fonctionne sans `DATABASE_URL`. Le hook est inoffensif ici.
- La suite de bout en bout tient en un fichier utile, `mail-boot.e2e-spec.ts`.
  Elle exige un PostgreSQL joignable — `PrismaService.onModuleInit` appelle
  `$connect()` — mais **pas** de schéma : vérifié contre une base vide et non
  migrée, elle passe. Le second fichier, `app.e2e-spec.ts`, est le gabarit de
  `nest new` et échoue à l'import ; la proposition le retire.
- Le frontend impose `node: ^22.18.0 || >=24.12.0`. La production tourne sur
  node 22 (`nodevenv .../22/bin/node`).
- Tous les scripts de lint existants passent `--fix`.

## Goals / Non-Goals

**Goals :**

- Une vérification qu'un relecteur peut croire : quand elle est rouge, quelque
  chose est cassé dans le changement examiné.
- Un temps de retour court — l'intégralité des vérifications bloquantes tient
  en quelques minutes.
- Aucune vérification bloquante ne réclame de secret, de sorte que le workflow
  fonctionne identiquement sur une proposition de fusion venue d'un fork.

**Non-Goals :**

- Le déploiement. Rien de ce workflow ne touche o2switch.
- Rendre l'analyse statique verte. Les 659 problèmes backend et 22 frontend
  restent, sous les yeux de tous, dans un rapport non bloquant.
- La couverture de test, les tests de bout en bout du frontend, l'audit des
  dépendances. Chacun est un chantier distinct, aucun n'est prérequis.

## Decisions

### Deux tâches, une par paquet, plutôt qu'une seule

Chaque paquet a son propre verrou de dépendances et son propre cache. Deux
tâches s'exécutent en parallèle, et l'attribution d'un échec est immédiate à la
lecture du nom.

*Écarté* : une tâche unique enchaînant les deux — sérialise inutilement et rend
un échec plus long à situer. *Écarté* : une matrice — les deux paquets n'ont ni
les mêmes étapes ni les mêmes scripts, une matrice les forcerait à se
ressembler.

### Une troisième tâche pour la suite de bout en bout, avec son PostgreSQL

`mail-boot.e2e-spec.ts` épingle une garantie qu'aucun test unitaire ne couvre :
aucun défaut de configuration SMTP ne doit empêcher l'API de démarrer. La perdre
serait silencieux. Elle vaut donc son coût.

Ce coût est un service PostgreSQL dans la tâche. La spécification interdit aux
vérifications bloquantes de dépendre d'une ressource extérieure, *ou* leur
impose de la fournir elles-mêmes de façon reproductible : un service déclaré
dans le workflow, créé et détruit avec lui, relève du second cas. Il ne dépend
d'aucun secret ni d'aucune machine tierce.

**Aucune étape de migration.** Vérifié : la suite passe contre une base vide.
Ajouter `prisma migrate deploy` reviendrait à faire dépendre la vérification
d'un état de schéma dont elle n'a pas besoin.

*Écarté* : laisser la suite hors de la CI. Elle se serait dégradée sans que
personne ne le voie, ce qui est précisément ce qui est arrivé à `app.e2e-spec.ts`.

### Node 22

La seule version qui satisfasse à la fois le `engines` du frontend et la
production. Vérifier sur une version que le serveur n'exécute pas reviendrait à
vérifier autre chose que ce qui est déployé.

*Écarté* : une matrice 22 et 24 — double le temps et les factures pour couvrir
une version sur laquelle rien ne tourne.

### `npm ci`, jamais `npm install`

`npm ci` échoue si le verrou et le manifeste divergent, ce qui est exactement le
signal recherché. `npm install` réécrirait le verrou en silence.

### Des scripts de vérification distincts, et non un drapeau ajouté à l'appel

La vérification appelle des scripts nommés (`format:check`, `lint:check`) plutôt
que des commandes écrites dans le fichier de workflow. Deux raisons : la même
commande est reproductible en local par un développeur avant de pousser, et la
spécification exige que le script correcteur et le script vérificateur portent
des noms distincts — sans quoi un `--fix` réintroduit un jour par commodité
rendrait la vérification muette sans que rien ne le signale.

### Aucune reprise automatique sur échec

Une exécution instable a été observée (voir Risks). La tentation est de
relancer automatiquement la suite en cas d'échec. C'est refusé : une reprise
transforme un défaut intermittent réel en bruit invisible, et la valeur de la
vérification tient entièrement à ce qu'un rouge signifie quelque chose. Si
l'instabilité se manifeste, elle doit être vue, capturée, et diagnostiquée.

### Annulation des exécutions superflues

Une nouvelle poussée sur une proposition de fusion annule l'exécution en cours
pour cette même référence. Les exécutions sur la branche principale ne sont
jamais annulées.

## Risks / Trade-offs

**Instabilité observée et non diagnostiquée** → Sur huit exécutions de la suite
unitaire, une a échoué : 3 tests dans 2 suites, en 25 s contre 5 à 15 s
habituellement. Non reproduite depuis, y compris sous une charge saturant les
huit cœurs, et la sortie n'a pas été capturée. Les runners GitHub étant plus
lents que la machine de mesure, le phénomène s'y manifestera probablement
davantage. *Atténuation* : aucune reprise automatique, et une tâche dédiée à
capturer la sortie complète à la première récidive. Si l'instabilité s'avère
structurelle, le bon geste est de corriger les tests concernés, pas d'assouplir
la vérification.

**Le premier passage sera rouge sur le formatage** → 79 fichiers ne sont pas au
format. *Atténuation* : la mise au propre est une tâche du changement, exécutée
avant que le workflow ne devienne bloquant, et elle est mécanique.

**`oxlint` analyse `frontend/dist/`** → Ce répertoire est commité et le reste
dans ce périmètre. Sans exclusion, `oxlint` se noie dans les bundles construits
et son résultat est inutilisable. *Atténuation* : un `ignore` dans
`.oxlintrc.json`, aligné sur ce que `eslint.config.ts` fait déjà.

**Le rapport non bloquant sera ignoré** → C'est l'issue habituelle d'un rapport
que rien n'oblige à lire. Assumé : l'alternative était d'embarquer ~294
corrections à jugement dans ce changement. Le nettoyage doit devenir une entrée
`TODOS.md` à part, sans quoi le rapport ne servira effectivement à rien.

**Le workflow n'est pas obligatoire tant que personne ne l'impose** → Un
workflow vert n'empêche pas de fusionner une proposition rouge ; seule une règle
de protection de branche le fait, et elle se règle dans l'interface GitHub, pas
dans le dépôt. *Atténuation* : la tâche finale le mentionne explicitement comme
un geste manuel, à faire après le premier passage vert.

## Migration Plan

L'ordre compte : rendre le workflow bloquant avant d'avoir mis le formatage au
propre rendrait toute proposition de fusion rouge, y compris celle qui porte ce
changement.

1. Retirer `app.e2e-spec.ts`, mettre le formatage au propre, exclure `dist/`
   d'`oxlint`, ajouter les scripts de vérification. Le dépôt devient conforme
   *avant* qu'on ne vérifie quoi que ce soit.
2. Ajouter le workflow.
3. Ouvrir la proposition de fusion et constater le premier passage.
4. Une fois vert, activer la protection de branche dans l'interface GitHub.

**Retour arrière** : supprimer le fichier de workflow. Aucune étape ne modifie
de code applicatif ni d'état de production ; le formatage et la suppression du
gabarit se révoquent par un `git revert` ordinaire.

## Open Questions

- Faut-il exiger les vérifications sur les propositions venues d'un fork ? Le
  choix de n'employer aucun secret rend la chose possible, mais la politique
  elle-même se règle dans l'interface GitHub et peut être décidée plus tard sans
  toucher ni aux spécifications ni au workflow.
