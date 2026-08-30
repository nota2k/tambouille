import { randomBytes } from 'node:crypto';
import { ConflictException, Injectable } from '@nestjs/common';
import { FlarumClient } from '../imports/flarum.client';
import { PrismaService } from '../prisma/prisma.service';

/** Passé ce délai, un jeton non retrouvé est considéré mort : le membre doit
 *  en redemander un plutôt que de laisser traîner une preuve qui pourrait
 *  finir par correspondre à un message publié par hasard bien plus tard. */
export const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/** `verifier` est le seul chemin sortant du dispositif qu'un membre déclenche
 *  à volonté : sans délai, boucler dessus ferait marteler l'API du forum
 *  depuis l'IP de Tambouille, et c'est Tambouille qui se ferait bannir. Le
 *  membre légitime clique une fois, quelques dizaines de secondes ne lui
 *  coûtent rien. Même motif que `DEBOUNCE_MS` dans `IncongruesSyncService`,
 *  mais par compte : un membre ne doit pas pouvoir bloquer les autres. */
export const VERIFY_DEBOUNCE_MS = 30_000;

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
//
// Les blocs cités partent AVANT : Flarum recopie le texte du message cité
// dans le `contentHtml` du citateur, si bien que citer une preuve reviendrait
// à en porter une.
function texteRendu(contentHtml: string): string {
  return contentHtml
    .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, ' ')
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
  /** Dernier appel sortant par compte, pour l'anti-rebond de `verifier`. En
   *  mémoire, comme les horodatages de `IncongruesSyncService` : la garde ne
   *  protège que le forum, la perdre au redémarrage est sans conséquence. */
  private readonly dernierEssai = new Map<string, number>();

  constructor(
    private readonly flarum: FlarumClient,
    private readonly prisma: PrismaService,
  ) {}

  async demanderJeton(
    userId: string,
    incongruesUsername: string,
  ): Promise<{ token: string }> {
    const pseudo = incongruesUsername.trim();
    // Assez court pour rester recopiable à la main sur le forum, assez large
    // pour qu'un attaquant ne puisse pas viser : l'écran annonce que le
    // message-preuve pourra être supprimé, donc en pratique ces messages
    // restent en ligne. Émettre un jeton ne coûte qu'un `UPDATE` : avec trois
    // octets, boucler jusqu'à retomber sur un jeton DÉJÀ publié par l'ancien
    // titulaire d'un pseudo libéré était à portée. 48 bits ne le sont pas.
    const token = `tambouille-${randomBytes(6).toString('hex')}`;

    try {
      await this.poser(userId, pseudo, token);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        // Une revendication jamais prouvée ne doit pas verrouiller un pseudo
        // à vie : sans cette reprise, réserver trente pseudos sans jamais les
        // prouver condamnait leurs vrais titulaires à un 409 définitif.
        // `updateMany` conditionné sur les deux colonnes plutôt qu'un
        // lire-puis-écrire : c'est la condition elle-même qui reste juste
        // sous concurrence.
        const { count } = await this.prisma.user.updateMany({
          where: {
            incongruesUsername: pseudo,
            incongruesVerifiedAt: null,
            incongruesTokenAt: { lt: new Date(Date.now() - TOKEN_TTL_MS) },
          },
          data: {
            incongruesUsername: null,
            incongruesToken: null,
            incongruesTokenAt: null,
          },
        });
        if (count === 0) {
          throw new ConflictException(
            'Ce pseudo Musiques Incongrues est déjà lié à un autre compte',
          );
        }
        await this.poser(userId, pseudo, token);
      } else {
        throw error;
      }
    }

    return { token };
  }

  private async poser(
    userId: string,
    pseudo: string,
    token: string,
  ): Promise<void> {
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

    // L'anti-rebond se place juste avant l'appel sortant, et après les refus
    // qui n'en déclenchent aucun : sinon un jeton expiré consommerait le
    // délai du membre sans qu'une seule requête soit partie.
    const maintenant = Date.now();
    const precedent = this.dernierEssai.get(userId) ?? 0;
    if (maintenant - precedent < VERIFY_DEBOUNCE_MS) {
      return {
        verifie: false,
        raison:
          'Vérification déjà tentée à l’instant, patientez une trentaine de secondes avant de réessayer',
      };
    }
    this.dernierEssai.set(userId, maintenant);

    const messages = await this.flarum.listPostsByAuthor(
      user.incongruesUsername,
    );
    const jeton = user.incongruesToken.toLowerCase();
    const revendique = user.incongruesUsername.toLowerCase();
    const trouve = messages.some(
      (message) =>
        // L'auteur est contrôlé ICI, pas délégué à `filter[author]` : ce
        // filtre accepte une liste séparée par des virgules, et la décision
        // d'autorisation ne doit pas reposer sur la sémantique d'un filtre
        // distant que le forum peut changer.
        message.authorUsername?.toLowerCase() === revendique &&
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

  /** Vide le lien, vérifié ou non. Sans ce chemin, un membre resterait
   *  prisonnier d'un pseudo mal saisi ou d'une vérification qu'il ne veut
   *  plus maintenir — se délier n'est jamais une revendication, donc rien
   *  ici ne repasse par la garde de `demanderJeton`. */
  async delier(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        incongruesUsername: null,
        incongruesToken: null,
        incongruesTokenAt: null,
        incongruesVerifiedAt: null,
      },
    });
  }
}
