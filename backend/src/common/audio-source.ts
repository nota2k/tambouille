/**
 * Où se trouve réellement l'audio d'un mix, et sous quel type MIME.
 *
 * Un seul endroit décide si l'audio est adressable par une URL de fichier.
 * Rendre `null` ne retire pas le mix d'un flux — cela retire l'`enclosure` de
 * son item : un flux décrit son périmètre, pas ce que nous savons servir.
 */

export interface AudioSource {
  url: string;
  mimeType: string;
}

/** Ce que porte un mix côté source audio. Volontairement plus étroit que `Mix`. */
export interface AudioSourceInput {
  audioUrl: string | null;
  sourceType: string | null;
  sourceRef: string | null;
}

export interface MediaBases {
  /** L'URL publique du bucket R2, sans barre oblique finale. */
  r2: string;
  /** L'origine de cette API, pour les fichiers d'avant la migration R2. */
  api: string;
}

const MIME_BY_EXTENSION: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/opus',
  wav: 'audio/wav',
  flac: 'audio/flac',
};

/**
 * Le type est deviné depuis l'extension de la source réelle, pas depuis l'URL
 * d'enclosure : celle-ci est la route de résolution, qui n'a pas d'extension.
 *
 * `audio/mpeg` par défaut — un type inexact gêne moins un client de podcast
 * qu'une enclosure absente, et le serveur d'origine renverra de toute façon le
 * sien au téléchargement.
 */
function mimeTypeOf(path: string): string {
  const withoutQuery = path.split(/[?#]/)[0];
  const extension = withoutQuery.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXTENSION[extension] ?? 'audio/mpeg';
}

/**
 * Une valeur de `Mix.audioUrl` ou `Mix.coverUrl` en URL absolue.
 *
 * Même partage que `r2KeysOnly` et que `mediaUrl()` côté frontend : un chemin
 * absolu est un fichier d'avant la migration, servi par ce serveur ; tout le
 * reste est une clé d'objet R2. Les trois doivent lire la colonne pareil.
 */
export function publicMediaUrl(path: string, bases: MediaBases): string {
  return path.startsWith('/') ? `${bases.api}${path}` : `${bases.r2}/${path}`;
}

export function audioSourceFor(
  mix: AudioSourceInput,
  bases: MediaBases,
): AudioSource | null {
  if (mix.audioUrl) {
    return {
      url: publicMediaUrl(mix.audioUrl, bases),
      mimeType: mimeTypeOf(mix.audioUrl),
    };
  }

  if (mix.sourceType === 'remote' && mix.sourceRef) {
    return { url: mix.sourceRef, mimeType: mimeTypeOf(mix.sourceRef) };
  }

  // Mixcloud n'expose qu'un lecteur embarqué : aucune URL de fichier
  // n'existe, et l'extraire de leur page casserait sans préavis.
  return null;
}
