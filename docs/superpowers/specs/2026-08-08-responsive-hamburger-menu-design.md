# Menu mobile plein écran — NavBar.vue

## Problème

Sous ~400px de large, les entrées de la navbar (Découvrir, Uploader, bouton de
profil, Connexion / S'inscrire) ne tiennent plus à côté du logo et se
chevauchent.

## Approche retenue

Un **breakpoint CSS fixe à 400px**, exprimé avec le variant arbitraire de
Tailwind v4 `max-[400px]:` (`@media (width < 400px)`) :

- les entrées de bureau sont regroupées dans un `<div class="max-[400px]:hidden">`
- le bouton hamburger est `hidden max-[400px]:flex`

Les deux variants se partagent exactement le seuil : à 399px le hamburger est
seul, à 400px la navbar normale revient. Aucun JavaScript ne participe à la
bascule — c'est le moteur CSS qui décide, donc rien à réévaluer au resize.

> Une première version détectait le débordement au runtime avec un
> `IntersectionObserver` sur chaque entrée. Abandonnée : le seuil demandé est
> connu à l'avance, et un breakpoint CSS n'a ni coût au resize, ni état à
> resynchroniser quand `v-if` recrée les entrées observées.

## Overlay

`mobileMenuOpen` (ref booléenne) contrôle un panneau `fixed inset-0 z-[1100]`
qui couvre toute la page, sur le fond `bg-tambouille-accent` :

1. Logo Tambouille (lien vers `/`) et bouton ✕ sur une rangée de 64px
2. Liens empilés, cibles tactiles `px-4 py-3` :
   - Découvrir
   - Uploader, Mon profil, Réglages, Se déconnecter (si connecté)
   - Connexion, S'inscrire (sinon)

La barre de recherche n'y figure pas : elle est déjà masquée sous `sm` par les
classes existantes du formulaire.

### Téléportation

L'overlay est rendu via `<Teleport to="body">`. Le `<header>` est `sticky` avec
son propre contexte d'empilement : un enfant du header ne pourrait pas le
recouvrir, quel que soit son `z-index`.

## Fermeture

- clic sur un lien (`closeMobileMenu`)
- clic sur le ✕
- touche `Échap` (écouteur `keydown` sur `document`)
- tout changement de route (`watch` sur `router.currentRoute.fullPath`), ce qui
  couvre la redirection déclenchée par la déconnexion

## Scroll du fond

Un `watch` sur `mobileMenuOpen` pose `document.body.style.overflow = 'hidden'`
tant que l'overlay est ouvert, et le restaure à la fermeture comme au démontage
du composant.

## Fichiers modifiés

- `frontend/src/components/NavBar.vue` — seul fichier touché
