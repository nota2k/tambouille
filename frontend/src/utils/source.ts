/**
 * Le nom sous lequel une source se présente, à partir de ce qui est stocké.
 *
 * `sourceType` dit quel moteur de lecture, pas quel site — Archive.org et un
 * podcast répondent tous deux `remote`. Le nom vient donc de l'hôte de
 * `sourceRef`, ce qui évite à la colonne de grandir d'une valeur par site.
 *
 * Sorti de `MixDetailView` pour être testable : l'entrée The Brain y était
 * inatteignable sans que rien ne le dise, et la page annonçait le domaine nu.
 */

/**
 * Les sites qui écrivent leur nom autrement que leur domaine.
 *
 * Les clés sont des hôtes SANS `www.` — c'est sous cette forme que
 * `nomDeLaSource` les cherche. En écrire une avec, c'est écrire une entrée que
 * la recherche ne verra jamais : c'est ce qui est arrivé à The Brain
 * Radioshow, dont l'importateur ramène pourtant tout épisode à `www.`.
 *
 * Un hôte absent de cette table s'affiche tel quel, ce qui se lit
 * acceptablement dans la plupart des cas.
 */
const NOMS_DE_SOURCE: Record<string, string> = {
  'archive.org': 'Archive.org',
  'ouiedire.net': 'Ouïedire',
  // LYL sert ses mp3 depuis un sous-domaine de fichiers, jamais depuis
  // lyl.live : sans cette entrée la source s'annoncerait « static.lyl.live ».
  'static.lyl.live': 'LYL Radio',
  'thebrainradio.com': 'The Brain Radioshow',
}

export function nomDeLaSource(
  sourceType: string | null | undefined,
  sourceRef: string | null | undefined,
): string | null {
  if (!sourceRef) return null
  if (sourceType === 'mixcloud') return 'Mixcloud'
  if (sourceType === 'soundcloud') return 'SoundCloud'

  try {
    const host = new URL(sourceRef).hostname.replace(/^www\./, '')
    return NOMS_DE_SOURCE[host] ?? host
  } catch {
    return null
  }
}
