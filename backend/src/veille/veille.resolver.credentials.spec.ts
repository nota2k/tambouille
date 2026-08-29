import { BadRequestException } from '@nestjs/common';
import { canonicalUrl } from './veille.resolver';

// Fichier séparé de `veille.resolver.spec.ts` (déjà en cours de modification
// dans une autre session sur cette branche) plutôt que d'y ajouter ces cas :
// même sujet, un seul et même export testé, aucun besoin de partager le
// fichier pour ça.
describe('canonicalUrl — identifiants dans l’URL (P1)', () => {
  it('refuse une adresse qui porte des identifiants plutôt que de les retirer en douce', () => {
    // Même défaut que le port déjà corrigé : la chaîne rendue est celle qu'on
    // stocke et qu'on relit ensuite. Les retirer silencieusement ferait
    // pointer la source ailleurs que ce que l'utilisateur a collé.
    expect(() => canonicalUrl('https://user:pass@ouiedire.net/feed')).toThrow(
      BadRequestException,
    );
  });

  it('refuse aussi des identifiants sans mot de passe', () => {
    expect(() => canonicalUrl('https://user@ouiedire.net/feed')).toThrow(
      BadRequestException,
    );
  });

  it('le message explique pourquoi, en français', () => {
    try {
      canonicalUrl('https://user:pass@ouiedire.net/feed');
      throw new Error('aurait dû lever');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).message).toMatch(/identifiants/i);
    }
  });

  it('laisse passer une adresse sans identifiants', () => {
    expect(canonicalUrl('https://ouiedire.net/feed')).toBe(
      'https://ouiedire.net/feed',
    );
  });
});
