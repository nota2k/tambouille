import { BadRequestException } from '@nestjs/common';

/** One entry in a collection the user still has to choose from. */
export interface SourceItem {
  ref: string;
  title: string;
  durationSec?: number;
  coverUrl?: string;
  publishedAt?: string;
}

/** Everything the upload form needs to prefill itself from one source entry. */
export interface MixImport {
  title: string;
  description: string;
  tags: string[];
  coverSourceUrl?: string;
  durationSec?: number;
  tracklist: { artist: string; title: string; timecodeSec: number }[];
  sourceType: 'mixcloud' | 'remote' | 'soundcloud';
  sourceRef: string;
  sourceLabel: string;
  sourcePageUrl?: string;
}

export interface SourceImporter {
  readonly name: string;
  matches(url: URL): boolean;
  /** One mix, or a list to choose from. */
  resolve(url: URL): Promise<MixImport | SourceItem[]>;
  importItem(ref: string): Promise<MixImport>;
}

/** `ref` is opaque to the client and round-trips verbatim. Prefixing it with
 *  the importer name is what lets `ImportsService` route `importItem` without
 *  re-parsing a URL it no longer has. */
export function encodeRef(importer: string, value: string): string {
  return `${importer}:${value}`;
}

export function decodeRef(ref: string): { importer: string; value: string } {
  const separator = ref.indexOf(':');
  if (separator < 1) {
    throw new BadRequestException('Référence de source invalide');
  }
  return { importer: ref.slice(0, separator), value: ref.slice(separator + 1) };
}
