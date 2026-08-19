import { Injectable } from '@nestjs/common';
import { MixcloudService } from '../mixcloud/mixcloud.service';
import {
  encodeRef,
  type MixImport,
  type SourceImporter,
  type SourceItem,
} from './source-importer';

/**
 * The relay is unchanged; this only gives it the shape the registry expects.
 * A bare username (no URL) is handled by the controller, which synthesises
 * `https://www.mixcloud.com/<username>/` before dispatching.
 */
@Injectable()
export class MixcloudImporter implements SourceImporter {
  readonly name = 'mixcloud';

  constructor(private readonly mixcloud: MixcloudService) {}

  matches(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return host === 'mixcloud.com' || host.endsWith('.mixcloud.com');
  }

  async resolve(url: URL): Promise<MixImport | SourceItem[]> {
    // "/user/" is an account; "/user/slug/" is one cloudcast. The segments are
    // taken raw: Mixcloud keys are percent-encoded, and `URL` leaves
    // `pathname` encoded, which is exactly the form `KEY_PATTERN` expects.
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length >= 2) {
      return this.importItem(`/${segments[0]}/${segments[1]}/`);
    }

    const summaries = await this.mixcloud.listCloudcasts(segments[0] ?? '');
    return summaries.map((summary) => ({
      ref: encodeRef(this.name, summary.key),
      title: summary.name,
      durationSec: summary.audioLengthSec,
      coverUrl: summary.pictureUrl,
      publishedAt: summary.createdAt,
    }));
  }

  async importItem(key: string): Promise<MixImport> {
    const imported = await this.mixcloud.getCloudcast(key);
    return {
      title: imported.title,
      description: imported.description,
      // L'artiste a désormais son champ : le laisser aussi dans les tags ferait
      // deux sources pour la même information, et la question de laquelle gagne
      // quand elles divergent. `withArtistTag` reste exporté — les mix déjà
      // importés portent ce tag, et rien ne le leur retire.
      tags: imported.tags,
      artist: imported.artist?.name,
      coverSourceUrl: imported.coverSourceUrl,
      tracklist: imported.tracklist,
      sourceType: 'mixcloud',
      sourceRef: key,
      sourceLabel: 'Mixcloud',
      sourcePageUrl: `https://www.mixcloud.com${key}`,
    };
  }
}
