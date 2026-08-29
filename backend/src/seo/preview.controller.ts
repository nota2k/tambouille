import { Controller, Get, Headers, Param, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { createHash } from 'crypto';
import { mediaBasesFor } from '../common/media-bases';
import { siteBaseUrl } from '../feeds/feed.context';
import { buildPreviewHtml, type PreviewPage } from './preview.builder';
import { PreviewService, type PreviewContext } from './preview.service';

/**
 * Un quart d'heure, comme les flux : un robot d'aperçu revient de lui-même
 * quand un lien est repartagé, et les plateformes gardent longtemps ce qu'elles
 * ont lu de toute façon.
 */
const MAX_AGE_SECONDS = 900;

/**
 * Les pages servies aux robots d'aperçu de partage.
 *
 * Le site est une application monopage : son HTML est une coquille vide que
 * seul un navigateur remplit. Ces robots n'exécutent pas le JavaScript, d'où
 * ces documents-ci, écrits côté serveur là où les données sont.
 *
 * C'est `frontend/public/.htaccess` qui les aiguille, sur leur `User-Agent`.
 */
@Controller('preview')
export class PreviewController {
  constructor(private readonly previewService: PreviewService) {}

  /**
   * L'adresse canonique d'un mix, à deux segments.
   *
   * Déclarée avant celle à un seul segment : elles n'ont pas le même nombre de
   * segments, donc rien ne les met en concurrence, mais les lire dans l'ordre
   * du plus précis au plus général évite d'avoir à s'en assurer.
   */
  @Get('mixes/:username/:slug')
  mixBySlug(
    @Param('username') username: string,
    @Param('slug') slug: string,
    @Req() request: Request,
    @Res() response: Response,
    @Headers('if-none-match') ifNoneMatch?: string,
  ) {
    return this.serve(request, response, ifNoneMatch, (context) =>
      this.previewService.mixBySlug(username, slug, context),
    );
  }

  /** L'ancienne adresse `/mixes/<id>`, que des liens déjà partagés portent. */
  @Get('mixes/:id')
  mix(
    @Param('id') id: string,
    @Req() request: Request,
    @Res() response: Response,
    @Headers('if-none-match') ifNoneMatch?: string,
  ) {
    return this.serve(request, response, ifNoneMatch, (context) =>
      this.previewService.mix(id, context),
    );
  }

  @Get('users/:username')
  user(
    @Param('username') username: string,
    @Req() request: Request,
    @Res() response: Response,
    @Headers('if-none-match') ifNoneMatch?: string,
  ) {
    return this.serve(request, response, ifNoneMatch, (context) =>
      this.previewService.user(username, context),
    );
  }

  @Get('playlists/:id')
  playlist(
    @Param('id') id: string,
    @Req() request: Request,
    @Res() response: Response,
    @Headers('if-none-match') ifNoneMatch?: string,
  ) {
    return this.serve(request, response, ifNoneMatch, (context) =>
      this.previewService.playlist(id, context),
    );
  }

  private async serve(
    request: Request,
    response: Response,
    ifNoneMatch: string | undefined,
    resolve: (context: PreviewContext) => Promise<PreviewPage>,
  ): Promise<void> {
    const page = await resolve({
      bases: mediaBasesFor(request),
      site: siteBaseUrl(),
    });
    const html = buildPreviewHtml(page);
    const etag = `W/"${createHash('sha1').update(html).digest('base64url')}"`;

    response.setHeader('Cache-Control', `public, max-age=${MAX_AGE_SECONDS}`);
    response.setHeader('ETag', etag);

    if (ifNoneMatch === etag) {
      response.status(304).end();
      return;
    }

    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.status(200).send(html);
  }
}
