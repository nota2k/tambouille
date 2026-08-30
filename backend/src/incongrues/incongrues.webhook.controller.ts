import {
  Controller,
  Headers,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
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

/** Le secret d'un en-tête `Authorization: Bearer <secret>`, ou `null`.
 *
 *  Le schéma est exigé, et le secret nu refusé : accepter les deux formes
 *  multiplierait les façons d'écrire la même chose, donc les façons de se
 *  tromper en configurant un client. Sa casse est en revanche ignorée, comme
 *  la RFC 7235 le demande — les clients ne s'accordent pas dessus. */
function secretDeLEnTete(entete: string | undefined): string | null {
  if (!entete) return null;
  const [schema, ...reste] = entete.split(' ');
  if (schema.toLowerCase() !== 'bearer') return null;
  const secret = reste.join(' ');
  return secret.length > 0 ? secret : null;
}

/**
 * La sonnette du forum.
 *
 * Elle s'ouvre de deux façons, et c'est délibéré :
 *
 * - `POST /webhooks/musiques-incongrues` avec `Authorization: Bearer <secret>`,
 *   la forme à préférer ;
 * - `POST /webhooks/musiques-incongrues/<secret>`, la forme historique.
 *
 * La seconde existait parce que FoF Webhooks, l'extension du forum qui devait
 * sonner, ne laissait configurer qu'une adresse et pas d'en-têtes. Elle a été
 * abandonnée : sa validation d'URL exige un hôte Discord, Slack ou Teams, et
 * aucune adresse Tambouille ne peut passer. La contrainte qui avait mis le
 * secret dans le chemin n'existe donc plus.
 *
 * Or un secret dans un chemin finit **en clair dans les journaux d'accès** —
 * constaté sur le serveur, pas supposé, et il y reste dans les archives
 * mensuelles. L'en-tête l'en sort.
 *
 * La forme historique est conservée pour ne rien casser pendant la bascule,
 * et pourra être retirée quand plus rien ne l'appellera.
 *
 * La route ne lit jamais sa charge utile. C'est ce qui la rend indifférente au
 * déclencheur — webhook, cron, minuteur n8n ou bouton — et ce qui a permis de
 * remplacer FoF Webhooks sans toucher une ligne de ce fichier.
 */
@Controller('webhooks/musiques-incongrues')
export class IncongruesWebhookController {
  constructor(private readonly sync: IncongruesSyncService) {}

  @Post()
  async sonnerParEnTete(@Headers('authorization') entete?: string) {
    return this.sonnerSi(secretDeLEnTete(entete));
  }

  @Post(':secret')
  async sonner(@Param('secret') secret: string) {
    return this.sonnerSi(secret);
  }

  /** Les deux portes partagent leur garde : une seule place où se tromper. */
  private async sonnerSi(fourni: string | null) {
    const attendu = process.env.INCONGRUES_WEBHOOK_SECRET;
    // Un secret non configuré ferme la route plutôt que de l'ouvrir à tous.
    if (!attendu || !fourni || !memeSecret(fourni, attendu)) {
      throw new NotFoundException();
    }
    return { crees: await this.sync.syncDepuisSonnerie() };
  }
}
