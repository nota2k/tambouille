/**
 * Retrouver la page d'origine d'un mix à partir de sa seule référence audio.
 *
 * Les importateurs connaissent cette page — ils viennent de la lire — et la
 * rendent dans `sourcePageUrl`. Les mix importés avant que la colonne existe,
 * eux, n'ont plus que `sourceRef` : la clé Mixcloud ou l'adresse du fichier.
 * Ce module dit ce qui s'en déduit sans réseau, pour le rattrapage.
 *
 * Il ne sert qu'à ça. Un import qui passe par un `SourceImporter` a la vraie
 * page et n'a rien à déduire — la déduction ne devient jamais le chemin normal,
 * sans quoi la connaissance de chaque site vivrait à deux endroits.
 *
 * `null` quand la référence ne porte pas de quoi remonter : le mp3 de LYL
 * Radio est un nom de fichier opaque, celui de The Brain Radioshow ne dit pas
 * son numéro d'épisode. Ces deux-là demandent d'interroger la source, ce que
 * `backfill-source-page-urls` fait à part.
 */

/** Le chemin d'un mp3 Ouïedire : `/assets/emission/<slug>/<fichier>.mp3`. */
const OUIEDIRE_HOSTS = ['ouiedire.net', 'www.ouiedire.net'];

export function pageSourceDepuisRef(
  sourceType: string | null | undefined,
  sourceRef: string | null | undefined,
): string | null {
  if (!sourceRef) return null;

  // La référence Mixcloud n'est pas une URL mais une clé de cloudcast : elle se
  // préfixe, elle ne s'analyse pas.
  if (sourceType === 'mixcloud') {
    return `https://www.mixcloud.com${sourceRef}`;
  }

  let url: URL;
  try {
    url = new URL(sourceRef);
  } catch {
    return null;
  }

  // SoundCloud stocke déjà l'adresse de la page — le lecteur en dérive le
  // widget, la page n'a rien à retrouver.
  if (sourceType === 'soundcloud') return sourceRef;

  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split('/').filter(Boolean);

  // `/download/<item>/<fichier>` mène à `/details/<item>`. Les segments sont
  // repris encodés tels quels : un identifiant Archive.org peut porter des
  // caractères que l'importateur avait pris soin d'échapper.
  if (host === 'archive.org' && segments[0] === 'download' && segments[1]) {
    return `https://archive.org/details/${segments[1]}`;
  }

  if (
    OUIEDIRE_HOSTS.includes(host) &&
    segments[0] === 'assets' &&
    segments[1] === 'emission' &&
    segments[2]
  ) {
    // Le site répond sur les deux hôtes ; celui sans `www.` est celui que les
    // pages elles-mêmes écrivent, et donc celui que l'importateur enregistre.
    return `https://ouiedire.net/emission/${segments[2]}`;
  }

  return null;
}
