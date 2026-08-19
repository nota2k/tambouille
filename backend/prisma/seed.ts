/**
 * La Tambouille de démonstration.
 *
 * Ce que ce script existe pour empêcher : un aperçu de proposition de fusion
 * qui se déploie, s'affiche, et ne montre rien. Les vues les plus travaillées
 * du dépôt sont des listes de mixes et des pages de profil ; sur une base
 * vierge elles se rendent toutes dans leur état vide, c'est-à-dire dans le seul
 * état que personne ne cherche à relire.
 *
 * ── D'OÙ VIENNENT LES DONNÉES ───────────────────────────────────────────────
 *
 * Des fixtures déjà présentes au dépôt pour les tests d'importeurs, passées aux
 * fonctions d'analyse que ces importeurs exportent — `parseFeed`,
 * `parseEmissionPage`, `parseArchiveItem`. Elles sont pures : elles prennent
 * une charge utile et rendent des objets, sans réseau. Le peuplement ne dépend
 * donc d'aucun site tiers debout, et il rend le même site à chaque exécution.
 *
 * On ne passe PAS par les classes d'importeurs : leur `resolve` / `importItem`
 * commence par un `safeFetch`. La correspondance entre ce qu'une source dit et
 * ce qu'un mix porte est donc refaite ici, en quelques lignes par source. C'est
 * la seule duplication, elle est petite, et elle évite de remanier des
 * importeurs qui fonctionnent.
 *
 * ── CE QUI EST INVENTÉ ──────────────────────────────────────────────────────
 *
 * Les mixes viennent de vraies sources. Les gens, non : sur dix modèles, les
 * fixtures n'en couvrent que deux (`Mix`, `TracklistEntry`). Les comptes, les
 * abonnements, les favoris, les commentaires et les playlists sont écrits à la
 * main plus bas — et ils comptent autant que les mixes, parce que
 * `DiscoverView`, `MixDetailView`, `ProfileView`, `NavBar`, `CommentsSection`,
 * `AddToPlaylistButton` et `UploaderCard` branchent toutes sur la session et
 * sur ces relations. Sans eux l'aperçu montre une moitié de chaque écran.
 *
 * ── IDEMPOTENT ──────────────────────────────────────────────────────────────
 *
 * Rejoué sur une base qu'il a déjà peuplée, il rend le même site. Chaque
 * création est précédée d'une recherche sur une clé stable : l'adresse pour un
 * compte, `sourceRef` pour un mix, la contrainte d'unicité pour les relations.
 * Ce n'est pas du confort : la base d'aperçu est jetable, le script est rejoué
 * à chaque déploiement, et un script qui empile des doublons rend un site qui
 * ne ressemble à rien au bout de trois passages.
 *
 * ── CE QU'IL N'EST PAS ──────────────────────────────────────────────────────
 *
 * Il ne s'exécute jamais sur la production. Rien ici ne le garantit — c'est la
 * chaîne de connexion qu'on lui donne qui décide. Voir la tâche `apercu` du
 * workflow, qui est le seul appelant prévu.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthService } from '../src/auth/auth.service';
import { MixesService } from '../src/mixes/mixes.service';
import { CoverImportService } from '../src/mixes/cover-import.service';
import { parseFeed } from '../src/imports/podcast.importer';
import { parseEmissionPage } from '../src/imports/ouiedire.importer';
import { parseArchiveItem } from '../src/imports/archive.importer';
import { decodeRef } from '../src/imports/source-importer';

/**
 * Les fixtures sont des `.xml` et des `.json` : `nest build` ne les recopie pas
 * dans `dist`. Ce script s'exécutant compilé (voir `prisma.config.ts`),
 * `__dirname` vaut `dist/prisma` et non `prisma` — d'où les deux candidats,
 * essayés dans cet ordre. Nommer les deux plutôt que d'en déduire un par un
 * calcul de remontée : le calcul se casse en silence si l'arborescence bouge,
 * la liste échoue en nommant ce qu'elle a cherché.
 */
const CANDIDATS = [
  join(__dirname, '..', 'src', 'imports', '__fixtures__'),
  join(__dirname, '..', '..', 'src', 'imports', '__fixtures__'),
];

const FIXTURES = CANDIDATS.find((chemin) => existsSync(chemin));
if (!FIXTURES) {
  throw new Error(
    `Fixtures introuvables. Cherchées dans :\n  ${CANDIDATS.join('\n  ')}`,
  );
}

const fixture = (name: string) => readFileSync(join(FIXTURES, name), 'utf8');

