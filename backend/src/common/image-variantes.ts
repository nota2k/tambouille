/**
 * Les largeurs supplémentaires d'une image, et le nom de chacune.
 *
 * Une pochette est stockée une fois, au plafond de son usage — 1400 px pour les
 * covers. L'accueil en affiche pourtant des dizaines dans des cases de 200 à
 * 400 px : chaque visiteur téléchargeait donc trois à sept fois les pixels
 * qu'il voit. Mesuré le 29 août 2026 sur la production : 516 Kio de trop sur la
 * seule page d'accueil, pour des fichiers pourtant déjà en WebP.
 *
 * ── La convention de nommage, et pourquoi elle n'est pas stockée ────────────
 *
 * La variante de `covers/<uuid>.webp` en 400 px s'appelle
 * `covers/<uuid>-400.webp`. Rien en base ne l'énumère : le frontend la déduit
 * de la clé de base par la même règle, dans `frontend/src/utils/media.ts`.
 *
 * C'est un couplage, et il est assumé : l'alternative était une colonne JSON
 * listant les variantes, donc une migration — et sur cet hébergement une
 * migration se lance à la main en SSH, la CLI Prisma ne tenant pas dans la
 * limite mémoire des processus cPanel. Le coût permanent d'une colonne à tenir
 * dépassait celui d'une règle écrite deux fois et testée des deux côtés.
 *
 * Les deux listes DOIVENT rester d'accord. Si vous touchez à ce fichier,
 * touchez à `LARGEURS_DE_VARIANTE` de `media.ts` dans le même commit.
 */

/**
 * Par répertoire, les largeurs à produire en plus de l'originale.
 *
 * Toutes sont strictement sous le plafond de stockage du répertoire (voir
 * `IMAGE_MAX_DIMENSION`) : une variante plus large que l'originale n'aurait
 * rien à agrandir.
 *
 * Les valeurs suivent les tailles d'affichage réelles. Une pochette occupe 200
 * à 400 px dans une carte et jusqu'à 800 px sur la page d'un mix ; un avatar ne
 * dépasse jamais 128 px, doublé pour les écrans à forte densité.
 */
export const LARGEURS_DE_VARIANTE: Record<string, readonly number[]> = {
  covers: [400, 800],
  avatars: [128, 256],
  banners: [800, 1400],
};

/**
 * Le répertoire d'une clé R2, quand c'est un répertoire d'images.
 *
 * Rend undefined pour tout le reste — et c'est la raison d'être de cette
 * fonction. `deleteFromR2` reçoit indifféremment des clés de pochette et des
 * clés audio (`mixes.service` supprime les deux ensemble) : dériver des
 * variantes d'un fichier audio construirait des clés qui ne veulent rien dire.
 */
export function repertoireImage(cle: string): string | undefined {
  const separateur = cle.indexOf('/');
  if (separateur < 1) return undefined;
  const repertoire = cle.slice(0, separateur);
  return repertoire in LARGEURS_DE_VARIANTE ? repertoire : undefined;
}

/**
 * `covers/abc.webp` + 400 → `covers/abc-400.webp`.
 *
 * Le suffixe se pose avant l'extension et non après : un objet servi doit
 * garder une extension que le navigateur et R2 reconnaissent.
 */
export function cleDeVariante(cle: string, largeur: number): string {
  const point = cle.lastIndexOf('.');
  // Sans extension, on suffixe la fin — le cas ne devrait pas se produire, mais
  // une clé tronquée vaut mieux qu'une clé où le suffixe traverse le nom.
  if (point < 1) return `${cle}-${largeur}`;
  return `${cle.slice(0, point)}-${largeur}${cle.slice(point)}`;
}

/**
 * Toutes les variantes d'une clé, ou rien si elle n'en a pas.
 *
 * Sert à deux usages opposés : les écrire à l'arrivée d'une image, et les
 * effacer avec elle. C'est la même liste, ce qui est la seule façon de garantir
 * qu'on n'oublie pas d'effacer ce qu'on a écrit.
 */
export function clesDeVariantes(cle: string): string[] {
  const repertoire = repertoireImage(cle);
  if (!repertoire) return [];
  // Une variante n'a pas de variantes : sans ça, effacer `abc-400.webp`
  // chercherait `abc-400-400.webp`, et l'écriture pourrait boucler.
  if (estUneVariante(cle)) return [];
  return LARGEURS_DE_VARIANTE[repertoire].map((largeur) =>
    cleDeVariante(cle, largeur),
  );
}

/** Vrai pour `covers/abc-400.webp`, faux pour `covers/abc.webp`. */
export function estUneVariante(cle: string): boolean {
  const repertoire = repertoireImage(cle);
  if (!repertoire) return false;
  const point = cle.lastIndexOf('.');
  const sansExtension = point < 1 ? cle : cle.slice(0, point);
  const suffixe = sansExtension.match(/-(\d+)$/);
  if (!suffixe) return false;
  return LARGEURS_DE_VARIANTE[repertoire].includes(Number(suffixe[1]));
}
