/**
 * Le document XML d'un plan de site, écrit à la main comme les flux RSS
 * voisins : la dépendance qu'on éviterait ici sait faire une chose que trente
 * lignes font aussi.
 */

/** La limite du protocole. Au-delà, il faut un index de plans de site. */
export const SITEMAP_MAX_URLS = 50_000;

export interface SitemapEntry {
  /** Absolue, sur le domaine du site public. */
  loc: string;
  /** Date de dernière modification, au format ISO. */
  lastmod?: Date | string | null;
  /** Indice de fraîcheur pour le robot ; non contraignant. */
  changefreq?: 'daily' | 'weekly' | 'monthly';
  /** Priorité relative à l'intérieur du site, entre 0 et 1. */
  priority?: number;
}

/**
 * Les cinq caractères que XML n'admet pas bruts. Les titres n'entrent pas dans
 * un plan de site, mais les URL si, et un `&` d'une chaîne de requête suffit à
 * rendre le document invalide — donc illisible en entier, pas seulement à cette
 * ligne.
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function isoDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function buildSitemap(entries: SitemapEntry[]): string {
  const urls = entries.slice(0, SITEMAP_MAX_URLS).map((entry) => {
    const lastmod = isoDate(entry.lastmod);
    const lines = [`    <loc>${escapeXml(entry.loc)}</loc>`];
    if (lastmod) lines.push(`    <lastmod>${lastmod}</lastmod>`);
    if (entry.changefreq) {
      lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    }
    if (entry.priority != null) {
      lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
    }
    return `  <url>\n${lines.join('\n')}\n  </url>`;
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}
