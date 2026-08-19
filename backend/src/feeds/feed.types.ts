/**
 * Le contrat entre les résolveurs de périmètre et le constructeur XML.
 *
 * Il ne dit rien de ce qu'est un mix, une playlist ou une fournée : un
 * résolveur traduit son périmètre en `FeedChannel`, et le constructeur ne
 * connaît que ce type. Ajouter un cinquième périmètre ne touche donc pas au
 * XML.
 */

/** L'audio d'un item, quand il est adressable par une URL de fichier. */
export interface FeedEnclosure {
  /** L'URL de résolution du backend, jamais celle de l'hébergement. */
  url: string;
  /** Type MIME deviné depuis l'extension de la source réelle. */
  type: string;
}

export interface FeedItem {
  /** Stable pour toute la vie du mix : un client ne doit pas le revoir passer pour neuf. */
  guid: string;
  title: string;
  /** La page publique du mix sur le site. */
  link: string;
  /** Texte brut, sans balisage. */
  description: string;
  publishedAt: Date;
  /**
   * Absente pour un mix dont l'audio n'est pas adressable — un mix Mixcloud,
   * qui n'expose qu'un lecteur embarqué. L'item reste dans le flux : c'est son
   * `link` qui mène à l'écoute.
   */
  enclosure?: FeedEnclosure;
  durationSec?: number;
  imageUrl?: string;
}

export interface FeedChannel {
  title: string;
  description: string;
  /** La page publique du périmètre sur le site. */
  link: string;
  /** L'URL du flux lui-même, publiée en `atom:link rel="self"`. */
  selfUrl: string;
  imageUrl?: string;
  items: FeedItem[];
}
