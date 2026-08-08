import { Module } from '@nestjs/common';
import { MixcloudService } from './mixcloud.service';
import { MixcloudController } from './mixcloud.controller';

/**
 * `MixcloudController` is on borrowed time: `/imports/*` supersedes it, and the
 * plan deletes it once `UploadView` stops calling `/mixcloud/*` (Task 9). Both
 * surfaces run the same relay in the meantime, so nothing diverges.
 */
@Module({
  controllers: [MixcloudController],
  providers: [MixcloudService],
  exports: [MixcloudService],
})
export class MixcloudModule {}
