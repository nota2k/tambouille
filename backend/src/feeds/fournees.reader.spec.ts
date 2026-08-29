import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
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
  'mixes: [djnelly/a, djnelly/b, Lenta-po/c]',
].join('\n');

describe('parseFournee', () => {
  it('lit les clés dont le flux a besoin', () => {
    expect(parseFournee(fichier(VALIDE), 'x.md')).toEqual({
      number: 1,
      title: 'Nuit de quinze heures',
      period: 'Tout l’hiver',
      intro: 'Le texte.',
      mixRefs: [
        { username: 'djnelly', slug: 'a' },
        { username: 'djnelly', slug: 'b' },
        { username: 'Lenta-po', slug: 'c' },
      ],
    });
  });

  it("garde l'ordre du fichier et dédoublonne les mix répétés", () => {
    // Un fichier peut citer deux fois le même mix. Deux items de même `guid`
    // font qu'un client en garde un et qu'un autre affiche un doublon.
    const source = parseFournee(
      fichier(
        VALIDE.replace(
          '[djnelly/a, djnelly/b, Lenta-po/c]',
          '[Lenta-po/c, djnelly/a, Lenta-po/c, djnelly/b]',
        ),
      ),
      'x.md',
    );
    expect(source.mixRefs).toEqual([
      { username: 'Lenta-po', slug: 'c' },
      { username: 'djnelly', slug: 'a' },
      { username: 'djnelly', slug: 'b' },
    ]);
  });

  it('dédoublonne sans égard à la casse du compte', () => {
    // L'API compare l'username sans égard à la casse : `djnelly/a` et
    // `DJNelly/a` désignent le même mix, donc le même `guid`.
    const source = parseFournee(
      fichier(
        VALIDE.replace(
          '[djnelly/a, djnelly/b, Lenta-po/c]',
          '[djnelly/a, DJNelly/a, Lenta-po/c]',
        ),
      ),
      'x.md',
    );
    expect(source.mixRefs).toEqual([
      { username: 'djnelly', slug: 'a' },
      { username: 'Lenta-po', slug: 'c' },
    ]);
  });

  it('refuse un mix cité sans son compte, en le nommant', () => {
    // Le format d'avant : un UUID nu, qui ne désigne plus rien.
    expect(() =>
      parseFournee(
        fichier(
          VALIDE.replace('djnelly/a', '7578d396-c389-48de-905e-c688c1040864'),
        ),
        'x.md',
      ),
    ).toThrow(/7578d396-c389-48de-905e-c688c1040864/);
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
        fichier(
          VALIDE.replace(
            'mixes: [djnelly/a, djnelly/b, Lenta-po/c]',
            'mixes: djnelly/a, djnelly/b',
          ),
        ),
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
      expect(fournee.mixRefs.length).toBeGreaterThan(0);
    }
  });

  it("laisse les gabarits d'exemple hors des fournées", () => {
    // Un exemple n'est pas une fournée : son numéro ne désigne rien et ses mix
    // sont factices. Servi, son flux serait un canal vide — un 404 est plus
    // honnête.
    const dossier = mkdtempSync(join(tmpdir(), 'fournees-'));
    try {
      writeFileSync(join(dossier, '2026-hiver.md'), fichier(VALIDE));
      writeFileSync(join(dossier, 'exemple-tall.md'), fichier(VALIDE));
      writeFileSync(join(dossier, 'exemple-large.md'), fichier(VALIDE));

      expect(readFournees(dossier)).toHaveLength(1);
    } finally {
      rmSync(dossier, { recursive: true, force: true });
    }
  });

  it('rend une liste vide quand le dossier est absent, sans jeter', () => {
    // C'est l'état d'un déploiement qui n'a pas encore emporté le dossier : les
    // trois autres flux doivent continuer de servir.
    expect(readFournees(resolve(DOSSIER_DU_DEPOT, 'nulle-part'))).toEqual([]);
  });
});
