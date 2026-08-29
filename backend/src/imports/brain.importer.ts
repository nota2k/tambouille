import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { safeFetch } from '../common/safe-fetch';
import { stripHtml } from '../common/strip-html';
import { parseTimecode } from '../common/timecode';
import {
  type MixImport,
  type SourceImporter,
  type SourceItem,
} from './source-importer';

const PAGE_MAX_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

const HOSTS = ['thebrainradio.com', 'www.thebrainradio.com'];

/**
 * L'émission est toujours la même, et c'est elle l'artiste.
 *
 * Les autres sources donnent un invité différent à chaque épisode, lu dans la
 * page. Ici il n'y a personne à lire : The Brain est une émission de radio qui
 * publie ses propres mix depuis 2002. Le nom est donc posé en dur, et il n'a
 * pas de raison d'être devinable.
 */
const ARTISTE = 'The Brain Radioshow';

export interface BrainEpisode {
  title: string;
  coverUrl?: string;
  audioUrl: string;
  durationSec?: number;
  tracklist: { artist: string; title: string; timecodeSec: number }[];
}

/**
 * Une page d'épisode, et elle seule.
 *
 * `playlists.php` liste les 180 émissions sur une seule page ; la revendiquer
 * ici obligerait à choisir dans une liste de 180 entrées là où l'usage est de
 * coller le lien de l'épisode voulu. Non revendiquée, elle tombe dans le
 * message « lien non reconnu », qui dit au moins la vérité.
 */
export function isEpisodeUrl(url: URL): boolean {
  if (!HOSTS.includes(url.hostname.toLowerCase())) return false;
  if (!/^\/listen\.php$/i.test(url.pathname)) return false;
  return /^\d+$/.test(url.searchParams.get('episode') ?? '');
}

function firstMatch(html: string, pattern: RegExp): string | undefined {
  return html.match(pattern)?.[1];
}

/**
 * La pochette : la première image du premier `<li>` de `<ul class="enligne">`.
 *
 * La règle est précise parce que la page porte trois images et que deux d'entre
 * elles ne sont pas la pochette. Le premier `<li>` contient le visuel carré en
 * 350×350 (`pochettes/thebrainNNN.jpg`), le deuxième le logo du site
 * (`css/logoListen.jpg`), le troisième un `pochettes/thebrainNNN.gif` qui n'est
 * pas le même fichier. Vérifié sur les épisodes #036 (2002) à #215 (2026) : la
 * disposition n'a pas bougé en vingt-quatre ans.
 *
 * Prendre « la première image de la page » attraperait la bonne par accident ;
 * prendre « celle qui commence par pochettes/ » attraperait le `.gif` une fois
 * sur deux selon l'ordre. D'où l'ancrage sur la structure.
 */
