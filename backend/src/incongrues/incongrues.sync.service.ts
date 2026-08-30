import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { FlarumClient } from '../imports/flarum.client';
import { MusiquesIncongruesImporter } from '../imports/musiques-incongrues.importer';
import { MixesService } from '../mixes/mixes.service';
import { PrismaService } from '../prisma/prisma.service';
import { CACHE_TTL_MS } from '../veille/veille.types';

/** La route est publique et déclenche des appels sortants. Une sonnerie de
 *  plus dans la minute ne peut rien apporter que la précédente n'ait déjà vu. */
export const DEBOUNCE_MS = 60_000;

/** Le filet de rattrapage ne répare qu'un webhook perdu : il se mesure à
 *  l'heure, pas à la minute. Il pend à `findAll`, la route la plus visitée du
 *  site — à la cadence de l'anti-rebond, chaque minute de trafic vaudrait un
 *  passage complet sur le forum. On reprend le seuil de la veille plutôt que
 *  d'en écrire un second : c'est le même compromis, sur la même fraîcheur. */
export const RATTRAPAGE_MS = CACHE_TTL_MS;

@Injectable()
export class IncongruesSyncService {
  private readonly logger = new Logger(IncongruesSyncService.name);

  /** Une synchronisation en cours par compte. Sans ce verrou, deux appels
   *  simultanés franchiraient tous deux `findBySource` avant que l'un ait
   *  écrit, et deux mix identiques paraîtraient. Le projet n'a ni file
   *  d'attente ni `Throttler` : une promesse en mémoire suffit à cette
   *  échelle, et disparaît avec le processus, ce qui est sans conséquence —
   *  `findBySource` reste la vraie garantie. */
  private readonly enCours = new Map<string, Promise<number>>();

  // Deux horodatages distincts : partagés, le rattrapage horaire absorberait
  // la sonnerie du webhook, qui est justement ce qui doit passer devant.
  private dernierRattrapage = 0;
  private dernierPassageSonnerie = 0;

  constructor(
    private readonly flarum: FlarumClient,
    private readonly importeur: MusiquesIncongruesImporter,
    private readonly mixes: MixesService,
    private readonly prisma: PrismaService,
  ) {}

  async syncUser(userId: string, incongruesUsername: string): Promise<number> {
    const enCours = this.enCours.get(userId);
    if (enCours) return enCours;

    // La promesse doit être posée dans la Map AVANT tout `await` : sinon un
    // second appel concurrent la trouverait absente et franchirait, lui
    // aussi, l'appel réseau que le verrou est censé lui épargner.
    const travail = this.faire(userId, incongruesUsername).finally(() => {
      this.enCours.delete(userId);
    });
    this.enCours.set(userId, travail);
    return travail;
  }

  async syncAll(): Promise<number> {
    // Seule la preuve de possession (Task 1) ouvre la synchronisation : la
    // simple saisie d'un pseudo ne suffit plus, sans quoi n'importe quel
    // compte pourrait faire paraître les mix d'un membre prolifique sous lui.
    const lies = await this.prisma.user.findMany({
      where: { incongruesVerifiedAt: { not: null } },
      select: { id: true, incongruesUsername: true },
    });

    let crees = 0;
    for (const user of lies) {
      // Chaque compte dans son propre `try` : `listByAuthor` est HORS du `try`
      // de `faire`, donc un forum injoignable ou un pseudo inexistant sortirait
      // de la boucle, et le webhook rendrait 502 au lieu de son compte de mix.
      try {
        crees += await this.syncUser(user.id, user.incongruesUsername!);
      } catch (erreur) {
        this.logger.warn(
          `Compte ${user.incongruesUsername!} en échec : ${(erreur as Error).message}`,
        );
      }
    }
    return crees;
  }

  /**
   * La sonnerie du webhook : une seule lecture du forum, quel que soit le
   * nombre de comptes liés, au lieu d'une requête `listByAuthor` par compte
   * (Task 3). On lit les discussions récentes une fois, puis on ne
   * synchronise que les comptes vérifiés dont le pseudo apparaît parmi leurs
   * auteurs.
   */
  async syncDepuisSonnerie(): Promise<number> {
    // La route est publique et déclenche des appels sortants. Une sonnerie de
    // plus dans la minute ne peut rien apporter que la précédente n'ait déjà vu.
    const maintenant = Date.now();
    if (maintenant - this.dernierPassageSonnerie < DEBOUNCE_MS) return 0;
    this.dernierPassageSonnerie = maintenant;

    const discussions = await this.flarum.listRecentDiscussions();
    if (discussions.length === 0) return 0;

    const lies = await this.prisma.user.findMany({
      where: { incongruesVerifiedAt: { not: null } },
      select: { id: true, incongruesUsername: true },
    });

    let crees = 0;
    for (const user of lies) {
      // Comparaison insensible à la casse : le forum peut rendre « Nota »
      // quand la base porte « nota ». C'est la valeur de la BASE qu'on passe
      // à `syncUser` ensuite — c'est elle que le reste du dispositif connaît.
      const aPoste = discussions.some(
        (d) =>
          d.authorUsername?.toLowerCase() ===
          user.incongruesUsername!.toLowerCase(),
      );
      if (!aPoste) continue;

      try {
        crees += await this.syncUser(user.id, user.incongruesUsername!);
      } catch (erreur) {
        this.logger.warn(
          `Compte ${user.incongruesUsername!} en échec : ${(erreur as Error).message}`,
        );
      }
    }
    return crees;
  }

