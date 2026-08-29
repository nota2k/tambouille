import { Controller, Get, Headers, Res } from '@nestjs/common';
import type { Response } from 'express';
import { createHash } from 'crypto';
import { siteBaseUrl } from '../feeds/feed.context';
import { SitemapService } from './sitemap.service';

/**
 * Une heure : un plan de site n'est relu que de loin en loin par les robots, et
 * le construire coûte trois requêtes sur toute la base.
 */
const MAX_AGE_SECONDS = 3600;

/**
 * Le plan de site est servi par l'API et non par le domaine du site, parce
 * qu'il se construit à partir de la base et que le front est un paquet de
 * fichiers statiques. `robots.txt`, lui, vit bien sur le domaine du site et
 * pointe ici : c'est cette déclaration qui autorise un plan hébergé ailleurs.
 */
@Controller()
export class SitemapController {
  constructor(private readonly sitemapService: SitemapService) {}

  @Get('sitemap.xml')
  async sitemap(
    @Res() response: Response,
    @Headers('if-none-match') ifNoneMatch?: string,
  ): Promise<void> {
    const xml = await this.sitemapService.build(siteBaseUrl());
    const etag = `W/"${createHash('sha1').update(xml).digest('base64url')}"`;

    response.setHeader('Cache-Control', `public, max-age=${MAX_AGE_SECONDS}`);
    response.setHeader('ETag', etag);

    if (ifNoneMatch === etag) {
      response.status(304).end();
      return;
    }

    response.setHeader('Content-Type', 'application/xml; charset=utf-8');
    response.status(200).send(xml);
  }
}
