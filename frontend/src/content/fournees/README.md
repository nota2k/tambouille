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
from: 2026-12-01      # inclus, dès minuit, heure d'ici
to: 2027-02-28        # inclus, jusqu'au dernier instant du jour
mixes: [id, id, id, id, id]
---

Le texte d'intention. Trois phrases, pas quatre.
```

Les identifiants de mix ne sont **plus lisibles dans l'URL** : celle-ci porte
désormais le titre, pas l'identifiant. Le plus court pour en relever un est
d'interroger l'API depuis l'adresse du mix — pour `/mixes/djnelly/tabouiedire` :

```
curl -s https://tambouille.pantagruweb.club/api/mixes/by-slug/djnelly/tabouiedire | grep -o '"id":"[^"]*"'
```

(Ce dossier reste indexé par identifiant, et non par titre : une fournée doit
continuer de désigner le bon mix même si son titre est corrigé.)

Le bandeau apparaît et disparaît tout seul à ses dates, sans redéploiement.
Le publier une première fois demande en revanche un déploiement, puisque le
fichier est embarqué dans le bundle.

Ce dossier est dans `.prettierignore` : les fichiers sont saisis à la main et
le parseur n'accepte que les listes en ligne.

`exemple.md` est un gabarit d'exemple avec des identifiants de mix factices
(des UUID quelconques) et une fenêtre passée exprès, pour qu'il reste inerte
tout en étant parsable — voir le commentaire en tête de son corps.

## Gabarits

| `layout` | Forme | Mix |
|---|---|---|
| `large` | propos à gauche sur du papier, mix à droite sur l'aplat de saison | 4 |
| `tall` | aplat pleine largeur, mix en bande basse | 5 |

Le nombre de mix n'est pas libre : un fichier qui ne respecte pas le compte de
son gabarit fait échouer la CI.

`inverted: true` remplace le papier par du noir. La couleur de saison, elle, ne
bouge jamais de sa moitié droite.
