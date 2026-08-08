const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/**
 * Turns a source's description into the plain text Tambouille stores.
 *
 * Both sources hand back HTML: an RSS feed wraps every description in `<p>`
 * (and the Ouïedire fixture carries `<pre>` ASCII art), and Archive.org's
 * `metadata.description` is a run of `<div>` lines. `Mix.description` is a
 * plain-text field rendered as text, so markup left in would be shown
 * literally — and it would eat into the 2000-character cap for nothing.
 *
 * This is a cleaner, not a sanitiser: nothing here is trusted as HTML
 * downstream, and the output is never inserted as markup.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 16)),
    )
    .replace(/&([a-z]+);/gi, (whole, name: string) => {
      const decoded = ENTITIES[name.toLowerCase()];
      return decoded ?? whole;
    })
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