/** Ce qu'il faut savoir d'un mix pour le créer, quelle que soit sa source. */
interface Graine {
  title: string;
  description?: string;
  artist?: string;
  tags: string[];
  durationSec?: number;
  coverSourceUrl?: string;
  sourceRef: string;
  tracklist: { artist: string; title: string; timecodeSec: number }[];
}

// ── Les sources ─────────────────────────────────────────────────────────────

/**
 * Le flux Ouïedire gelé : 25 épisodes, avec descriptions et durées. C'est le
 * gros du contenu, et la raison pour laquelle la page d'accueil a de quoi
 * paginer.
 */
function depuisLeFlux(): Graine[] {
  const feed = parseFeed(fixture('podcast-feed.xml'));
  const auteur = feed.channelAuthor ?? feed.channelTitle;
  return feed.items.map((entry) => ({
    title: entry.title,
    description: entry.description,
    artist: auteur,
    tags: auteur ? [auteur, 'radio'] : ['radio'],
    durationSec: entry.durationSec,
    coverSourceUrl: entry.imageUrl ?? feed.channelImage,
    sourceRef: entry.audioUrl,
    tracklist: [],
  }));
}

/**
 * Les deux pages d'émission gelées. Elles sont peu nombreuses mais ce sont les
 * seules qui portent une tracklist minutée — donc les seules qui rendent
 * `MixDetailView` dans son état complet, et les seules sur lesquelles un
 * commentaire horodaté a un sens.
 */
function depuisLesEmissions(): Graine[] {
  return ['ouiedire-emission.html', 'ouiedire-emission-mp3-only.html'].map(
    (nom) => {
      const emission = parseEmissionPage(fixture(nom));
      return {
        title: emission.title,
        description: `Émission publiée par Ouïedire.`,
        artist: emission.author,
        tags: emission.author ? [emission.author, 'ouiedire'] : ['ouiedire'],
        coverSourceUrl: emission.coverUrl,
        sourceRef: emission.audioUrl,
        tracklist: emission.tracklist,
      };
    },
  );
}

/**
 * L'item Archive.org gelé : 16 pistes une fois les formats regroupés, chacune
 * avec sa durée réelle. C'est ce qui allume « 1 h 12 · 18 morceaux » dans le
 * fil, et ce qui permet de voir une grille où toutes les cartes ne se
 * ressemblent pas.
 *
 * L'adresse de téléchargement est reconstruite ici : `parseArchiveItem` rend
 * une référence opaque (`archive:<identifiant>/<fichier>`) et le constructeur
 * d'URL n'est pas exporté. Deux lignes, plutôt que d'élargir la surface
 * publique d'un importeur pour les besoins d'un script de démonstration.
 */
function depuisArchive(): Graine[] {
  const payload: unknown = JSON.parse(fixture('archive-item.json'));
  // L'identifiant réel de l'item gelé, et non un nom inventé : c'est lui qui
  // compose les adresses de téléchargement et celle de la pochette. Un
  // identifiant de fantaisie donnerait 43 mixes pointant tous vers du vide,
  // c'est-à-dire un aperçu où rien ne se lit ni ne s'affiche.
  const identifiant = 'shakedownstreet2024-08-30.akg481.flac';
  return parseArchiveItem(identifiant, payload).map((item) => {
    const { value } = decodeRef(item.ref);
    const barre = value.indexOf('/');
    const fichier = value.slice(barre + 1);
    return {
      title: item.title,
      description: undefined,
      artist: undefined,
      tags: ['archive', 'live'],
      durationSec: item.durationSec,
      coverSourceUrl: item.coverUrl,
      sourceRef: `https://archive.org/download/${encodeURIComponent(
        identifiant,
      )}/${encodeURIComponent(fichier)}`,
      tracklist: [],
    };
  });
}

// ── Les gens ────────────────────────────────────────────────────────────────

/**
 * Quatre comptes, tous joignables par mot de passe.
 *
 * C'est délibéré et c'est la pièce qui fait tenir tout l'aperçu : Google
 * n'accepte pas de joker dans ses adresses de redirection et le realm Keycloak
 * vit hors du dépôt, donc aucun fournisseur tiers ne reconnaîtra jamais
 * l'adresse de l'aperçu. L'authentification locale, elle, ne demande la
 * permission de personne — un relecteur se connecte avec l'un de ces comptes et
 * voit les écrans qui exigent une session.
 *
 * Les adresses sont en `.invalid`, un domaine que la RFC 2606 réserve
 * précisément pour ça : aucune ne peut recevoir de courrier, y compris par
 * accident.
 */
