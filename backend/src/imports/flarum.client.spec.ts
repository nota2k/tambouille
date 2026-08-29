// Fixture figée le 30 août 2026 depuis
// https://www.musiques-incongrues.net/api/discussions?filter[author]=nota
// — un compte réel, ses 24 discussions à cette date. Représentative tant que
// nota ne poste pas de nouvelle discussion sur le forum.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BadGatewayException } from '@nestjs/common';
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

describe('FlarumClient.getDiscussion', () => {
  beforeEach(() => mockSafeFetch.mockReset());

  function reponds(document: unknown) {
    mockSafeFetch.mockResolvedValue({
      url: new URL('https://www.musiques-incongrues.net/api/discussions/15617'),
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify(document)),
    });
  }

  it('assemble une réponse à objet unique en FlarumDiscussion, termNames compris', async () => {
    reponds({
      data: {
        type: 'discussions',
        id: '15617',
        attributes: {
          title: 'Un titre',
          createdAt: '2026-01-01T00:00:00Z',
          slug: '15617-un-titre',
        },
        relationships: {
          firstPost: { data: { id: '99' } },
          taxonomyTerms: { data: [{ id: '7' }] },
        },
      },
      included: [
        {
          type: 'posts',
          id: '99',
          attributes: { contentHtml: '<p>Salut</p>' },
        },
        {
          type: 'flamarkt-taxonomy-terms',
          id: '7',
          attributes: { name: 'Mixcloud' },
        },
      ],
    });

    const discussion = await new FlarumClient().getDiscussion('15617');

    expect(discussion).toEqual({
      id: '15617',
      title: 'Un titre',
      createdAt: '2026-01-01T00:00:00Z',
      pageUrl: 'https://www.musiques-incongrues.net/d/15617-un-titre',
      contentHtml: '<p>Salut</p>',
      termNames: ['Mixcloud'],
    });
  });

  it('lève BadGatewayException quand la discussion est absente de la réponse', async () => {
    reponds({ data: null });

    await expect(new FlarumClient().getDiscussion('15617')).rejects.toThrow(
      BadGatewayException,
    );
  });

  it("encode l'id plutôt que de le coller tel quel", async () => {
    reponds({ data: null });
    await new FlarumClient().getDiscussion('a b/c').catch(() => undefined);

    expect(mockSafeFetch).toHaveBeenCalledWith(
      expect.stringContaining('a%20b%2Fc'),
      expect.anything(),
    );
  });
});
