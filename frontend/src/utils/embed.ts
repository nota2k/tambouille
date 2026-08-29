/**
 * Le code d'intégration, et rien d'autre.
 *
 * Séparé de `share.ts`, qui importe le routeur pour résoudre ses adresses et
 * ne peut donc pas être chargé hors d'un navigateur. Ce qui est ici est une
 * fonction pure sur une chaîne : c'est la partie qui se teste, et c'est celle
 * qui compte, puisque son résultat part vivre dans le HTML de quelqu'un
 * d'autre.
 */

/** La hauteur qu'il faut à chaque lecteur pour tenir sans barre de défilement. */
export const HAUTEUR_EMBED_MIX = 200
export const HAUTEUR_EMBED_PLAYLIST = 460

/**
 * Ce que l'on colle sur un site tiers.
 *
 * `allow="autoplay"` parce que le cadre délègue la permission de lecture au
 * lecteur qu'il contient — sans lui, le clic sur « lecture » à l'intérieur du
 * cadre ne produirait rien. `loading="lazy"` parce qu'un lecteur en bas d'un
 * article n'a pas à être chargé tant qu'on ne l'a pas atteint.
 */
export function embedCode(url: string, hauteur: number) {
  return (
    `<iframe src="${echapperAttribut(url)}" width="100%" height="${hauteur}" ` +
    `style="border:0;max-width:100%" loading="lazy" allow="autoplay" ` +
    `title="Lecteur Tambouille"></iframe>`
  )
}

/**
 * Les URL que construit `share.ts` ne contiennent ni guillemet ni chevron —
 * l'encodage de l'URL les a déjà écartés. On échappe quand même : ce code part
 * se coller dans le HTML d'un tiers, et un échappement qui ne sert jamais coûte
 * moins cher que celui qui manque une fois.
 */
function echapperAttribut(valeur: string) {
  return valeur
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
