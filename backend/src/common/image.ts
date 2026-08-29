import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

/**
 * Toute image qui entre dans Tambouille en ressort en WebP.
 *
 * Une pochette JPEG de 3 Mo pèse quelques centaines de kilo-octets en WebP à
 * qualité comparable, et l'accueil en affiche plusieurs dizaines d'un coup.
 * Les images arrivent par deux chemins — un formulaire d'upload, ou une source
 * distante que le serveur va chercher lui-même — et les deux passent par ici,
 * pour que ce qui est stocké ne dépende pas du chemin emprunté.
 *
 * Ce qui n'est PAS fait ici : les images déjà en base ne sont pas reconverties.
 * Elles gardent leur clé et leur format ; seul ce qui arrive après est
 * converti. Une reprise de l'existant est un travail à part, qui doit réécrire
 * des colonnes.
 */

/** Ce que `sharp` sait décoder parmi les types acceptés à l'entrée. */
export const WEBP_CONTENT_TYPE = 'image/webp';
export const WEBP_EXTENSION = '.webp';

/**
 * 82 : au-dessus, le fichier grossit vite sans gain visible sur des pochettes ;
 * en dessous, les aplats de couleur des visuels de radio se marbrent.
 */
const WEBP_QUALITY = 82;

/**
 * Le plus grand côté, en pixels, selon ce que l'image sert à montrer.
 *
 * Une seule taille est stockée par image — le site n'a pas de variantes — donc
 * chaque plafond est celui du plus grand affichage de cette image. Un avatar
 * ne dépasse jamais 128 px à l'écran, même en rétine : 512 laisse de la marge
 * pour un futur affichage plus grand sans stocker dix fois le nécessaire.
 */
export const IMAGE_MAX_DIMENSION: Record<string, number> = {
  covers: 1400,
  avatars: 512,
  banners: 2000,
};

const DEFAULT_MAX_DIMENSION = 1400;

export function maxDimensionFor(subdir: string): number {
  return IMAGE_MAX_DIMENSION[subdir] ?? DEFAULT_MAX_DIMENSION;
}

export interface ConvertedImage {
  buffer: Buffer;
  contentType: string;
  extension: string;
}

/**
 * Convertit une image en WebP, réduite au plafond de son usage.
 *
 * `rotate()` sans argument applique l'orientation EXIF avant que l'encodage ne
 * jette les métadonnées : sans lui, une photo prise à l'horizontale par un
 * téléphone est stockée couchée, et plus rien ensuite ne dit qu'elle l'est.
 *
 * `withoutEnlargement` : on réduit, on n'agrandit jamais. Étirer une petite
 * pochette ne lui ajoute rien et multiplie son poids.
 *
 * Une image déjà en WebP et déjà sous le plafond ressort telle quelle : la
 * réencoder ne ferait que lui retirer de la qualité une seconde fois.
 */
export async function toWebp(
  input: Buffer,
  subdir: string,
): Promise<ConvertedImage> {
  const max = maxDimensionFor(subdir);

  let image: sharp.Sharp;
  let metadata: sharp.Metadata;
  try {
    image = sharp(input, { animated: true });
    metadata = await image.metadata();
  } catch {
    // Le type MIME est déclaré par le client ou par le serveur distant ; seul
    // le décodage dit vraiment ce que le fichier contient.
    throw new BadRequestException('Image illisible : format non reconnu');
  }

  const largest = Math.max(metadata.width ?? 0, metadata.height ?? 0);
  if (metadata.format === 'webp' && largest <= max) {
    return {
      buffer: input,
      contentType: WEBP_CONTENT_TYPE,
      extension: WEBP_EXTENSION,
    };
  }

  const buffer = await image
    .rotate()
    .resize({
      width: max,
      height: max,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  return {
    buffer,
    contentType: WEBP_CONTENT_TYPE,
    extension: WEBP_EXTENSION,
  };
}

/**
 * La même image, réduite à une largeur donnée.
 *
 * Sert les variantes de `image-variantes.ts` : une pochette stockée en 1400 px
 * s'affiche dans des cases de 200 à 400 px, et servir les 1400 à tout le monde
 * coûtait 516 Kio par chargement de l'accueil.
 *
 * `withoutEnlargement` comme partout ailleurs ici : on réduit, jamais
 * l'inverse. La conséquence à connaître : une image source plus étroite que la
 * variante demandée ressort à sa taille d'origine tout en portant le nom de la
 * variante — `covers/x-800.webp` peut donc mesurer 300 px.
 *
 * C'est délibéré, et c'est le prix d'une convention de nommage déduite plutôt
 * que stockée. L'alternative — ne pas écrire la variante — laisserait le
 * `srcset` du frontend désigner un objet absent, et un candidat en 404 ne
 * retombe PAS sur les autres : le navigateur n'affiche rien. Une image
 * légèrement moins nette vaut mieux qu'une pochette manquante.
 *
 * Sur les pochettes réelles la question ne se pose guère : le plafond d'entrée
 * est à 1400 px et les sources dépassent presque toujours 900 px.
 */
export async function toWebpLargeur(
  input: Buffer,
  largeur: number,
): Promise<ConvertedImage> {
  let image: sharp.Sharp;
  try {
    image = sharp(input, { animated: true });
    await image.metadata();
  } catch {
    throw new BadRequestException('Image illisible : format non reconnu');
  }

  const buffer = await image
    .rotate()
    .resize({ width: largeur, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  return {
    buffer,
    contentType: WEBP_CONTENT_TYPE,
    extension: WEBP_EXTENSION,
  };
}
