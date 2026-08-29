/**
 * « 00:03:20 » ou « 3:20 » en secondes. Null quand ce n'est pas un timecode.
 *
 * Vit ici et non chez un importateur : deux sites au moins écrivent leurs
 * tracklists avec des timecodes, sous des balisages sans rapport, et le seul
 * point commun est cette lecture. La laisser chez le premier arrivé obligeait
 * le second à en dépendre — un importateur n'a rien à savoir d'un autre.
 */
export function parseTimecode(raw: string): number | null {
  const parts = raw.trim().split(':');
  if (parts.length < 2 || parts.length > 3) return null;
  const numbers = parts.map(Number);
  if (numbers.some((part) => !Number.isInteger(part) || part < 0)) return null;
  return numbers.reduce((acc, part) => acc * 60 + part, 0);
}
