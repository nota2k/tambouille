import { randomBytes } from 'node:crypto';
import { ConflictException, Injectable } from '@nestjs/common';
import { FlarumClient } from '../imports/flarum.client';
import { PrismaService } from '../prisma/prisma.service';

/** Passé ce délai, un jeton non retrouvé est considéré mort : le membre doit
 *  en redemander un plutôt que de laisser traîner une preuve qui pourrait
 *  finir par correspondre à un message publié par hasard bien plus tard. */
export const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

// L'erreur Prisma de contrainte unique. Même vérification que dans
// `users.service.ts` — dupliquée plutôt que partagée pour ce seul petit
// contrôle, contre des mocks de test qui ne sont pas de vraies instances
// `PrismaClientKnownRequestError`.
function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

// Retire les balises HTML et normalise les espaces, pour comparer le TEXTE
// que le membre a réellement publié — pas le HTML dans lequel le forum
// l'a enveloppé.
function texteRendu(contentHtml: string): string {
  return contentHtml
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Preuve de possession d'un compte du forum Musiques Incongrues : le membre
 * publie un jeton court quelque part sur le forum, puis revient le faire
 * chercher dans ses messages récents. C'est cette preuve, et non la simple
 * saisie d'un pseudo, qui autorise ensuite la synchronisation.
 */
@Injectable()
export class IncongruesVerificationService {
  constructor(
    private readonly flarum: FlarumClient,
    private readonly prisma: PrismaService,
  ) {}

  async demanderJeton(
    userId: string,
    incongruesUsername: string,
  ): Promise<{ token: string }> {
    const pseudo = incongruesUsername.trim();
    // Court pour rester recopiable à la main sur le forum ; il n'a pas à
    // résister à une attaque, le retrouver ne prouve rien de plus que la
    // capacité à publier sous ce pseudo.
    const token = `tambouille-${randomBytes(3).toString('hex')}`;

    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          incongruesUsername: pseudo,
          incongruesToken: token,
          incongruesTokenAt: new Date(),
          // La preuve précédente ne vaut plus pour un nouveau pseudo.
          incongruesVerifiedAt: null,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Ce pseudo Musiques Incongrues est déjà lié à un autre compte',
        );
      }
      throw error;
    }

    return { token };
  }

  async verifier(
    userId: string,
  ): Promise<{ verifie: boolean; raison?: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (!user.incongruesUsername || !user.incongruesToken) {
      return {
        verifie: false,
        raison: 'Aucune demande de vérification en cours pour ce compte',
      };
    }

    // L'expiration se contrôle avant tout appel réseau : rien ne sert
    // d'interroger le forum pour un jeton dont on sait déjà qu'il est mort.
    const emisLe = user.incongruesTokenAt?.getTime() ?? 0;
    if (Date.now() - emisLe > TOKEN_TTL_MS) {
      return {
        verifie: false,
        raison: 'Le jeton a expiré, redemandez-en un nouveau',
      };
    }

    const messages = await this.flarum.listPostsByAuthor(
      user.incongruesUsername,
    );
    const jeton = user.incongruesToken.toLowerCase();
    const trouve = messages.some((message) =>
      texteRendu(message.contentHtml).includes(jeton),
    );

    if (!trouve) {
      return {
        verifie: false,
        raison: 'Jeton pas trouvé dans vos messages récents sur le forum',
      };
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        incongruesVerifiedAt: new Date(),
        // Consommé : le garder ferait croire à une vérification en attente.
        incongruesToken: null,
      },
    });

    return { verifie: true };
  }
}
