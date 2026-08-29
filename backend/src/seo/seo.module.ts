import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PreviewController } from './preview.controller';
import { PreviewService } from './preview.service';
import { SitemapController } from './sitemap.controller';
import { SitemapService } from './sitemap.service';

@Module({
  imports: [PrismaModule],
  controllers: [SitemapController, PreviewController],
  providers: [SitemapService, PreviewService],
})
export class SeoModule {}
