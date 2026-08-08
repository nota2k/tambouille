import { Module } from '@nestjs/common';
import { MixcloudService } from './mixcloud.service';

/**
 * No controller: `/imports/*` is the only HTTP surface now, and it reaches this
 * relay through `MixcloudImporter`. The relay itself is unchanged — only the
 * routes that used to expose it directly are gone.
 */
@Module({
  providers: [MixcloudService],
  exports: [MixcloudService],
})
export class MixcloudModule {}
