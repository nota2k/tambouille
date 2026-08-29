import { Module } from '@nestjs/common';
import { MixesService } from './mixes.service';
import { MixesController } from './mixes.controller';
import { CoverImportService } from './cover-import.service';

@Module({
  controllers: [MixesController],
  providers: [MixesService, CoverImportService],
  exports: [MixesService, CoverImportService],
})
export class MixesModule {}
