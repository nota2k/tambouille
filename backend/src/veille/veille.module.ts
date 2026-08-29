import { Module } from '@nestjs/common';
import { ImportsModule } from '../imports/imports.module';
import { VeilleController } from './veille.controller';
import { VeilleService } from './veille.service';
import { VeilleResolver } from './veille.resolver';
import { BandcampReader } from './bandcamp.reader';

@Module({
  imports: [ImportsModule],
  controllers: [VeilleController],
  providers: [VeilleService, VeilleResolver, BandcampReader],
})
export class VeilleModule {}
