/**
 * La page qu'un robot d'aperçu reçoit à la place de l'application.
 *
 * Facebook, Discord, WhatsApp, Slack, Twitter/X, Signal, Telegram, LinkedIn :
 * aucun n'exécute le JavaScript. Ils lisent le HTML tel quel, y cherchent les
 * balises Open Graph, et s'en vont. `frontend/index.html` ne leur offrant que
 * les valeurs par défaut du site, tout lien partagé s'affichait avec le même
 * titre et sans pochette, quel que soit le mix.
 *
 * Ce document est donc écrit pour eux : les balises dans le `<head>`, et un
 * corps minimal qui redirige tout de suite qui n'est pas un robot — le
 * routage ne les distingue que par leur `User-Agent`, ce qui peut se tromper.
 *
 * Googlebot n'est délibérément pas envoyé ici : il exécute le JavaScript et
 * voit donc le vrai site, où `useSeo` écrit les mêmes balises. Lui servir un
 * document différent serait du cloaking, que Google sanctionne.
 */

export interface PreviewPage {
  /** Sans le nom du site : le suffixe est ajouté ici, une seule fois. */
  title: string;
  description: string;
  /** L'URL de la page réelle, sur le domaine du site. */
  canonical: string;
  image?: string | null;
  type?: 'website' | 'music.song' | 'music.playlist' | 'profile';
  /** Un fichier audio jouable directement, quand il en existe un. */
  audio?: { url: string; mimeType: string } | null;
  jsonLd?: Record<string, unknown> | null;
}

export const SITE_NAME = 'Tambouille';

const DESCRIPTION_MAX = 160;

/** Les cinq caractères qui, laissés bruts, sortiraient de l'attribut ou de la balise. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Une ligne, coupée à l'espace.
 *
 * Mêmes règles que `frontend/src/utils/seo.ts`, et volontairement recopiées :
 * les deux paquets ne partagent aucun code, et une dépendance de l'un vers
 * l'autre coûterait plus que ces douze lignes. Ce qui compte est que les deux
 * produisent le même texte, ce que les tests vérifient de chaque côté.
 */
export function previewDescription(
  text: string | null | undefined,
  fallback: string,
): string {
  const flat = (text ?? '').replace(/\s+/g, ' ').trim() || fallback;
  if (flat.length <= DESCRIPTION_MAX) return flat;

  const cut = flat.slice(0, DESCRIPTION_MAX - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > DESCRIPTION_MAX / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function previewTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed || trimmed === SITE_NAME) return SITE_NAME;
  return `${trimmed} — ${SITE_NAME}`;
}

function meta(attr: 'name' | 'property', key: string, content: string): string {
  return `    <meta ${attr}="${key}" content="${escapeHtml(content)}">`;
}

export function buildPreviewHtml(page: PreviewPage): string {
  const title = previewTitle(page.title);
  const tags = [
    meta('name', 'description', page.description),
    meta('property', 'og:site_name', SITE_NAME),
    meta('property', 'og:type', page.type ?? 'website'),
    meta('property', 'og:title', title),
    meta('property', 'og:description', page.description),
    meta('property', 'og:url', page.canonical),
    meta('property', 'og:locale', 'fr_FR'),
    meta(
      'name',
      'twitter:card',
      page.image ? 'summary_large_image' : 'summary',
    ),
    meta('name', 'twitter:title', title),
    meta('name', 'twitter:description', page.description),
  ];

  if (page.image) {
    tags.push(meta('property', 'og:image', page.image));
    tags.push(meta('name', 'twitter:image', page.image));
  }

  if (page.audio) {
    tags.push(meta('property', 'og:audio', page.audio.url));
    tags.push(meta('property', 'og:audio:type', page.audio.mimeType));
  }

  if (page.jsonLd) {
    // `<` échappé : une valeur venant de la base qui contiendrait `</script>`
    // fermerait la balise, et le reste du document serait interprété comme du
    // HTML par le robot.
    const json = JSON.stringify(page.jsonLd).replace(/</g, '\\u003c');
    tags.push(`    <script type="application/ld+json">${json}</script>`);
  }

  const canonical = escapeHtml(page.canonical);

  return `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8">
    <title>${escapeHtml(title)}</title>
    <link rel="canonical" href="${canonical}">
${tags.join('\n')}
    <meta name="robots" content="noindex">
    <meta http-equiv="refresh" content="0; url=${canonical}">
  </head>
  <body>
    <p><a href="${canonical}">${escapeHtml(title)}</a></p>
  </body>
</html>
`;
}
