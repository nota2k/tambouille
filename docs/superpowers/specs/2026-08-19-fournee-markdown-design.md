# La fournée pilotée par un fichier markdown

## Problème

`FourneeBanner.vue` existe et fonctionne, mais l'objet qu'il affiche est écrit
en dur dans `DiscoverView.vue` : numéro, titre, période, couleur, curateur et
texte sont des littéraux, et les cinq mix sont les plus écoutés du moment, ce
qui n'est pas une sélection éditoriale.

Il faut pouvoir composer une fournée — l'activer, choisir son titre, son thème
de couleur, son texte et sa durée de publication — sans écrire de code et sans
administrer quoi que ce soit.

## Approche retenue

Un fichier markdown par fournée dans `frontend/src/content/fournees/`, embarqué
au build par `import.meta.glob`. Pas de modèle en base, pas d'endpoint, pas
d'écran d'administration : **la fonctionnalité est entièrement côté frontend**,
`GET /mixes/:id` existant suffit à résoudre les mix référencés.

Le choix se joue contre deux alternatives :

> **Un modèle `Fournee` en base avec un écran d'édition.** Écarté pour
> l'instant : c'est le coût d'un module NestJS complet et d'une notion de rôle
> admin — que le schéma n'a pas — pour un contenu qu'on publie deux à quatre
> fois par an. Reste la bonne réponse le jour où quelqu'un d'autre que le
> mainteneur devra composer une fournée, ou où il faudra publier depuis un
> téléphone.

> **Le fichier dans `public/`, récupéré en `fetch` au chargement.** Il serait
> éditable directement sur le serveur o2switch, donc publiable sans build. Prix
> refusé : une requête HTTP de plus sur chaque home, aucune vérification avant
> la mise en ligne, et un fichier édité sur le serveur diverge silencieusement
> du dépôt.

Publier demande donc un déploiement — mais **programmer n'en demande pas**. Un
fichier écrit en novembre avec `from: 2026-12-01` apparaît et disparaît seul, et
c'est la fenêtre de publication qui est le vrai besoin d'une fournée
saisonnière.

## Le fichier

`frontend/src/content/fournees/2026-hiver.md` — un par fournée, conservés après
expiration : ils constituent l'archive.

```markdown
---
layout: tall
number: 18
title: Nuit de quinze heures
period: Tout l'hiver
color: "#2D5FA8"
inverted: false
curator: pierrot
from: 2026-12-01
to: 2027-02-28
mixes: [3f2a…, 8c71…, b904…, 1de6…, 77aa…]
---

Il fait noir à 16 h et ça nous va. Cinq mix pour la saison creuse : drone lent,
deux heures de dub sous la pluie, et un set enregistré dans une cave à 3 h du
matin sans public.
```

Le corps du fichier est le texte d'intention (`intro`), le frontmatter porte
tout le reste. `inverted` est facultatif et vaut `false` : il bascule le bandeau
sur fond noir, la couleur ne servant plus que d'accent — la variante 3c du
gabarit.

Les mix sont référencés par leur identifiant, celui qui apparaît dans l'URL
`/mixes/<id>`. Laid à recopier, mais sans ambiguïté : le modèle `Mix` n'a pas de
slug qui ferait mieux, et un titre ne serait pas unique.

Le parseur est écrit à la main, une quarantaine de lignes. Le schéma est plat —
des scalaires et une liste — et n'appelle pas une dépendance YAML.

## Gabarits

`layout` choisit la mise en page, parmi trois valeurs que la maquette fournit
déjà. Il vaut `tall` par défaut — le gabarit actuellement construit.

| Valeur | Maquette | Forme | Mix |
|---|---|---|---|
| `large` | 3a / 3b / 3c | 1440 × 420, propos à gauche, mix en colonnes à droite | 4 |
| `tall` | 3e | 1440 × 660, aplat pleine largeur, mix en bande basse | 5 |
| `carousel` | 3f | comme `tall`, bande en carrousel et perspective | 5 |

`tall` et `carousel` partagent l'intégralité du propos — badge, période, titre à
128, texte, action, crédit — et ne diffèrent que par la présentation de la
bande. `large` diffère des deux : titre à 88, propos en une seule colonne,
action collée en bas par `margin-top: auto`.

**`carousel` est spécifié ici mais livré dans un second temps.** Il coûte plus
que les deux autres réunis — trois paliers de largeur et d'opacité, un
chevauchement de 24 px portant sur les seules pochettes, une mise en avant
pilotée par des flèches et jamais par le survol, et une réponse à trouver pour
le mobile où la perspective n'a plus de sens. Il n'apporte pourtant pas une mise
en page nouvelle. `layout` accepte la valeur dès maintenant et la validation la
refuse tant que le composant n'existe pas, pour qu'aucun remaniement ne soit
nécessaire le jour où il arrive.

### Découpage

`FourneeBanner.vue` cesse d'être un bloc unique et devient l'aiguillage. La
logique de couleur — luminance, choix d'encre, inversion 3c, teinte duotone —
sort dans un composable partagé plutôt que d'être recopiée trois fois : elle est
déjà écrite et vérifiée, elle ne doit pas diverger d'un gabarit à l'autre.

| Fichier | Rôle |
|---|---|
| `FourneeBanner.vue` | aiguillage sur `layout` |
| `useFourneeTheme.ts` | surface, encre, accent, teinte duotone |
| `FourneeLarge.vue` | gabarit 3a/3b/3c |
| `FourneeTall.vue` | gabarit 3e |
| `FourneeMixCard.vue` | la carte de mix, commune aux deux |

