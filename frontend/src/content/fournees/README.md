# Les fournées

Un fichier par fournée. Le nom est libre ; `2026-hiver.md` se relit bien.
Les fichiers périmés se gardent : ils font l'archive.

```markdown
---
layout: tall          # `tall` (5 mix, gabarit 3e) ou `large` (4 mix, gabarit 3a/b/c)
number: 18            # affiché « LA FOURNÉE N°18 »
title: Nuit de quinze heures    # trois mots au maximum
period: Tout l'hiver
color: "#2D5FA8"      # hexadécimal à six chiffres, entre guillemets
inverted: false       # `true` bascule sur fond noir, la couleur en accent (3c)
curator: pierrot
display: true         # `false` met la fournée en veille, sans toucher aux dates
from: 2026-12-01      # inclus, dès minuit, heure d'ici
to: 2027-02-28        # inclus, jusqu'au dernier instant du jour
mixes: [compte/titre, compte/titre, compte/titre, compte/titre, compte/titre]
---

Le texte d'intention. Trois phrases, pas quatre.
```

## Comment citer un mix

Par son adresse, moins l'entête : `/mixes/djnelly/tabouiedire` s'écrit
`djnelly/tabouiedire`. Il n'y a rien à relever, rien à interroger — le couple
se lit dans la barre du navigateur, sur la page du mix.

Le compte n'est pas décoratif : un titre d'URL n'est unique que par compte,
deux personnes ayant le droit de publier « mix 57 ». Une référence sans son
compte, ou un identifiant nu, fait échouer la CI en nommant la ligne fautive.

Ce n'était pas le cas avant : les fournées citaient l'UUID du mix. Un UUID est
une clé primaire, donc propre à la base qui l'a émise — un fichier écrit avec
ceux de production ne résolvait rien sur une base de développement, où les
mêmes mix portent d'autres identifiants. Le couple (compte, titre), lui, est le
même partout, et reste aussi stable : le titre d'URL est figé à la création et
n'est jamais recalculé, un titre corrigé ne déplace donc pas la fournée.

## Publication

Le bandeau apparaît et disparaît tout seul à ses dates, sans redéploiement.
Le publier une première fois demande en revanche un déploiement, puisque le
fichier est embarqué dans le bundle.

`display: false` le retire quoi qu'en disent les dates. Absent, il vaut `true`,
et une valeur qui n'est ni l'un ni l'autre fait échouer la CI plutôt que de
passer pour un `true` — c'est un interrupteur, il doit être obéi. Une fournée
en veille n'éteint pas le bandeau : elle rend la main à celle d'avant, si une
autre fenêtre couvre le jour.

Il sert à parquer une fournée prête d'avance, à en éteindre une qui a dérapé,
et à départager deux fenêtres qui se recouvrent sans mentir sur les dates de
l'une des deux. Le flux de syndication, lui, l'ignore comme il ignore déjà les
dates : `/api/fournees/<numéro>/rss` sert la fournée en veille, des abonnés
pouvant la détenir.

Ce dossier est dans `.prettierignore` : les fichiers sont saisis à la main et
le parseur n'accepte que les listes en ligne.

`exemple-tall.md` et `exemple-large.md` sont les deux gabarits en vraie
grandeur, avec des mix factices et une fenêtre passée exprès, pour qu'ils
restent inertes tout en étant parsables — voir le commentaire en tête de leur
corps.

Les flux les ignorent : tout fichier dont le nom commence par `exemple` est
écarté comme l'est ce README. Leur numéro ne mène donc à rien — le flux y
répond 404, plutôt que de servir un canal vide.

## Gabarits

| `layout` | Forme | Mix |
|---|---|---|
| `large` | propos à gauche sur du papier, mix à droite sur l'aplat de saison | 4 |
| `tall` | aplat pleine largeur, mix en bande basse | 5 |

Le nombre de mix n'est pas libre : un fichier qui ne respecte pas le compte de
son gabarit fait échouer la CI.

`inverted: true` remplace le papier par du noir. La couleur de saison, elle, ne
bouge jamais de sa moitié droite.
