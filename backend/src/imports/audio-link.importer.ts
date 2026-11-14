import { BadRequestException, Injectable } from '@nestjs/common';
import type { MixImport, SourceImporter } from './source-importer';

/** Les extensions que `audioSourceFor` sait déjà typer pour la lecture. */
const AUDIO_PATH = /\.(mp3|m4a|mp4|aac|ogg|oga|opus|wav|flac)$/i;

/**
 * « WANT_01_-_We_Are_Not_Toys.mp3 » → « WANT 01 - We Are Not Toys ».
 *
 * Un nom mal encodé est gardé tel quel plutôt que refusé : c'est un titre
 * proposé, que le formulaire laisse corriger.
 */
export function titleFromAudioPath(pathname: string): string {
  const file = pathname.split('/').pop() ?? '';
  let name = file.replace(AUDIO_PATH, '');
  try {
    name = decodeURIComponent(name);
  } catch {
    // Séquence % invalide : on garde le nom brut.
  }
  return name.replace(/_/g, ' ').replace(/\s+/g, ' ').trim() || 'Sans titre';
}

/**
 * Un lien direct vers un fichier audio, sur n'importe quel hôte.
 *
 * Sans lui, un tel lien tombait dans `PodcastImporter`, qui le téléchargeait
 * comme un flux RSS et butait sur sa limite de 10 Mo — d'où un « dépasse la
 * taille autorisée » qui ne disait rien du vrai problème. Rien n'est téléchargé
 * ici : le fichier est lu chez sa source, comme l'audio d'un épisode de flux.
 *
 * Reconnu à l'extension du chemin, seulement : une page `?file=set.mp3` reste
 * une page.
 */
@Injectable()
export class AudioLinkImporter implements SourceImporter {
  readonly name = 'audio-link';

  matches(url: URL): boolean {
    return url.protocol === 'https:' && AUDIO_PATH.test(url.pathname);
  }

  resolve(url: URL): Promise<MixImport> {
    return Promise.resolve({
      title: titleFromAudioPath(url.pathname),
      description: '',
      tags: [],
      tracklist: [],
      sourceType: 'remote',
      sourceRef: url.toString(),
      sourceLabel: url.hostname,
    });
  }

  importItem(): Promise<MixImport> {
    return Promise.reject(
      new BadRequestException('Référence de source invalide'),
    );
  }
}
