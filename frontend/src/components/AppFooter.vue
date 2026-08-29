<template>
  <!-- Pas de `mt-16` ici : la respiration au-dessus du pied de page est portée par `<main>`, pour que l'encart « Écoutez ailleurs », qui s'insère entre les deux, reste collé au pied de page. -->
  <footer class="border-t border-tambouille-rule">
    <div class="mx-auto flex gap-4 max-w-7xl items-center justify-center px-4 py-6">
      <p class="text-center text-lg text-tambouille-muted">
        <span aria-hidden="true">©</span>
        <span class="font-wordmark">Constructions Incongrues</span>
        <span class="mx-1.5 text-tambouille-faint" aria-hidden="true">//</span>
        <span>2026</span>
      </p>
      <!-- Avant Contact : on cherche d'abord à comprendre le site, on écrit
           ensuite. C'est le seul endroit d'où la page est atteignable — la barre
           de navigation est réservée à ce qu'on fait tous les jours. -->
      <RouterLink :to="{ name: 'about' }" class="text-lg text-tambouille-muted hover:underline">
        Comment ça marche
      </RouterLink>
      <a
        class="text-lg text-tambouille-muted hover:underline"
        href="mailto:noreply@tambouille.pantagruweb.club"
        >Contact</a
      >
    </div>
  </footer>
</template>
