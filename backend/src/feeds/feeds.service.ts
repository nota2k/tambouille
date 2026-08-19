import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { publicMediaUrl } from '../common/audio-source';
import type { FeedContext } from './feed.context';
import {
  FEED_MIX_SELECT,
  NOTICE_LECTURE_SUR_LE_SITE,
  toFeedItem,
  type FeedMix,
} from './feed.items';
import type { FeedChannel } from './feed.types';
import { readFournees, type Fournee } from './fournees.reader';

/**
 * Un flux de podcast n'est pas une archive : passé quelques dizaines
 * d'épisodes, les clients tronquent d'eux-mêmes et la charge utile grossit pour
 * personne. Le site en compte des milliers.
 */
export const FEED_MAX_ITEMS = 50;

@Injectable()
export class FeedsService {
  constructor(private readonly prisma: PrismaService) {}

  async site(context: FeedContext): Promise<FeedChannel> {
    const mixes = await this.prisma.mix.findMany({
      select: FEED_MIX_SELECT,
      orderBy: { createdAt: 'desc' },
      take: FEED_MAX_ITEMS,
    });

    return this.channel(context, mixes, {
      title: 'Tambouille',
      description: 'Les derniers mix publiés sur Tambouille.',
      link: `${context.site}/`,
    });
  }

  async user(username: string, context: FeedContext): Promise<FeedChannel> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true, displayName: true, bio: true, avatarUrl: true },
    });
    // Un compte créé par un fournisseur d'identité garde `username: null`
    // jusqu'au choix d'un nom ; `findUnique` sur `username` ne peut de toute
    // façon pas le trouver, et il n'a pas encore de page publique.
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const mixes = await this.prisma.mix.findMany({
      where: { userId: user.id },
      select: FEED_MIX_SELECT,
      orderBy: { createdAt: 'desc' },
      take: FEED_MAX_ITEMS,
    });

    return this.channel(context, mixes, {
      title: `${user.displayName} sur Tambouille`,
      description: user.bio?.trim() || `Les mix de ${user.displayName}.`,
      link: `${context.site}/users/${username}`,
      // L'avatar est une clé d'objet, comme toute colonne média : un flux
      // n'admet que des URL absolues.
      imageUrl: user.avatarUrl && publicMediaUrl(user.avatarUrl, context.bases),
    });
  }

  async playlist(id: string, context: FeedContext): Promise<FeedChannel> {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id },
      select: {
        title: true,
        description: true,
        user: { select: { displayName: true } },
        items: {
          // L'ordre de la playlist, pas l'ordre chronologique : c'est ce que la
          // personne qui l'a composée a décidé.
          orderBy: { position: 'asc' },
          take: FEED_MAX_ITEMS,
          select: { mix: { select: FEED_MIX_SELECT } },
        },
      },
    });
    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    return this.channel(
      context,
      playlist.items.map((item) => item.mix),
      {
        title: playlist.title,
        description:
          playlist.description?.trim() ||
          `Une playlist de ${playlist.user.displayName}.`,
        link: `${context.site}/playlists/${id}`,
      },
    );
  }

  async fournee(numero: number, context: FeedContext): Promise<FeedChannel> {
    const fournee = this.findFournee(numero);

    const mixes = await this.prisma.mix.findMany({
      where: { id: { in: fournee.mixIds.slice(0, FEED_MAX_ITEMS) } },
      select: FEED_MIX_SELECT,
    });

    // `findMany` rend l'ordre de la base ; une fournée cite ses mix dans un
    // ordre voulu. Un identifiant qui ne résout plus — mix supprimé depuis —
    // disparaît simplement de la liste.
    const parId = new Map(mixes.map((mix) => [mix.id, mix]));
    const ordonnes = fournee.mixIds
      .map((id) => parId.get(id))
      .filter((mix): mix is (typeof mixes)[number] => mix !== undefined);

    return this.channel(context, ordonnes, {
      title: `La fournée n°${fournee.number} — ${fournee.title}`,
      description: [fournee.period, fournee.intro].filter(Boolean).join('\n\n'),
      // La fournée n'a pas de page à elle : elle s'affiche en bandeau d'accueil.
      link: `${context.site}/`,
    });
  }

  /**
   * Une fournée est servie quelle que soit sa fenêtre de publication : un
   * numéro périmé reste consultable, puisque des abonnés le détiennent.
   */
  private findFournee(numero: number): Fournee {
    let fournees: Fournee[];
    try {
      fournees = readFournees();
    } catch (error) {
      // Un fichier illisible est un défaut de contenu, pas une ressource
      // absente : le message nomme le fichier fautif plutôt que de laisser un
      // 404 faire croire à une fournée qui n'a jamais existé.
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'Fournée illisible',
      );
    }

    const fournee = fournees.find((candidate) => candidate.number === numero);
    if (!fournee) {
      throw new NotFoundException('Fournée not found');
    }
    return fournee;
  }

  /** L'assemblage commun : la notice tient dans un seul endroit. */
  private channel(
    context: FeedContext,
    mixes: FeedMix[],
    meta: {
      title: string;
      description: string;
      link: string;
      imageUrl?: string | null;
    },
  ): FeedChannel {
    return {
      title: meta.title,
      description: `${meta.description}\n\n${NOTICE_LECTURE_SUR_LE_SITE}`,
      link: meta.link,
      selfUrl: context.selfUrl,
      ...(meta.imageUrl && { imageUrl: meta.imageUrl }),
      items: mixes.map((mix) => toFeedItem(mix, context)),
    };
  }
}