  /** Le filet de rattrapage, à l'heure : ce que le webhook a pu perdre pendant
   *  une indisponibilité de Mixcloud, ou parce que FoF Webhooks a raté
   *  l'événement. */
  async syncAllRattrapageHoraire(): Promise<number> {
    const maintenant = Date.now();
    if (maintenant - this.dernierRattrapage < RATTRAPAGE_MS) return 0;
    this.dernierRattrapage = maintenant;
    return this.syncAll();
  }

  /**
   * La discussion est-elle bien de ce membre, d'après une relecture par son
   * identifiant ?
   *
   * Un échec REFUSE. Sans confirmation indépendante on n'attribue le travail
   * de personne : rater un import se rattrape au passage suivant, publier le
   * mix d'autrui sous un compte ne se rattrape qu'à la main.
   */
  private async estBienDe(
    discussionId: string,
    revendique: string,
  ): Promise<boolean> {
    try {
      const relue = await this.flarum.getDiscussion(discussionId);
      return relue.authorUsername?.toLowerCase() === revendique;
    } catch (erreur) {
      this.logger.warn(
        `Relecture de la discussion ${discussionId} impossible : ${(erreur as Error).message}`,
      );
      return false;
    }
  }

  private async faire(
    userId: string,
    incongruesUsername: string,
  ): Promise<number> {
    const discussions = await this.flarum.listByAuthor(incongruesUsername);
    const revendique = incongruesUsername.toLowerCase();
    let crees = 0;

    for (const discussion of discussions) {
      // Chaque discussion dans son propre `try` : un cloudcast supprimé chez
      // Mixcloud ne doit pas empêcher les treize autres de paraître.
      try {
        // Premier contrôle, AVANT tout appel sortant. `listByAuthor` a déjà
        // rapporté la `pageUrl`, et tout ce que la synchronisation a créé la
        // porte : en régime établi, les mix déjà là sont écartés sans qu'un
        // seul oEmbed soit payé pour être jeté.
        if (await this.mixes.findBySource(undefined, discussion.pageUrl)) {
          continue;
        }

        // L'attribution se confirme sur une source INDÉPENDANTE.
        //
        // Constaté en production : le forum a rendu, dans une réponse à
        // `filter[author]=nota`, quatre discussions d'un autre membre EN LES
        // LUI ATTRIBUANT. Contrôler l'auteur dans cette réponse-là ne servait
        // à rien — on vérifiait un filtre avec la réponse de ce filtre. La
        // relecture par identifiant, elle, est cohérente.
        //
        // Elle est placée APRÈS le contrôle de doublon : en régime établi
        // rien n'est nouveau, donc elle ne coûte aucune requête. Elle n'est
        // payée que pour un mix qu'on s'apprête réellement à créer.
        if (!(await this.estBienDe(discussion.id, revendique))) {
          this.logger.warn(
            `${discussion.pageUrl} écartée : la relecture ne la donne pas à ${incongruesUsername}`,
          );
          continue;
        }

        // Le premier message voyage déjà dans la réponse de `listByAuthor` :
        // le recharger par `getDiscussion` serait une requête HTTP par
        // discussion pour un `contentHtml` qu'on tient en main.
        const mix = await this.importeur.importDiscussion(discussion);

        // L'idempotence vient d'ici, pas d'un curseur : la base est la seule
        // source de vérité sur ce qui a déjà été importé, et elle n'a pas
        // besoin d'être réparée quand elle dérive. Ce second contrôle porte
        // sur `sourceRef`, que le premier ne connaissait pas : c'est lui qui
        // rattrape les mix saisis à la main, sans `pageUrl` du forum.
        const deja = await this.mixes.findBySource(
          mix.sourceRef,
          mix.sourcePageUrl,
        );
        if (deja) continue;

        await this.mixes.createFromImport(userId, mix);
        crees += 1;
      } catch (erreur) {
        // Un post sans lecteur exploitable est le cas NORMAL — 10 sur 24 pour
        // le compte de référence. En `warn`, ils noieraient les vrais
        // incidents dès le premier passage.
        if (erreur instanceof BadRequestException) {
          this.logger.debug(
            `${discussion.pageUrl} ignorée : ${erreur.message}`,
          );
        } else {
          this.logger.warn(
            `${discussion.pageUrl} en échec : ${(erreur as Error).message}`,
          );
        }
      }
    }

    return crees;
  }
}
