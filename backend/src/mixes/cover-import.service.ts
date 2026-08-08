import { Injectable } from '@nestjs/common';
import { fetchMixcloudCover } from '../mixcloud/cover-source';
import { putBufferToR2 } from '../common/upload.utils';

/**
 * Imports a cover the user picked on Mixcloud. The fetch happens here, at mix
 * creation, rather than at import time: the mix does not exist until the user
 * submits the form with their audio file.
 */
@Injectable()
export class CoverImportService {
  /** Returns the R2 object key the cover was stored under. */
  async importFromUrl(coverSourceUrl: string): Promise<string> {
    const cover = await fetchMixcloudCover(coverSourceUrl);
    return putBufferToR2('covers', cover.buffer, cover.contentType, cover.extension);
  }
}
