import { BadRequestException } from '@nestjs/common';

/** One entry in a collection the user still has to choose from. */
export interface SourceItem {
  ref: string;
  title: string;
  durationSec?: number;
  coverUrl?: string;
  publishedAt?: string;
  /** La page où la source publie cet item. Facultatif : la veille écarte les
   *  items sans adresse plutôt que d'afficher un lien mort. */
  pageUrl?: string;
  /** Le nom du compte ou de la collection auquel appartient la liste, quand la
   *  source le donne dans la même réponse. La veille l'utilise comme nom
   *  proposé à l'ajout plutôt que le nom de domaine, qui ne dit rien une fois
   *  que le profil n'affiche plus qu'un item avec sa source en sous-titre. */
  collectionLabel?: string;
}

/** Everything the upload form needs to prefill itself from one source entry. */
export interface MixImport {
  title: string;
  description: string;
  tags: string[];
  /** Le nom de l'artiste, quand la source le donne. */
  artist?: string;
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

/**
 * Place le nom de l'artiste **en tête** des tags, jamais à la suite.
 *
 * `MixesService.parseTags` tronque à 10 tags à la création : ajouté en dernier, le nom
 * de l'artiste serait le premier perdu sur un mix qui porte déjà 10 tags — précisément
 * les mix les mieux renseignés.
 *
 * La déduplication ignore la casse parce que l'enregistrement l'ignore aussi : les tags
 * sont passés en minuscules, donc « Nota » et « nota » sont un seul tag une fois en base.
 * Sans ça, le formulaire afficherait un doublon qui disparaîtrait à l'envoi, sans que
 * rien n'explique lequel des deux a été retenu.
 */
export function withArtistTag(tags: string[], artistName?: string): string[] {
  if (!artistName) return tags;
  const rest = tags.filter(
    (tag) => tag.toLowerCase() !== artistName.toLowerCase(),
  );
  return [artistName, ...rest];
}
