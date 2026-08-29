import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { FlarumClient } from '../imports/flarum.client';
import { MusiquesIncongruesImporter } from '../imports/musiques-incongrues.importer';
import { MixesService } from '../mixes/mixes.service';
import { PrismaService } from '../prisma/prisma.service';

/** La route est publique et déclenche des appels sortants. Une sonnerie de
 *  plus dans la minute ne peut rien apporter que la précédente n'ait déjà vu. */
export const DEBOUNCE_MS = 60_000;

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

  private dernierPassage = 0;

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
    const lies = await this.prisma.user.findMany({
      where: { incongruesUsername: { not: null } },
      select: { id: true, incongruesUsername: true },
    });

    let crees = 0;
    for (const user of lies) {
      crees += await this.syncUser(user.id, user.incongruesUsername!);
    }
    return crees;
  }

  async syncAllDebounced(): Promise<number> {
    const maintenant = Date.now();
    if (maintenant - this.dernierPassage < DEBOUNCE_MS) return 0;
    this.dernierPassage = maintenant;
    return this.syncAll();
  }

  private async faire(
    userId: string,
    incongruesUsername: string,
  ): Promise<number> {
    const discussions = await this.flarum.listByAuthor(incongruesUsername);
    let crees = 0;

    for (const discussion of discussions) {
      // Chaque discussion dans son propre `try` : un cloudcast supprimé chez
      // Mixcloud ne doit pas empêcher les treize autres de paraître.
      try {
        const mix = await this.importeur.importItem(discussion.id);

        // L'idempotence vient d'ici, pas d'un curseur : la base est la seule
        // source de vérité sur ce qui a déjà été importé, et elle n'a pas
        // besoin d'être réparée quand elle dérive.
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
