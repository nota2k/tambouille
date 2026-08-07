import { Module } from '@nestjs/common';
import { MixesService } from './mixes.service';
import { MixesController } from './mixes.controller';

@Module({
  controllers: [MixesController],
  providers: [MixesService],
})
export class MixesModule {}
