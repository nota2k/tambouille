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
 * Les deux noms d'un mix : celui qui l'a fait, et celui qui l'a déposé.
 *
 * Mêmes règles que `mixCredit` côté frontend, et le même résultat en deux
 * parties plutôt qu'une. Les deux doivent répondre pareil : un aperçu qui
 * annonce un autre nom que la page vers laquelle il mène se lit comme une
 * erreur.
 *
 * `secondaire` est null dans deux cas très différents mais rendus pareil : pas
 * d'artiste, ou un artiste qui EST le compte. Le second évite « Nelly Babillon,
 * dégoté par Nelly Babillon » quand quelqu'un dépose son propre mix.
 */
function credit(
  artist: string | null,
  displayName: string,
): { principal: string; secondaire: string | null } {
  const artiste = artist?.trim();
  if (!artiste) return { principal: displayName, secondaire: null };

  const memePersonne =
    artiste.toLowerCase() === displayName.trim().toLowerCase();
  return memePersonne
    ? { principal: displayName, secondaire: null }
    : { principal: artiste, secondaire: displayName };
}

/**
 * Ce qu'un mix sélectionne pour son aperçu.
 *
 * Nommé plutôt qu'écrit deux fois : les deux façons d'atteindre un mix — par
 * son identifiant, par son couple compte/slug — construisent la MÊME page, et
 * un champ oublié d'un côté produirait deux aperçus différents pour la même
 * adresse.
 */
const CHAMPS_DU_MIX = {
  id: true,
  title: true,
  slug: true,
  description: true,
  artist: true,
  coverUrl: true,
  durationSec: true,
  createdAt: true,
  audioUrl: true,
  sourceType: true,
  sourceRef: true,
  tags: true,
  user: { select: { displayName: true, username: true } },
} as const;

@Injectable()
export class PreviewService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Un mix par son couple compte/slug, l'adresse canonique.
   *
   * L'username est comparé sans égard à la casse, comme partout ailleurs où il
   * est lu depuis une URL — voir `MixesService.findBySlug`, qui sert la même
   * adresse au navigateur.
   */
  async mixBySlug(
    username: string,
    slug: string,
    context: PreviewContext,
  ): Promise<PreviewPage> {
    const mix = await this.prisma.mix.findFirst({
      where: {
        slug,
        user: { username: { equals: username, mode: 'insensitive' } },
      },
      select: CHAMPS_DU_MIX,
    });
    if (!mix) throw new NotFoundException('Mix not found');
    return this.pagePourMix(mix, context);
  }

  /**
   * Un mix par son identifiant seul : l'ancienne adresse `/mixes/<id>`.
   *
   * Elle a été partagée avant que l'adresse ne porte le compte, et ces liens-là
   * continuent de circuler. Ils produisent le même aperçu — dont la canonique
   * est l'adresse à deux segments, puisque c'est celle vers laquelle le site
   * réécrit de toute façon.
   */
  async mix(id: string, context: PreviewContext): Promise<PreviewPage> {
    const mix = await this.prisma.mix.findUnique({
      where: { id },
      select: CHAMPS_DU_MIX,
    });
    if (!mix) throw new NotFoundException('Mix not found');
    return this.pagePourMix(mix, context);
  }

  private pagePourMix(
    mix: {
      id: string;
      title: string;
      slug: string;
      description: string | null;
      artist: string | null;
      coverUrl: string | null;
      createdAt: Date;
      audioUrl: string | null;
      sourceType: string | null;
      sourceRef: string | null;
      tags: string[];
      user: { displayName: string; username: string | null };
    },
    context: PreviewContext,
  ): PreviewPage {
    const { principal, secondaire } = credit(mix.artist, mix.user.displayName);

    /*
     * L'ancienne adresse quand le compte n'a pas encore d'username.
     *
     * Il est nullable en base : un compte créé par Google n'en a pas tant qu'il
     * n'en a pas choisi un. Le cas ne devrait pas se produire — le routeur
     * détourne un tel compte vers `/bienvenue` avant qu'il ne puisse déposer
     * quoi que ce soit — mais une canonique construite sur `null` donnerait
     * `/mixes/null/<slug>`, qui ne résout pas. `/mixes/<id>` résout toujours,
     * et le site la réécrit lui-même une fois le mix chargé.
     */
    const url = mix.user.username
      ? `${context.site}/mixes/${encodeURIComponent(mix.user.username)}/${encodeURIComponent(mix.slug)}`
      : `${context.site}/mixes/${mix.id}`;
    const image = mix.coverUrl
      ? publicMediaUrl(mix.coverUrl, context.bases)
      : null;

    /*
     * Les DEUX noms dans le titre quand ils diffèrent, et c'est délibéré.
     *
     * L'aperçu n'a qu'un titre, une ligne de description et une image — et la
     * description est celle du mix dès qu'il en a une, donc on ne peut pas
     * compter sur elle pour porter le compte. Un mix importé annoncerait alors
     * son artiste et rien du membre qui l'a déposé, ce qui est précisément le
     * lien qu'un partage devrait faire connaître.
     *
     * « Dégoté par » est le mot de la page du mix, pas un synonyme inventé
     * pour l'occasion : l'aperçu et la page doivent se lire pareil.
     */
    const titre = secondaire
      ? `${mix.title} par ${principal}, dégoté par ${secondaire}`
      : `${mix.title} par ${principal}`;

    return {
      title: titre,
      description: previewDescription(
        mix.description,
        `${mix.title}, un mix de ${principal} à écouter sur ${SITE_NAME}`,
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
        byArtist: { '@type': 'MusicGroup', name: principal },
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
