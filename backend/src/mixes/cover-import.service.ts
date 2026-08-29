import { Injectable, Logger } from '@nestjs/common';
import { fetchCover } from '../common/cover-source';
import { toWebp } from '../common/image';
import { putBufferToR2 } from '../common/upload.utils';

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
      return await putBufferToR2(
        'covers',
        image.buffer,
        image.contentType,
        image.extension,
      );
    } catch (err) {
      this.logger.warn(
        `Pochette non importée depuis ${coverSourceUrl}: ${String(err)}`,
      );
      return null;
    }
  }
}
