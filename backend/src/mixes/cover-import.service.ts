import { Injectable, Logger } from '@nestjs/common';
import { fetchCover } from '../common/cover-source';
import { toWebp } from '../common/image';
import { ecrireLesVariantes, putBufferToR2 } from '../common/upload.utils';

/**
 * Imports the cover the user picked at the source. The fetch happens here, at
 * mix creation, rather than at import time: the mix does not exist until the
 * user submits the form.
 *
 * A failure returns null rather than throwing. A missing cover is an
 * annoyance; a refused create is lost work — and when the mix carries an
 * uploaded audio file, multer-s3 has already streamed it to R2 by the time
 * this runs, so throwing here would strand an object nothing deletes.
 */
@Injectable()
export class CoverImportService {
  private readonly logger = new Logger(CoverImportService.name);

  /** The R2 object key the cover was stored under, or null if it could not be fetched. */
  async importFromUrl(coverSourceUrl: string): Promise<string | null> {
    try {
      const cover = await fetchCover(coverSourceUrl);
      // Converties comme celles qui arrivent par le formulaire : ce qui est
      // stocké ne doit pas dépendre du chemin emprunté. Les pochettes des
      // sources sont souvent les plus lourdes — un JPEG de 3000 px destiné à
      // une page d'émission.
      const image = await toWebp(cover.buffer, 'covers');
      const key = await putBufferToR2(
        'covers',
        image.buffer,
        image.contentType,
        image.extension,
      );
      // Depuis le tampon d'origine, comme sur le chemin du formulaire : les
      // pochettes de sources distantes sont les plus grandes qui entrent ici,
      // c'est sur elles que les variantes valent le plus.
      await ecrireLesVariantes(key, cover.buffer);
      return key;
    } catch (err) {
      this.logger.warn(
        `Pochette non importée depuis ${coverSourceUrl}: ${String(err)}`,
      );
      return null;
    }
  }

  /**
   * La pochette à enregistrer : un fichier envoyé l'emporte toujours sur une
   * pochette distante.
   *
   * Extraite du contrôleur pour que le chemin automatique n'en tienne pas une
   * seconde copie — un mix importé à la main aurait sa pochette et un mix
   * automatique non, dès le premier changement ici.
   *
   * `undefined` et non `null` : c'est ce qu'attend `files.coverUrl` de
   * `MixesService.create`.
   */
  async resolveCoverUrl(
    uploadedKey: string | undefined,
    coverSourceUrl: string | undefined,
  ): Promise<string | undefined> {
    if (uploadedKey) return uploadedKey;
    if (!coverSourceUrl) return undefined;
    // Au mieux : une source dont la pochette échoue rend quand même un mix.
    return (await this.importFromUrl(coverSourceUrl)) ?? undefined;
  }
}