export function parseCoverPath(html: string): string | undefined {
  const bloc = firstMatch(
    html,
    /<ul[^>]*class=["'][^"']*enligne[^"']*["'][^>]*>([\s\S]*?)<\/ul>/i,
  );
  if (!bloc) return undefined;

  const premierLi = firstMatch(bloc, /<li\b[^>]*>([\s\S]*?)<\/li>/i);
  if (!premierLi) return undefined;

  return firstMatch(premierLi, /<img[^>]*\ssrc=["']([^"']+)["']/i);
}

/**
 * Une ligne de tracklist s'écrit `<p>Artiste - Titre</p><span>MM:SS</span>`.
 *
 * La coupure se fait sur le PREMIER tiret entouré d'espaces, à l'inverse
 * d'Ouïedire qui coupe sur le dernier : ici c'est l'artiste qui vient en tête,
 * et ce sont les titres qui portent des tirets — « Je Sors (Steppin' out
 * Cover) » et consorts. Couper au dernier renverrait la moitié d'un titre comme
 * nom d'artiste.
 *
 * Une ligne sans séparateur — « Jingle », « Générique » — nomme le morceau et
 * non son auteur : elle part en titre, l'artiste reste vide plutôt que
 * d'emprunter les mots du titre.
 */
export function parseTrackLabel(label: string): {
  artist: string;
  title: string;
} {
  const separator = label.search(/\s[-–—]\s/u);
  if (separator < 1) return { artist: '', title: label };

  const artist = label.slice(0, separator).trim();
  const title = label.slice(label.indexOf(' ', separator + 1) + 1).trim();
  if (!artist || !title) return { artist: '', title: label };

  return { artist, title };
}

export function parseEpisodePage(html: string): BrainEpisode {
  const audioPath =
    firstMatch(
      html,
      /<a[^>]*\bid=["']lecteur["'][^>]*\shref=["']([^"']+)["']/i,
    ) ?? firstMatch(html, /\shref=["']((?:[^"']*\/)?mp3\/[^"']+\.mp3)["']/i);
  if (!audioPath) {
    throw new BadRequestException(
      'Cette page The Brain ne propose aucun fichier audio lisible',
    );
  }

  const rawTitle = firstMatch(
    html,
    /<span[^>]*class=["']\s*titre\s*["'][^>]*>([\s\S]*?)<\/span>/i,
  );
  const rawDuration = firstMatch(
    html,
    /<div[^>]*class=["']\s*duration\s*["'][^>]*>([\s\S]*?)<\/div>/i,
  );
  const durationSec = rawDuration
    ? parseTimecode(stripHtml(rawDuration))
    : null;

  // La tracklist vit dans le `<div class="metadata">` du lecteur, et on
  // s'arrête à son premier `</ul>`.
  //
  // Deux pièges tenaient dans ces quelques caractères. La classe est comparée
  // exactement : la page porte dix-neuf `metadataShortCut`, qui contiennent le
  // même contenu augmenté du label et de l'année, et un motif en sous-chaîne ne
  // visait le bon bloc que parce qu'il vient en premier dans le document.
  // Ensuite le bloc se ferme sur `</ul></div>` et non `</div></li>` : viser la
  // fermeture du `div` faisait déborder la capture jusqu'à la fin de la page.
  //
  // S'ancrer là plutôt que balayer la page reste nécessaire : le menu du site
  // est fait des mêmes `<li>`, et un balayage large y ramasserait « HOME » et
  // « NEWS » en guise de morceaux.
  const metadata = firstMatch(
    html,
    /<div[^>]*class=["']\s*metadata\s*["'][^>]*>([\s\S]*?)<\/ul>/i,
  );

  const tracklist: BrainEpisode['tracklist'] = [];
  if (metadata) {
    for (const row of metadata.matchAll(
      /<li\b[^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>\s*<span[^>]*>([\s\S]*?)<\/span>/gi,
    )) {
      const timecodeSec = parseTimecode(stripHtml(row[2]));
      if (timecodeSec === null) continue;

      const label = stripHtml(row[1]).replace(/\s+/g, ' ').trim();
      if (!label) continue;

      tracklist.push({ timecodeSec, ...parseTrackLabel(label) });
    }
  }

  return {
    title: rawTitle ? stripHtml(rawTitle) : 'The Brain',
    coverUrl: parseCoverPath(html),
    audioUrl: audioPath,
    durationSec: durationSec ?? undefined,
    tracklist,
  };
}

@Injectable()
export class BrainImporter implements SourceImporter {
  readonly name = 'brain';

  matches(url: URL): boolean {
    return isEpisodeUrl(url);
  }

  /** Une page d'épisode est un mix, jamais une liste. */
  async resolve(url: URL): Promise<MixImport | SourceItem[]> {
    return this.fromPageUrl(this.canonical(url));
  }

  async importItem(value: string): Promise<MixImport> {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new BadRequestException('Référence The Brain invalide');
    }
    if (!isEpisodeUrl(url)) {
      throw new BadRequestException('Référence The Brain invalide');
    }
    return this.fromPageUrl(this.canonical(url));
  }

  /**
   * Ne garde que le numéro d'épisode.
   *
   * Tout le reste de la chaîne de requête — les paramètres de campagne d'un
   * lien partagé, au premier chef — désigne la même page, et le laisser ferait
   * passer deux liens vers le même épisode pour deux sources différentes.
   */
  private canonical(url: URL): string {
    const episode = url.searchParams.get('episode')!;
    // L'hôte est ramené à `www.` quelle que soit la forme collée. `sourceRef`
    // est stocké en base et sert ensuite à nommer la source à l'affichage :
    // laisser passer les deux écritures ferait deux hôtes pour un seul site,
    // donc deux entrées à tenir partout où on les traduit en nom lisible.
    return `https://www.thebrainradio.com/listen.php?episode=${episode}`;
  }

  private async fromPageUrl(pageUrl: string): Promise<MixImport> {
    const { body } = await safeFetch(pageUrl, {
      maxBytes: PAGE_MAX_BYTES,
      timeoutMs: FETCH_TIMEOUT_MS,
      accept: 'text/html',
    });

    let episode: BrainEpisode;
    try {
      episode = parseEpisodePage(body.toString('utf8'));
    } catch {
      // Un numéro d'épisode inconnu rend une page qui s'analyse comme du HTML
      // mais ne porte aucun audio : « pas cet épisode » et « page illisible »
      // sont la même observation d'ici.
      throw new NotFoundException(
        'Cette page The Brain ne correspond à aucun épisode lisible',
      );
    }

    // Les chemins de la page sont relatifs (`mp3/…`, `pochettes/…`). Résolus
    // contre l'URL de la page plutôt que recomposés à la main : le numéro est
    // zéro-complété sur trois chiffres dans les noms de fichiers mais pas dans
    // l'URL, et deviner cette règle est une source d'erreur pour rien.
    const absolu = (chemin: string) => new URL(chemin, pageUrl).toString();

    return {
      title: episode.title,
      description: '',
      // Aucun tag : l'artiste porte déjà le seul nom que la page donne, et le
      // répéter ici ferait deux sources pour la même information — ce dont les
      // autres importateurs se sont précisément défaits.
      tags: [],
      artist: ARTISTE,
      coverSourceUrl: episode.coverUrl ? absolu(episode.coverUrl) : undefined,
      durationSec: episode.durationSec,
      tracklist: episode.tracklist,
      sourceType: 'remote',
      sourceRef: absolu(episode.audioUrl),
      sourceLabel: ARTISTE,
      sourcePageUrl: pageUrl,
    };
  }
}
