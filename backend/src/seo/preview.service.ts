import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  audioSourceFor,
  publicMediaUrl,
  type MediaBases,
} from '../common/audio-source';
import {
  previewDescription,
  SITE_NAME,
  type PreviewPage,
} from './preview.builder';

export interface PreviewContext {
  bases: MediaBases;
  /** La base du site public : les liens partagés doivent y ramener. */
  site: string;
}

/**
 * Le crédit d'un mix — l'artiste s'il est connu, sinon le compte.
 *
 * Même règle que `mixCredit` côté frontend, à ceci près qu'on n'a besoin ici
 * que du nom mis en avant. Les deux doivent répondre pareil : un aperçu qui
 * annonce un autre nom que la page vers laquelle il mène se lit comme une
 * erreur.
 */
function credit(artist: string | null, displayName: string): string {
  const artiste = artist?.trim();
  if (!artiste) return displayName;
  return artiste.toLowerCase() === displayName.trim().toLowerCase()
    ? displayName
    : artiste;
}

@Injectable()
export class PreviewService {
  constructor(private readonly prisma: PrismaService) {}

  async mix(id: string, context: PreviewContext): Promise<PreviewPage> {
    const mix = await this.prisma.mix.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        artist: true,
        coverUrl: true,
        durationSec: true,
        createdAt: true,
        audioUrl: true,
        sourceType: true,
        sourceRef: true,
        tags: true,
        user: { select: { displayName: true } },
      },
    });
    if (!mix) throw new NotFoundException('Mix not found');

    const auteur = credit(mix.artist, mix.user.displayName);
    const url = `${context.site}/mixes/${mix.id}`;
    const image = mix.coverUrl
      ? publicMediaUrl(mix.coverUrl, context.bases)
      : null;

    return {
      title: `${mix.title} par ${auteur}`,
      description: previewDescription(
        mix.description,
        `${mix.title}, un mix de ${auteur} à écouter sur ${SITE_NAME}`,
      ),
      canonical: url,
      image,
      type: 'music.song',
      // Un fichier jouable donne à Discord et à Telegram de quoi lire le mix
      // dans la conversation. Les mix Mixcloud n'en ont pas : `audioSourceFor`
      // répond null, et la balise est simplement omise.
      audio: audioSourceFor(mix, context.bases),
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'MusicRecording',
        name: mix.title,
        url,
        byArtist: { '@type': 'MusicGroup', name: auteur },
        datePublished: mix.createdAt.toISOString(),
        ...(mix.description ? { description: mix.description } : {}),
        ...(image ? { image } : {}),
        ...(mix.tags.length ? { genre: mix.tags } : {}),
      },
    };
  }

  async user(username: string, context: PreviewContext): Promise<PreviewPage> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        _count: { select: { mixes: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const url = `${context.site}/users/${encodeURIComponent(username)}`;
    const image = user.avatarUrl
      ? publicMediaUrl(user.avatarUrl, context.bases)
      : null;
    const mixes = user._count.mixes;

    return {
      title: user.displayName,
      description: previewDescription(
        user.bio,
        `Les mix de ${user.displayName} sur ${SITE_NAME}` +
          (mixes ? ` — ${mixes} mix publiés.` : '.'),
      ),
      canonical: url,
      image,
      type: 'profile',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        mainEntity: {
          '@type': 'Person',
          name: user.displayName,
          alternateName: user.username,
          url,
          ...(user.bio ? { description: user.bio } : {}),
          ...(image ? { image } : {}),
        },
      },
    };
  }

  async playlist(id: string, context: PreviewContext): Promise<PreviewPage> {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        user: { select: { displayName: true } },
        _count: { select: { items: true } },
        // La première pochette disponible sert de vignette, comme la mosaïque
        // du site : `take` ne suffit pas, un mix sans pochette occuperait la
        // place.
        items: {
          where: { mix: { coverUrl: { not: null } } },
          orderBy: { position: 'asc' },
          take: 1,
          select: { mix: { select: { coverUrl: true } } },
        },
      },
    });
    if (!playlist) throw new NotFoundException('Playlist not found');

    const url = `${context.site}/playlists/${playlist.id}`;
    const cover = playlist.items[0]?.mix.coverUrl;
    const count = playlist._count.items;

    return {
      // Une virgule et non un tiret : le suffixe du site en pose déjà un.
      title: `${playlist.title}, une playlist de ${playlist.user.displayName}`,
      description: previewDescription(
        playlist.description,
        `Une playlist de ${playlist.user.displayName} sur ${SITE_NAME}, ${count} mix à écouter.`,
      ),
      canonical: url,
      image: cover ? publicMediaUrl(cover, context.bases) : null,
      type: 'music.playlist',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'MusicPlaylist',
        name: playlist.title,
        url,
        numTracks: count,
        ...(playlist.description ? { description: playlist.description } : {}),
        author: { '@type': 'Person', name: playlist.user.displayName },
      },
    };
  }
}
