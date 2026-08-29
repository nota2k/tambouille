import { Module } from '@nestjs/common';
import { ImportsModule } from '../imports/imports.module';
import { MixesModule } from '../mixes/mixes.module';
import { IncongruesSyncService } from './incongrues.sync.service';
import { IncongruesWebhookController } from './incongrues.webhook.controller';

@Module({
  imports: [ImportsModule, MixesModule],
  controllers: [IncongruesWebhookController],
  providers: [IncongruesSyncService],
  exports: [IncongruesSyncService],
})
export class IncongruesModule {}
