import { resolve } from 'path';
import {
  FourneeParseError,
  parseFournee,
  readFournees,
} from './fournees.reader';

const DOSSIER_DU_DEPOT = resolve(
  __dirname,
  '..',
  '..',
  '..',
  'frontend',
  'src',
  'content',
  'fournees',
);

function fichier(frontmatter: string, corps = 'Le texte.') {
  return `---\n${frontmatter}\n---\n\n${corps}\n`;
}

const VALIDE = [
  'number: 1',
  'title: Nuit de quinze heures',
  'period: Tout l’hiver',
  'mixes: [a, b, c]',
].join('\n');

describe('parseFournee', () => {
  it('lit les clés dont le flux a besoin', () => {
    expect(parseFournee(fichier(VALIDE), 'x.md')).toEqual({
      number: 1,
      title: 'Nuit de quinze heures',
      period: 'Tout l’hiver',
      intro: 'Le texte.',
      mixIds: ['a', 'b', 'c'],
    });
  });

  it("garde l'ordre du fichier et dédoublonne les identifiants répétés", () => {
    // `2026-hiver.md` cite deux fois le même mix. Deux items de même `guid`
    // font qu'un client en garde un et qu'un autre affiche un doublon.
    const source = parseFournee(
      fichier(VALIDE.replace('[a, b, c]', '[c, a, c, b]')),
      'x.md',
    );
    expect(source.mixIds).toEqual(['c', 'a', 'b']);
  });

  it('refuse un fichier sans frontmatter, en le nommant', () => {
    expect(() => parseFournee('juste du texte', 'fautif.md')).toThrow(
      FourneeParseError,
    );
    expect(() => parseFournee('juste du texte', 'fautif.md')).toThrow(
      /fautif\.md/,
    );
  });

  it('refuse une clé absente ou un numéro qui n’en est pas un', () => {
    expect(() =>
      parseFournee(
        fichier(VALIDE.replace('title: Nuit de quinze heures', '')),
        'x.md',
      ),
    ).toThrow(/`title`/);
    expect(() =>
      parseFournee(
        fichier(VALIDE.replace('number: 1', 'number: zéro')),
        'x.md',
      ),
    ).toThrow(/`number`/);
    expect(() =>
      parseFournee(
        fichier(VALIDE.replace('mixes: [a, b, c]', 'mixes: a, b')),
        'x.md',
      ),
    ).toThrow(/liste en ligne/);
  });
});

/**
 * Le garde-fou contre la divergence des deux analyseurs — celui-ci et
 * `frontend/src/content/fournees.ts`. Il lit les fichiers réels du dépôt, pas
 * une liste écrite en dur : un fichier que ce côté-ci ne sait plus lire fait
 * échouer la CI avant d'atteindre un abonné.
 */
describe('les fichiers de fournée du dépôt', () => {
  it('se lisent tous, README exclu', () => {
    const fournees = readFournees(DOSSIER_DU_DEPOT);

    expect(fournees.length).toBeGreaterThan(0);
    for (const fournee of fournees) {
      expect(fournee.number).toBeGreaterThan(0);
      expect(fournee.title).not.toHaveLength(0);
      expect(fournee.mixIds.length).toBeGreaterThan(0);
    }
  });

  it('rend une liste vide quand le dossier est absent, sans jeter', () => {
    // C'est l'état d'un déploiement qui n'a pas encore emporté le dossier : les
    // trois autres flux doivent continuer de servir.
    expect(readFournees(resolve(DOSSIER_DU_DEPOT, 'nulle-part'))).toEqual([]);
  });
});
