import { forwardRef, Module } from '@nestjs/common';
import { ImportsModule } from '../imports/imports.module';
import { MixesModule } from '../mixes/mixes.module';
import { IncongruesSyncService } from './incongrues.sync.service';
import { IncongruesWebhookController } from './incongrues.webhook.controller';

@Module({
  // L'autre moitié du `forwardRef` posé côté `MixesModule` : sans elle, Nest
  // ne résout pas le cycle introduit par le filet de rattrapage du contrôleur.
  imports: [ImportsModule, forwardRef(() => MixesModule)],
  controllers: [IncongruesWebhookController],
  providers: [IncongruesSyncService],
  exports: [IncongruesSyncService],
})
export class IncongruesModule {}
