import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { MixcloudService } from './mixcloud.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('mixcloud')
@UseGuards(JwtAuthGuard)
export class MixcloudController {
  constructor(private readonly mixcloudService: MixcloudService) {}

  /** Declared before `:username/cloudcasts` so the literal segment wins. */
  @Get('cloudcast')
  getCloudcast(@Query('key') key?: string) {
    return this.mixcloudService.getCloudcast(key ?? '');
  }

  @Get(':username/cloudcasts')
  listCloudcasts(@Param('username') username: string) {
    return this.mixcloudService.listCloudcasts(username);
  }
}
