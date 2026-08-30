import { Controller, NotFoundException, Param, Post } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { IncongruesSyncService } from './incongrues.sync.service';

/** Comparaison à durée constante. `timingSafeEqual` exige des tampons de même
 *  longueur : la différence de longueur est traitée avant, et elle ne fuit que
 *  la longueur du secret, pas son contenu. */
function memeSecret(fourni: string, attendu: string): boolean {
  const a = Buffer.from(fourni, 'utf8');
  const b = Buffer.from(attendu, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * La sonnette du forum.
 *
 * Le secret vit dans l'URL, et ce n'est pas un choix : FoF Webhooks ne laisse
 * configurer qu'une adresse, pas d'en-têtes. **Cette URL est donc un mot de
 * passe** — elle ne doit apparaître ni dans les journaux d'accès ni dans un
 * dépôt.
 *
 * La route ne lit jamais sa charge utile. C'est ce qui rend le format Discord
 * de FoF Webhooks sans importance, et ce qui permettra de brancher un cron ou
 * un bouton au même endroit sans rien réécrire.
 */
@Controller('webhooks/musiques-incongrues')
export class IncongruesWebhookController {
  constructor(private readonly sync: IncongruesSyncService) {}

  @Post(':secret')
  async sonner(@Param('secret') secret: string) {
    const attendu = process.env.INCONGRUES_WEBHOOK_SECRET;
    // Un secret non configuré ferme la route plutôt que de l'ouvrir à tous.
    if (!attendu || !memeSecret(secret, attendu)) {
      throw new NotFoundException();
    }
    return { crees: await this.sync.syncDepuisSonnerie() };
  }
}