const COMPTES = [
  {
    email: 'nelly@apercu.invalid',
    username: 'nelly',
    displayName: 'Nelly Kadoc',
    bio: 'Programme la nuit du jeudi. Ne classe rien, retrouve tout.',
  },
  {
    email: 'bruno@apercu.invalid',
    username: 'bruno',
    displayName: 'Bruno Tesson',
    bio: 'Collectionne les fins de sets.',
  },
  {
    email: 'zoe@apercu.invalid',
    username: 'zoe',
    displayName: 'Zoé Marchand',
    bio: null,
  },
  {
    email: 'radio@apercu.invalid',
    username: 'radiotambouille',
    displayName: 'Radio Tambouille',
    bio: 'Le compte qui héberge les rediffusions.',
  },
] as const;

/** Le même pour tous : l'aperçu est public, et il n'y a rien derrière à voler. */
const MOT_DE_PASSE = 'apercu-tambouille';

const COMMENTAIRES = [
  { par: 'bruno', corps: 'La transition à la moitié, quand même.' },
  {
    par: 'zoe',
    corps: "Je cherchais ce set depuis des mois. Merci de l'avoir remonté.",
  },
  { par: 'nelly', corps: 'Passé trois fois cette semaine.' },
] as const;

const REPONSE = {
  par: 'nelly',
  corps: 'Elle est de la version longue, pas de la diffusion.',
} as const;

const PLAYLISTS = [
  {
    par: 'nelly',
    titre: 'Pour les trajets longs',
    description: 'Rien sous vingt minutes.',
    prend: 6,
  },
  {
    par: 'bruno',
    titre: 'À réécouter au casque',
    description: null,
    prend: 4,
  },
] as const;

/**
 * La pochette d'un item Archive.org appartient à l'item, pas à la piste : les
 * seize mixes tirés du même concert citent la même image. Sans cette mémoire,
 * le peuplement la téléchargerait et la téléverserait seize fois — et, quand
 * elle est injoignable, échouerait seize fois à la suite pour l'apprendre.
 */
const pochettesVues = new Map<string, string | undefined>();

async function pochette(
  covers: CoverImportService,
  source: string,
): Promise<string | undefined> {
  if (pochettesVues.has(source)) return pochettesVues.get(source);
  const cle = (await covers.importFromUrl(source)) ?? undefined;
  pochettesVues.set(source, cle);
  return cle;
}

// ── Le peuplement ───────────────────────────────────────────────────────────

