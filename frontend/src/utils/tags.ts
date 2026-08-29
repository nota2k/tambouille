/**
 * La saisie des tags, telle qu'elle se raisonne : sur une chaîne à virgules.
 *
 * Hors du composant parce que c'est la partie qui peut se tromper en silence —
 * un fragment mal découpé propose les mauvais tags, un remplacement mal calé
 * mange le tag précédent — et parce que la vue qui la porte est derrière une
 * authentification, donc hors d'atteinte d'un essai rapide. Ici, ce sont
 * quatre fonctions pures que les tests exercent directement.
 */

/** Les tags posés, découpés comme le fait l'API : à la virgule, sans les vides. */
export function tagsPoses(valeur: string): string[] {
  return valeur
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

/**
 * Ce qui est en train d'être tapé : tout ce qui suit la dernière virgule.
 *
 * En minuscules, parce que la comparaison qui suit l'est aussi — les tags sont
 * rangés en minuscules côté serveur, mais rien n'oblige à les taper ainsi.
 */
export function fragmentEnCours(valeur: string): string {
  return valeur
    .slice(valeur.lastIndexOf(',') + 1)
    .trim()
    .toLowerCase()
}

/**
 * Les tags à proposer, les plus proches d'abord.
 *
 * `startsWith` avant `includes` : en tapant « house » on cherche d'abord
 * « house » et « house-music », pas « acid-house ». Les deux sont proposés,
 * mais dans cet ordre — un tri purement alphabétique aurait enterré la
 * correspondance exacte sous les autres.
 *
 * Ce qui est déjà posé est écarté : le reproposer inviterait à créer un doublon
 * que l'API dédoublonnerait sans le dire.
 */
export function proposerTags(connus: string[], valeur: string, max = 8): string[] {
  const q = fragmentEnCours(valeur)
  const poses = new Set(tagsPoses(valeur).map((tag) => tag.toLowerCase()))
  const libres = connus.filter((tag) => !poses.has(tag.toLowerCase()))
  if (!q) return libres.slice(0, max)

  const debut: string[] = []
  const dedans: string[] = []
  for (const tag of libres) {
    const bas = tag.toLowerCase()
    if (bas.startsWith(q)) debut.push(tag)
    else if (bas.includes(q)) dedans.push(tag)
  }
  return [...debut, ...dedans].slice(0, max)
}

/**
 * Remplace le fragment en cours par le tag choisi, et ouvre le suivant.
 *
 * La virgule finale n'est pas décorative : sans elle, le tag suivant se
 * collerait au précédent et les deux n'en feraient qu'un.
 */
export function remplacerLeFragment(valeur: string, tag: string): string {
  const derniere = valeur.lastIndexOf(',')
  const avant = derniere === -1 ? '' : `${valeur.slice(0, derniere + 1)} `
  return `${avant}${tag}, `
}
