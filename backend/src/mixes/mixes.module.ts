import { forwardRef, Module } from '@nestjs/common';
import { MixesService } from './mixes.service';
import { MixesController } from './mixes.controller';
import { CoverImportService } from './cover-import.service';
import { IncongruesModule } from '../incongrues/incongrues.module';
import { ImportsModule } from '../imports/imports.module';
import { MixSourceService } from './mix-source.service';

@Module({
  // `IncongruesModule` importe déjà `MixesModule` (Task 7) : le contrôleur a
  // maintenant besoin de `IncongruesSyncService` pour le filet de rattrapage,
  // ce qui referme la boucle. `forwardRef` des deux côtés est la seule façon
  // dont Nest peut résoudre un cycle entre modules.
  imports: [forwardRef(() => IncongruesModule), ImportsModule],
  controllers: [MixesController],
  providers: [MixesService, CoverImportService, MixSourceService],
  exports: [MixesService, CoverImportService],
})
export class MixesModule {}
