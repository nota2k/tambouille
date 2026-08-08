import { Module } from '@nestjs/common';
import { MixcloudService } from './mixcloud.service';
import { MixcloudController } from './mixcloud.controller';

@Module({
  controllers: [MixcloudController],
  providers: [MixcloudService],
})
export class MixcloudModule {}
