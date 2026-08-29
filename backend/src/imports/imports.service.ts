import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  decodeRef,
  type MixImport,
  type SourceImporter,
  type SourceItem,
} from './source-importer';

export const SOURCE_IMPORTERS = Symbol('SOURCE_IMPORTERS');

@Injectable()
export class ImportsService {
  constructor(
    @Inject(SOURCE_IMPORTERS) private readonly importers: SourceImporter[],
  ) {}

  /**
   * Order matters: `podcast` claims any https URL, so it must come last. A URL
   * that reaches it and does not parse as a feed is reported as an unrecognised
   * link, not as a broken feed — the message that helps someone who pasted a
   * link to a site we do not support.
   */
  importerFor(url: URL): SourceImporter {
    if (url.protocol !== 'https:') {
      throw new BadRequestException('La source doit être en https');
    }
    const importer = this.importers.find((candidate) => candidate.matches(url));
    if (!importer) {
      throw new BadRequestException(
        'Lien non reconnu. Sources gérées : Mixcloud, SoundCloud, Archive.org, Ouïedire, LYL Radio, The Brain Radioshow, Musiques Incongrues, flux RSS.',
      );
    }
    return importer;
  }

  async resolve(
    rawUrl: string,
  ): Promise<
    { kind: 'mix'; mix: MixImport } | { kind: 'list'; items: SourceItem[] }
  > {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new BadRequestException("Cette adresse n'est pas une URL valide");
    }
    const resolved = await this.importerFor(url).resolve(url);
    return Array.isArray(resolved)
      ? { kind: 'list', items: resolved }
      : { kind: 'mix', mix: resolved };
  }

  async importItem(ref: string): Promise<MixImport> {
    const { importer: name, value } = decodeRef(ref);
    const importer = this.importers.find(
      (candidate) => candidate.name === name,
    );
    if (!importer)
      throw new BadRequestException('Référence de source invalide');
    return importer.importItem(value);
  }
}
