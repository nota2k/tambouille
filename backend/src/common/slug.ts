/**
 * Le titre d'un mix, rendu passable dans une URL.
 *
 * Les titres de ce site ne sont pas des titres de blog : ils portent des
 * séparateurs décoratifs (`/ϟ/`), des tirets cadratins, des dièses, et il
 * arrive qu'un nom de fichier soit passé tel quel — extension comprise. La
 * fonction est donc écrite pour ce qui existe, pas pour un cas idéal.
 *
 * Elle ne garantit pas l'unicité : deux mix d'un même compte peuvent porter le
 * même titre, et c'est déjà le cas en base. C'est à l'appelant d'ajouter un
 * suffixe, avec `slugUnique`.
 */

/** Au-delà, l'URL cesse d'être lisible, ce qui est tout ce qu'on lui demande. */
const LONGUEUR_MAXIMALE = 70;

/**
 * Le repli quand il ne reste rien.
 *
 * Un titre entièrement composé de symboles — c'est arrivé — se réduirait à une
 * chaîne vide, et une adresse `/mixes/<compte>/` désignerait alors le compte.
 */
const REPLI = 'mix';

export function slugifierTitre(titre: string): string {
  const sansAccents = titre
    // Décompose « é » en « e » + accent, puis retire les accents restés seuls.
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

  const brut = sansAccents
    .toLowerCase()
    // Tout ce qui n'est ni lettre latine ni chiffre devient une coupure : c'est
    // plus sûr que d'énumérer la ponctuation, qui est ici sans limite.
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!brut) return REPLI;

  return couperProprement(brut);
}

/**
 * Coupe à la longueur maximale sans laisser un mot tronqué, quand c'est
 * possible : `souvenir-des-sequ` se lit moins bien que `souvenir-des`.
 */
function couperProprement(valeur: string): string {
  if (valeur.length <= LONGUEUR_MAXIMALE) return valeur;

  const coupe = valeur.slice(0, LONGUEUR_MAXIMALE);
  const dernierTiret = coupe.lastIndexOf('-');

  // Un seul mot plus long que la limite : on tranche dedans, faute de mieux.
  if (dernierTiret <= 0) return coupe;
  return coupe.slice(0, dernierTiret);
}

/**
 * Le premier slug libre, en suffixant au besoin : `mix-57`, `mix-57-2`, etc.
 *
 * `estPris` est passé plutôt qu'une liste, parce que l'appelant interroge la
 * base et qu'on ne veut pas charger tous les slugs d'un compte pour en choisir
 * un. La numérotation commence à 2 : `-1` laisserait croire qu'il existe un
 * autre mix, alors que le premier ne porte aucun suffixe.
 */
export async function slugUnique(
  titre: string,
  estPris: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = slugifierTitre(titre);
  if (!(await estPris(base))) return base;

  // La borne n'est pas une limite de produit : c'est un garde-fou contre une
  // boucle infinie si `estPris` répond toujours vrai. Cent mix d'un même compte
  // sous le même titre n'existeront pas, et si cela arrivait, l'erreur est plus
  // utile qu'une requête qui ne rend jamais la main.
  for (let n = 2; n <= 100; n++) {
    const candidat = `${base}-${n}`;
    if (!(await estPris(candidat))) return candidat;
  }

  throw new Error(`Impossible de trouver un slug libre pour « ${titre} »`);
}