## La fenêtre de publication

Trois règles, dont deux sont des pièges :

- `from` et `to` sont parsées en **date locale** (`new Date(y, m - 1, d)`), et
  non par `new Date('2026-12-01')` qui produit minuit UTC et décale d'un jour
  selon le fuseau. Une fournée annoncée le 1er décembre doit apparaître à
  minuit, heure d'ici.
- `to` est **inclusive** : la fournée tient jusqu'à la fin de ce jour-là.
- Si plusieurs fenêtres se recouvrent, celle dont le `from` est le plus récent
  l'emporte. Un recouvrement est une erreur de saisie, mais elle arrivera, et
  une règle déterministe vaut mieux que l'ordre dans lequel `import.meta.glob`
  a rendu les fichiers.

Aucune fournée en cours : `useFournee()` rend `null` et la home n'affiche pas de
bandeau, exactement comme aujourd'hui quand il y a moins de trois mix.

## Résolution des mix

`GET /mixes/:id` en parallèle, via `Promise.allSettled`, puis remise **dans
l'ordre du fichier** et non dans celui des réponses.

Un mix supprimé depuis l'écriture du fichier renvoie 404 : il est retiré de la
liste sans bruit — une fournée amputée d'un titre reste lisible, une home en
erreur ne l'est pas. En dessous de trois mix survivants le bandeau s'efface : la
bande du gabarit n'a plus de tenue, et c'est déjà le seuil retenu dans
`DiscoverView.vue`.

Ce seuil de trois ne contredit pas les comptes exacts exigés par la validation :
celle-ci porte sur **ce que le fichier déclare**, au build, et il doit être
juste ; le seuil porte sur **ce qui survit**, au chargement, quand un mix a été
supprimé entre-temps. Un `large` qui perd un de ses quatre mix s'affiche à
trois, un peu plus creux, plutôt que de disparaître.

## Validation

Un fichier mal écrit — couleur invalide, date mal tapée, `number` manquant —
doit échouer avant la mise en ligne, pas devant le visiteur.

Le frontend n'a aujourd'hui aucune infrastructure de test : `frontend/package.json`
n'expose pas de script `test`. **Vitest est ajouté**, avec un script `test`, et
la CI le lance.

Quatre familles de tests :

1. **Chaque fichier réel du dossier est parsé.** C'est ce test qui transforme
   une faute de frappe en échec de CI. Il ne connaît pas les fichiers à
   l'avance : il itère sur le glob.
2. **Le parseur** : frontmatter valide, clé obligatoire absente, couleur qui
   n'est pas un hexadécimal, date illisible, liste de mix vide, `layout`
   inconnu — ou `carousel`, tant que son composant n'existe pas.
3. **Le nombre de mix accordé au gabarit** : `large` en veut exactement quatre,
   `tall` cinq. Le gabarit 3d l'impose, et une fournée `large` à cinq mix
   déforme la grille sans rien signaler. La CI échoue plutôt que la mise en
   page.
4. **La fenêtre** : avant, pendant, après ; bornes incluses des deux côtés ;
   recouvrement ; dossier vide. Les bornes sont testées en date locale — c'est
   la partie dont un bug ne se voit pas à l'œil.

Au runtime, le parseur reste défensif : un fichier fautif qui aurait franchi la
CI est ignoré avec un `console.error` nommant son chemin, plutôt que de faire
échouer le chargement de toute la home.

## Fichiers

| Fichier | Nature |
|---|---|
| `frontend/src/content/fournees/*.md` | nouveau — le contenu |
| `frontend/src/content/fournees.ts` | nouveau — parseur et sélection de la fenêtre |
| `frontend/src/composables/useFournee.ts` | nouveau — glob, parsing, résolution des mix |
| `frontend/src/content/fournees.spec.ts` | nouveau — les trois familles de tests |
| `frontend/src/components/Fournee*.vue`, `useFourneeTheme.ts` | nouveaux — aiguillage, thème partagé, deux gabarits, carte de mix |
| `frontend/src/views/DiscoverView.vue` | modifié — la constante en dur cède la place à `useFournee()` |
| `frontend/package.json`, `vitest.config.ts` | modifiés / nouveau — Vitest |
| `.github/workflows/ci.yml` | modifié — `npm test` dans le job `frontend`, à côté de `format:check` et `build` |

Le type `Fournee` ne gagne que le champ `layout`. `FourneeBanner.vue` est
redécoupé, mais son contenu actuel n'est pas jeté : il devient `FourneeTall.vue`
et `FourneeMixCard.vue`, et sa logique de couleur `useFourneeTheme.ts`. C'est
précisément parce qu'il a été écrit présentationnel que ce redécoupage ne touche
ni la source des données ni la home.

## Hors périmètre

- **L'annonce texte simple** (un bandeau « soirée le 12 » avec une date de fin).
  Elle partagerait la fenêtre de publication, mais construire l'abstraction
  « bandeau générique » pour un second type qui n'existe pas encore coûte plus
  cher que de l'ajouter le jour venu.
- **Le rôle `isAdmin`** et la modération des membres et des mix. La fournée en
  markdown était le seul besoin qui menait vers un backoffice ; sans elle, la
  question reste ouverte et sans urgence.
- **Le gabarit `carousel`** (3f), spécifié plus haut et livré séparément, une
  fois `large` et `tall` vus en production avec de vraies pochettes.
- **La file d'attente du lecteur.** « Tout enfourner » ne lance que le premier
  mix, faute de file dans `usePlayerStore` — limite existante, indépendante de
  ce changement.
