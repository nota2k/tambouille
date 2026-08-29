// Fixtures figées le 29 août 2026 depuis
// https://www.musiques-incongrues.net/api/discussions?filter[author]=nota
// et .../api/discussions/15617 — un compte réel, ses 24 discussions.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FlarumClient } from './flarum.client';

jest.mock('../common/safe-fetch', () => ({ safeFetch: jest.fn() }));
import { safeFetch } from '../common/safe-fetch';

const mockSafeFetch = safeFetch as jest.MockedFunction<typeof safeFetch>;

function fixture(name: string): Buffer {
  return readFileSync(join(__dirname, '__fixtures__', name));
}

function repond(name: string) {
  mockSafeFetch.mockResolvedValue({
    url: new URL('https://www.musiques-incongrues.net/api/discussions'),
    contentType: 'application/json',
    body: fixture(name),
  });
}

describe('FlarumClient.listByAuthor', () => {
  beforeEach(() => mockSafeFetch.mockReset());

  it('rend les discussions du seul auteur demandé', async () => {
    repond('mi-author-nota.json');
    const discussions = await new FlarumClient().listByAuthor('nota');

    expect(discussions).toHaveLength(24);
    expect(mockSafeFetch).toHaveBeenCalledWith(
      expect.stringContaining('filter%5Bauthor%5D=nota'),
      expect.objectContaining({ accept: 'application/json' }),
    );
  });

  it('rattache à chaque discussion le HTML de son premier message', async () => {
    repond('mi-author-nota.json');
    const discussions = await new FlarumClient().listByAuthor('nota');

    const avecEmbed = discussions.filter((d) =>
      d.contentHtml.includes('data-s9e-mediaembed'),
    );
    // 14 mixcloud + 4 bandcamp + 2 youtube — mesuré le 29 août 2026.
    expect(avecEmbed).toHaveLength(20);
  });

  it("construit l'URL de page depuis le slug, pas depuis l'id nu", async () => {
    repond('mi-author-nota.json');
    const [premiere] = await new FlarumClient().listByAuthor('nota');

    expect(premiere.pageUrl).toMatch(
      /^https:\/\/www\.musiques-incongrues\.net\/d\/\d+-/,
    );
  });

  it('encode le pseudo plutôt que de le coller tel quel', async () => {
    repond('mi-author-nota.json');
    await new FlarumClient().listByAuthor('a b&c');

    expect(mockSafeFetch).toHaveBeenCalledWith(
      expect.stringContaining('a%20b%26c'),
      expect.anything(),
    );
  });

  it('rend une liste vide plutôt que de lever quand la réponse est vide', async () => {
    mockSafeFetch.mockResolvedValue({
      url: new URL('https://www.musiques-incongrues.net/api/discussions'),
      contentType: 'application/json',
      body: Buffer.from('{"data":[]}'),
    });

    await expect(new FlarumClient().listByAuthor('personne')).resolves.toEqual([]);
  });
});
