import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ImportsService } from '../imports/imports.service';
import type { MixImport } from '../imports/source-importer';

/**
 * « Récupérer depuis la source », de l'écran d'édition : relit la source d'un
 * mix déjà importé et rend ce qu'elle en dit, sans rien enregistrer. C'est le
 * formulaire qui décide ensuite, à l'enregistrement.
 *
 * À part de `MixesService` : rien n'y est écrit, et l'import n'y a pas sa place.
 */
@Injectable()
export class MixSourceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imports: ImportsService,
  ) {}

  async refetch(
    mixId: string,
    userId: string,
  ): Promise<MixImport & { autreFichier: boolean }> {
    const mix = await this.prisma.mix.findUnique({
      where: { id: mixId },
      select: { userId: true, sourceRef: true, sourcePageUrl: true },
    });
    if (!mix) throw new NotFoundException('Mix not found');
    // Avant toute lecture : relire une source coûte une requête sortante, et
    // n'a de sens que pour qui peut ensuite enregistrer.
    if (mix.userId !== userId) {
      throw new ForbiddenException('You can only edit your own mixes');
    }
    // Un fichier envoyé, un lien direct vers un fichier audio : rien à relire.
    if (!mix.sourcePageUrl || !mix.sourceRef) {
      throw new BadRequestException("Ce mix n'a pas de source à relire");
    }
    const relu = await this.imports.refetch(mix.sourcePageUrl, mix.sourceRef);
    // Un avertissement, pas un refus : chez Ouïedire, l'adresse du fichier
    // d'une même émission peut changer. Mais une page de source modifiée à la
    // main peut aussi désigner un tout autre mix, et le formulaire doit le
    // dire avant qu'on enregistre ses infos sur celui-ci.
    return { ...relu, autreFichier: relu.sourceRef !== mix.sourceRef };
  }
}