async function main() {
  const logger = new Logger('seed');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['warn', 'error'],
  });

  try {
    const prisma = app.get(PrismaService);
    const auth = app.get(AuthService);
    const mixes = app.get(MixesService);
    const covers = app.get(CoverImportService);

    // ── Les comptes ────────────────────────────────────────────────────────
    const parNom = new Map<string, string>();
    for (const compte of COMPTES) {
      const existant = await prisma.user.findUnique({
        where: { email: compte.email },
      });
      if (existant) {
        parNom.set(compte.username, existant.id);
        continue;
      }
      // `register` plutôt qu'un `prisma.user.create` : c'est lui qui hache le
      // mot de passe et qui refuse un pseudonyme déjà pris à la casse près. Un
      // compte semé à la main serait un compte sur lequel on ne peut pas se
      // connecter, ce qui est exactement ce qu'on vient chercher.
      await auth.register({
        email: compte.email,
        username: compte.username,
        password: MOT_DE_PASSE,
        displayName: compte.displayName,
      });
      const cree = await prisma.user.findUniqueOrThrow({
        where: { email: compte.email },
      });
      if (compte.bio) {
        await prisma.user.update({
          where: { id: cree.id },
          data: { bio: compte.bio },
        });
      }
      parNom.set(compte.username, cree.id);
    }
    logger.log(`${parNom.size} comptes`);

    // ── Les mixes ──────────────────────────────────────────────────────────
    const graines = [
      ...depuisLeFlux(),
      ...depuisLesEmissions(),
      ...depuisArchive(),
    ];
    const proprietaires = [...parNom.values()];
    const idsDesMixes: string[] = [];
    let crees = 0;

    for (const [rang, graine] of graines.entries()) {
      const deja = await prisma.mix.findFirst({
        where: { sourceRef: graine.sourceRef },
        select: { id: true },
      });
      if (deja) {
        idsDesMixes.push(deja.id);
        continue;
      }

      // Best-effort, comme à l'import : `importFromUrl` rend `null` si l'image
      // est injoignable, et le mix se crée quand même. C'est ce qui permet au
      // peuplement d'aboutir sans réseau — avec des pochettes en moins, ce qui
      // est visiblement dégradé plutôt que silencieusement faux.
      const coverUrl = graine.coverSourceUrl
        ? await pochette(covers, graine.coverSourceUrl)
        : undefined;

      const mix = await mixes.create(
        proprietaires[rang % proprietaires.length]!,
        {
          title: graine.title.slice(0, 120),
          description: graine.description?.slice(0, 2000),
          artist: graine.artist?.slice(0, 120),
          tags: graine.tags.join(','),
          durationSec: graine.durationSec,
          sourceType: 'remote',
          sourceRef: graine.sourceRef,
          tracklist: JSON.stringify(graine.tracklist),
        },
        { coverUrl },
      );
      idsDesMixes.push(mix.id);
      crees += 1;
    }
    logger.log(`${idsDesMixes.length} mixes (${crees} créés à ce passage)`);

    // ── Les abonnements ────────────────────────────────────────────────────
    // Tout le monde suit la radio ; Nelly et Bruno se suivent l'un l'autre.
    // Assez pour que `ProfileView` et `UserConnectionsView` aient de quoi se
    // rendre des deux côtés, abonnés comme abonnements.
    const radio = parNom.get('radiotambouille')!;
    const abonnements = [
      ...['nelly', 'bruno', 'zoe'].map((nom) => ({
        followerId: parNom.get(nom)!,
        followingId: radio,
      })),
      { followerId: parNom.get('nelly')!, followingId: parNom.get('bruno')! },
      { followerId: parNom.get('bruno')!, followingId: parNom.get('nelly')! },
      { followerId: parNom.get('zoe')!, followingId: parNom.get('nelly')! },
    ];
    await prisma.follow.createMany({
      data: abonnements,
      skipDuplicates: true,
    });

    // ── Favoris et écoutes ─────────────────────────────────────────────────
    // Un mix sur trois pour Nelly, un sur cinq pour Bruno : les décomptes
    // affichés diffèrent d'une carte à l'autre, ce qu'un motif uniforme ne
    // montrerait pas.
    const favoris = idsDesMixes.flatMap((mixId, rang) => [
      ...(rang % 3 === 0 ? [{ userId: parNom.get('nelly')!, mixId }] : []),
      ...(rang % 5 === 0 ? [{ userId: parNom.get('bruno')!, mixId }] : []),
    ]);
    await prisma.favorite.createMany({ data: favoris, skipDuplicates: true });

    const ecoutes = idsDesMixes.slice(0, 8).map((mixId) => ({
      userId: parNom.get('zoe')!,
      mixId,
    }));
    await prisma.playHistory.createMany({
      data: ecoutes,
      skipDuplicates: true,
    });

    // ── Les commentaires ───────────────────────────────────────────────────
    // Sur les trois premiers mixes, dont une réponse : `CommentItem` a un
    // rendu distinct pour une réponse, et il ne se voit pas sur un fil plat.
    //
    // `Comment` n'a pas de contrainte d'unicité qui puisse porter
    // l'idempotence — on cherche donc le triplet exact avant d'écrire.
    for (const [rang, commentaire] of COMMENTAIRES.entries()) {
      const mixId = idsDesMixes[rang];
      if (!mixId) break;
      const userId = parNom.get(commentaire.par)!;
      const deja = await prisma.comment.findFirst({
        where: { mixId, userId, body: commentaire.corps },
        select: { id: true },
      });
      const parent =
        deja ??
        (await prisma.comment.create({
          data: { mixId, userId, body: commentaire.corps },
        }));

      if (rang === 0) {
        const repondu = await prisma.comment.findFirst({
          where: { parentId: parent.id, body: REPONSE.corps },
        });
        if (!repondu) {
          await prisma.comment.create({
            data: {
              mixId,
              userId: parNom.get(REPONSE.par)!,
              body: REPONSE.corps,
              parentId: parent.id,
            },
          });
        }
      }
    }

    // ── Les playlists ──────────────────────────────────────────────────────
    for (const playlist of PLAYLISTS) {
      const userId = parNom.get(playlist.par)!;
      const deja = await prisma.playlist.findFirst({
        where: { userId, title: playlist.titre },
        select: { id: true },
      });
      const id =
        deja?.id ??
        (
          await prisma.playlist.create({
            data: {
              userId,
              title: playlist.titre,
              description: playlist.description,
            },
          })
        ).id;

      await prisma.playlistItem.createMany({
        data: idsDesMixes.slice(0, playlist.prend).map((mixId, position) => ({
          playlistId: id,
          mixId,
          position,
        })),
        skipDuplicates: true,
      });
    }

    logger.log('peuplement terminé');
  } finally {
    await app.close();
  }
}

main().catch((erreur) => {
  console.error(erreur);
  process.exit(1);
});
