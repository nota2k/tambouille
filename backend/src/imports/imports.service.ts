import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  decodeRef,
  MIX_PERDU_DANS_SA_SOURCE,
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
        'Lien non reconnu. Sources gérées : Mixcloud, SoundCloud, Archive.org, Ouïedire, LYL Radio, The Brain Radioshow, Musiques Incongrues, flux RSS, lien direct vers un fichier audio.',
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

  /**
   * Relit la source d'un mix déjà importé — « Récupérer depuis la source » de
   * l'écran d'édition. Une liste ne suffit pas : rien n'y dit lequel de ses
   * items est le mix, sauf pour les importeurs qui savent le retrouver par son
   * fichier (`refetch`).
   */
  async refetch(pageUrl: string, sourceRef: string): Promise<MixImport> {
    const url = new URL(pageUrl);
    const importer = this.importerFor(url);
    if (importer.refetch) return importer.refetch(url, sourceRef);
    const resolved = await importer.resolve(url);
    if (Array.isArray(resolved)) {
      throw new NotFoundException(MIX_PERDU_DANS_SA_SOURCE);
    }
    return resolved;
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
