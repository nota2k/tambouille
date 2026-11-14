/**
 * Combien d'éléments par page, sur les listes qui en comptent beaucoup.
 *
 * Une seule valeur pour la collection, les playlists et les profils : trois
 * pages qui pagineraient différemment donneraient trois rythmes de lecture sans
 * qu'aucune raison ne le justifie.
 *
 * Les listes courtes et bornées — les suggestions d'un mix, les sections de
 * l'accueil — n'en ont pas l'usage : elles demandent déjà exactement ce qu'elles
 * affichent.
 */
export const PAR_PAGE = 25
