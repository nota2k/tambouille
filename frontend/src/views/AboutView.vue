<script setup lang="ts">
import { useSeo } from '@/composables/useSeo'
import { shareUrl } from '@/utils/share'

/**
 * La page qui dit ce qu'est le site et comment il marche.
 *
 * Elle décrit ce qui existe VRAIMENT, et rien d'autre : chaque paragraphe
 * renvoie à une fonctionnalité qu'on peut aller essayer. Une page d'accueil
 * promet, celle-ci explique — la tenir à jour est donc une obligation, pas une
 * option. Ajouter une fonctionnalité sans l'écrire ici la rend introuvable ;
 * l'écrire sans qu'elle existe fait mentir le site.
 *
 * La colonne est étroite à dessein : c'est du texte suivi, pas une grille.
 */
useSeo({
  title: 'Comment ça marche',
  description:
    'Tambouille est un site d’écoute et de partage de mix. Déposer un mix, ' +
    'importer depuis Mixcloud ou un flux podcast, suivre des comptes, ' +
    's’abonner en RSS : ce que le site fait, et comment.',
  canonical: shareUrl({ name: 'about' }),
})
</script>

<template>
  <div class="mx-auto max-w-[46rem] px-4 py-12">
    <p class="tb-eyebrow">Comment ça marche</p>
    <h1 class="text-tambouille-title-big leading-none">Tambouille</h1>

    <p class="mt-8 text-[19px] leading-relaxed">
      Un endroit pour déposer des mix, les écouter, et retrouver ceux des autres. Pas de
      recommandation automatique, pas de fil sans fin : ce qui remonte ici a été déposé ou choisi
      par quelqu'un.
    </p>

    <!-- ── Écouter ──────────────────────────────────────────────────────── -->
    <h2 class="mt-12 font-display text-2xl font-bold">Écouter</h2>
    <p class="mt-3 leading-relaxed">
      La lecture ne s'arrête pas quand tu changes de page : le lecteur reste en bas de l'écran et
      continue pendant que tu navigues. La forme d'onde permet de se déplacer dans le mix d'un clic.
    </p>
    <p class="mt-3 leading-relaxed">
      Quand un mix a une tracklist, chaque morceau porte son minutage : cliquer dessus saute
      directement au passage. Les commentaires fonctionnent pareil — on peut en accrocher un à un
      instant précis plutôt qu'au mix entier.
    </p>

    <!-- ── Déposer ──────────────────────────────────────────────────────── -->
    <h2 class="mt-12 font-display text-2xl font-bold">Déposer un mix</h2>
    <p class="mt-3 leading-relaxed">
      Deux façons. Envoyer un fichier audio depuis ton disque, avec une pochette, un titre, une
      description et des tags. Ou coller un lien : le site va lire la page, en rapporte le titre, la
      description, la pochette, les tags et la tracklist quand la source les donne, et remplit le
      formulaire pour toi. Tout reste modifiable avant publication.
    </p>
    <p class="mt-3 leading-relaxed">Les sources reconnues :</p>
    <ul class="mt-2 list-disc space-y-1 pl-5 leading-relaxed">
      <li>Mixcloud et SoundCloud</li>
      <li>Archive.org</li>
      <li>Ouïedire, LYL Radio, The Brain</li>
      <li>n'importe quel flux RSS de podcast</li>
    </ul>
    <p class="mt-3 leading-relaxed">
      Sur un import, tu choisis où vit l'audio : copié chez nous, ou laissé chez la source, qui
      continue alors de le servir. Dans les deux cas le mix a sa page ici.
    </p>
    <p class="mt-3 leading-relaxed">
      Si la source a déjà été importée, le site te le dit et refuse la publication, avec un lien
      vers le mix existant. C'est ce qui évite les doublons.
    </p>

    <!-- ── Fournées ─────────────────────────────────────────────────────── -->
    <h2 class="mt-12 font-display text-2xl font-bold">Les fournées</h2>
    <p class="mt-3 leading-relaxed">
      Une fournée est une sélection de quelques mix, numérotée, présentée par la personne qui l'a
      composée. Elle occupe le haut de l'accueil pendant sa saison, puis laisse la place à la
      suivante. C'est la seule chose du site qui soit choisie à la main plutôt que classée par une
      date ou un compteur.
    </p>

    <!-- ── Retrouver ────────────────────────────────────────────────────── -->
    <h2 class="mt-12 font-display text-2xl font-bold">Retrouver</h2>
    <p class="mt-3 leading-relaxed">
      La recherche cherche dans les titres, les descriptions et les artistes, ainsi que parmi les
      comptes — au clavier, <kbd class="tb-tag">⌘K</kbd> y pose le curseur. Les tags filtrent la
      liste, et se cumulent.
    </p>
    <p class="mt-3 leading-relaxed">
      Un cœur met un mix de côté, une playlist en regroupe plusieurs dans l'ordre que tu veux, et
      s'abonner à un compte rassemble ses dépôts. Le mix à la une de l'accueil est le plus écouté du
      dernier mois.
    </p>

    <!-- ── Emporter ─────────────────────────────────────────────────────── -->
    <h2 class="mt-12 font-display text-2xl font-bold">Emporter ailleurs</h2>
    <p class="mt-3 leading-relaxed">
      Le bouton de partage d'un mix ou d'une playlist donne deux choses : son lien, et un lecteur à
      coller sur un autre site — avec son aperçu, pour voir ce que ça donnera avant de copier le
      code.
    </p>
    <p class="mt-3 leading-relaxed">
      Tout est aussi disponible en flux RSS, lisible par n'importe quelle application de podcast :
      le site entier, un compte, une playlist, une fournée. L'icône de flux apparaît à côté du titre
      de la page concernée.
    </p>

    <!-- ── Comptes ──────────────────────────────────────────────────────── -->
    <h2 class="mt-12 font-display text-2xl font-bold">Le compte</h2>
    <p class="mt-3 leading-relaxed">
      Écouter ne demande rien. Un compte sert à déposer, commenter, mettre en favori, faire des
      playlists et s'abonner. On peut le créer avec une adresse et un mot de passe, avec Google, ou
      avec la carte de membre du club.
    </p>

    <div class="mt-12 flex flex-wrap gap-4 border-t-2 border-tambouille-rule pt-8">
      <RouterLink :to="{ name: 'discover' }" class="tb-btn">Découvrir des mix</RouterLink>
      <RouterLink :to="{ name: 'upload' }" class="tb-btn-outline">Déposer un mix</RouterLink>
    </div>
  </div>
</template>
