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

// Sérialise un objet JS en corps de réponse — pour les tests qui construisent
// leur payload à la main plutôt que de le lire d'une fixture figée.
function repondAvec(objet: unknown) {
  mockSafeFetch.mockResolvedValue({
    url: new URL('https://www.musiques-incongrues.net/api/posts'),
    contentType: 'application/json',
    body: Buffer.from(JSON.stringify(objet)),
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

    await expect(new FlarumClient().listByAuthor('personne')).resolves.toEqual(
      [],
    );
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

describe('FlarumClient.listRecentDiscussions', () => {
  beforeEach(() => mockSafeFetch.mockReset());

  function reponds(document: unknown) {
    mockSafeFetch.mockResolvedValue({
      url: new URL('https://www.musiques-incongrues.net/api/discussions'),
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify(document)),
    });
  }

  it('trie par date décroissante et limite à 10 par défaut', async () => {
    reponds({ data: [] });
    await new FlarumClient().listRecentDiscussions();

    const [url] = mockSafeFetch.mock.calls[0];
    expect(url).toContain('sort=-createdAt');
    expect(url).toContain('page%5Blimit%5D=10');
    expect(url).toContain('include=firstPost%2Cuser');
  });

  it('respecte une limite explicite', async () => {
    reponds({ data: [] });
    await new FlarumClient().listRecentDiscussions(3);

    const [url] = mockSafeFetch.mock.calls[0];
    expect(url).toContain('page%5Blimit%5D=3');
  });

  it("rattache le pseudo de l'auteur depuis la relation `user` incluse", async () => {
    reponds({
      data: [
        {
          type: 'discussions',
          id: '1',
          attributes: {
            title: 'Un titre',
            createdAt: '2026-08-30T00:00:00Z',
            slug: '1-un-titre',
          },
          relationships: {
            firstPost: { data: { id: '9' } },
            user: { data: { id: '5' } },
          },
        },
      ],
      included: [
        { type: 'posts', id: '9', attributes: { contentHtml: '<p>x</p>' } },
        { type: 'users', id: '5', attributes: { username: 'Nota' } },
      ],
    });

    const [discussion] = await new FlarumClient().listRecentDiscussions();

    expect(discussion.authorUsername).toBe('Nota');
  });

  it("laisse authorUsername absent quand la relation `user` n'est pas incluse", async () => {
    reponds({
      data: [
        {
          type: 'discussions',
          id: '1',
          attributes: {
            title: 'Un titre',
            createdAt: '2026-08-30T00:00:00Z',
            slug: '1-un-titre',
          },
          relationships: { firstPost: { data: { id: '9' } } },
        },
      ],
      included: [
        { type: 'posts', id: '9', attributes: { contentHtml: '<p>x</p>' } },
      ],
    });

    const [discussion] = await new FlarumClient().listRecentDiscussions();

    expect(discussion.authorUsername).toBeUndefined();
  });
});

describe('FlarumClient.listPostsByAuthor', () => {
  beforeEach(() => mockSafeFetch.mockReset());

  it('demande les messages les plus RÉCENTS de cet auteur', async () => {
    repondAvec({ data: [] });
    await new FlarumClient().listPostsByAuthor('nota');

    const [url] = mockSafeFetch.mock.calls[0];
    expect(url).toContain('filter%5Bauthor%5D=nota');
    // Le tri par défaut de Flarum est chronologique CROISSANT : sans ce
    // paramètre, on lirait les messages de 2012 et jamais celui qui vient
    // d'être publié.
    expect(url).toContain('sort=-createdAt');
    // L'appelant fait de l'auteur une décision d'autorisation : il doit le
    // recevoir, pas le déduire du filtre.
    expect(url).toContain('include=user');
  });

  it('rend le contenu et l’AUTEUR de chaque message', async () => {
    repondAvec({
      data: [
        {
          type: 'posts',
          id: '1',
          attributes: {
            contentHtml: '<p>tambouille-7f3a9c</p>',
            createdAt: '2026-08-30T10:00:00+00:00',
          },
          relationships: { user: { data: { type: 'users', id: '7' } } },
        },
      ],
      included: [{ type: 'users', id: '7', attributes: { username: 'nota' } }],
    });
    const messages = await new FlarumClient().listPostsByAuthor('nota');

    expect(messages).toEqual([
      {
        id: '1',
        contentHtml: '<p>tambouille-7f3a9c</p>',
        createdAt: '2026-08-30T10:00:00+00:00',
        authorUsername: 'nota',
      },
    ]);
  });

  // `filter[author]` accepte plusieurs pseudos séparés par des virgules :
  // une réponse peut donc mêler les auteurs, et chaque message doit porter
  // le sien pour que l'appelant puisse trancher.
  it('rend l’auteur PROPRE à chaque message quand ils diffèrent', async () => {
    repondAvec({
      data: [
        {
          type: 'posts',
          id: '1',
          attributes: { contentHtml: '<p>a</p>', createdAt: '' },
          relationships: { user: { data: { type: 'users', id: '7' } } },
        },
        {
          type: 'posts',
          id: '2',
          attributes: { contentHtml: '<p>b</p>', createdAt: '' },
          relationships: { user: { data: { type: 'users', id: '9' } } },
        },
      ],
      included: [
        { type: 'users', id: '7', attributes: { username: 'nota' } },
        { type: 'users', id: '9', attributes: { username: 'gakona' } },
      ],
    });
    const messages = await new FlarumClient().listPostsByAuthor('nota,gakona');

    expect(messages.map((m) => m.authorUsername)).toEqual(['nota', 'gakona']);
  });

  // Un message dont le forum ne rattache pas l'auteur (compte supprimé) ne
  // doit pas se voir prêter celui qu'on cherchait.
  it('laisse l’auteur indéfini quand la relation manque', async () => {
    repondAvec({
      data: [
        {
          type: 'posts',
          id: '1',
          attributes: { contentHtml: '<p>a</p>', createdAt: '' },
        },
      ],
    });
    const [message] = await new FlarumClient().listPostsByAuthor('nota');

    expect(message.authorUsername).toBeUndefined();
  });

  it('rend une liste vide quand l’auteur n’a aucun message', async () => {
    repondAvec({ data: [] });
    await expect(
      new FlarumClient().listPostsByAuthor('inconnu'),
    ).resolves.toEqual([]);
  });
});

/**
 * La preuve par champ de profil, avec l'extension Masquerade : le membre
 * enregistre son jeton dans un champ de son profil au lieu de le publier dans
 * un message. Rien à supprimer ensuite, et rien qui traîne sur le forum.
 */
describe('FlarumClient.readProfileAnswers', () => {
  beforeEach(() => mockSafeFetch.mockReset());

  it('demande les réponses de profil de cet identifiant', async () => {
    repondAvec({ data: { type: 'users', id: '1363', attributes: {} } });
    await new FlarumClient().readProfileAnswers('1363');

    const [url] = mockSafeFetch.mock.calls[0];
    expect(url).toContain('/api/users/1363');
    expect(url).toContain('include=masqueradeAnswers');
  });

  it('rend le contenu de chaque réponse', async () => {
    repondAvec({
      data: { type: 'users', id: '1363', attributes: {} },
      included: [
        {
          type: 'masquerade-answer',
          id: '1',
          attributes: { content: '', fieldId: 1 },
        },
        {
          type: 'masquerade-answer',
          id: '4',
          attributes: { content: 'tambouille-482aae088c40', fieldId: 4 },
        },
      ],
    });

    await expect(
      new FlarumClient().readProfileAnswers('1363'),
    ).resolves.toEqual(['', 'tambouille-482aae088c40']);
  });

  // Le champ peut ne pas exister, être vide, ou l'extension être désinstallée :
  // aucun de ces cas n'est une panne, ce sont des « pas de preuve ici ».
  it('rend une liste vide quand le profil ne porte aucune réponse', async () => {
    repondAvec({ data: { type: 'users', id: '1363', attributes: {} } });
    await expect(
      new FlarumClient().readProfileAnswers('1363'),
    ).resolves.toEqual([]);
  });

  it('ignore les ressources incluses qui ne sont pas des réponses', async () => {
    repondAvec({
      data: { type: 'users', id: '1363', attributes: {} },
      included: [
        { type: 'groups', id: '3', attributes: { nameSingular: 'Membre' } },
      ],
    });
    await expect(
      new FlarumClient().readProfileAnswers('1363'),
    ).resolves.toEqual([]);
  });
});

describe('FlarumClient.findUserId', () => {
  beforeEach(() => mockSafeFetch.mockReset());

  // `/api/users` en liste répond 403 en anonyme et `/api/users/<pseudo>` 404 :
  // le seul chemin anonyme vers l'identifiant passe par un message de l'auteur.
  it("rend l'identifiant de l'auteur dont le pseudo correspond", async () => {
    repondAvec({
      data: [
        {
          type: 'posts',
          id: '9',
          attributes: {},
          relationships: { user: { data: { id: '1363' } } },
        },
      ],
      included: [
        { type: 'users', id: '1363', attributes: { username: 'nota' } },
      ],
    });

    await expect(new FlarumClient().findUserId('nota')).resolves.toBe('1363');
  });

  it('ignore la casse du pseudo', async () => {
    repondAvec({
      data: [
        {
          type: 'posts',
          id: '9',
          attributes: {},
          relationships: { user: { data: { id: '1363' } } },
        },
      ],
      included: [
        { type: 'users', id: '1363', attributes: { username: 'Nota' } },
      ],
    });

    await expect(new FlarumClient().findUserId('nota')).resolves.toBe('1363');
  });

  // Le filtre accepte une liste séparée par des virgules : un identifiant
  // rendu pour un AUTRE pseudo ne doit jamais être pris pour celui demandé.
  it('ne rend rien quand aucun auteur ne porte ce pseudo', async () => {
    repondAvec({
      data: [
        {
          type: 'posts',
          id: '9',
          attributes: {},
          relationships: { user: { data: { id: '2' } } },
        },
      ],
      included: [
        { type: 'users', id: '2', attributes: { username: 'mbertier' } },
      ],
    });

    await expect(new FlarumClient().findUserId('nota')).resolves.toBeNull();
  });

  it("rend null quand l'auteur n'a aucun message", async () => {
    repondAvec({ data: [] });
    await expect(new FlarumClient().findUserId('nota')).resolves.toBeNull();
  });
});
