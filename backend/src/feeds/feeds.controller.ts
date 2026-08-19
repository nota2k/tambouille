import {
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { mediaBasesFor } from '../common/media-bases';
import { siteBaseUrl, type FeedContext } from './feed.context';
import { sendFeed } from './feed.response';
import { buildRssFeed } from './feed.builder';
import { FeedsService } from './feeds.service';
import type { FeedChannel } from './feed.types';

@Controller()
export class FeedsController {
  constructor(private readonly feedsService: FeedsService) {}

  @Get('rss')
  site(
    @Req() request: Request,
    @Res() response: Response,
    @Headers('if-none-match') ifNoneMatch?: string,
  ) {
    return this.serve(request, response, ifNoneMatch, (context) =>
      this.feedsService.site(context),
    );
  }

  @Get('users/:username/rss')
  user(
    @Param('username') username: string,
    @Req() request: Request,
    @Res() response: Response,
    @Headers('if-none-match') ifNoneMatch?: string,
  ) {
    return this.serve(request, response, ifNoneMatch, (context) =>
      this.feedsService.user(username, context),
    );
  }

  @Get('playlists/:id/rss')
  playlist(
    @Param('id') id: string,
    @Req() request: Request,
    @Res() response: Response,
    @Headers('if-none-match') ifNoneMatch?: string,
  ) {
    return this.serve(request, response, ifNoneMatch, (context) =>
      this.feedsService.playlist(id, context),
    );
  }

  @Get('fournees/:numero/rss')
  fournee(
    @Param('numero', ParseIntPipe) numero: number,
    @Req() request: Request,
    @Res() response: Response,
    @Headers('if-none-match') ifNoneMatch?: string,
  ) {
    return this.serve(request, response, ifNoneMatch, (context) =>
      this.feedsService.fournee(numero, context),
    );
  }

  private async serve(
    request: Request,
    response: Response,
    ifNoneMatch: string | undefined,
    resolve: (context: FeedContext) => Promise<FeedChannel>,
  ): Promise<void> {
    const bases = mediaBasesFor(request);
    const context: FeedContext = {
      bases,
      site: siteBaseUrl(),
      // L'URL demandée, sans sa chaîne de requête : c'est celle à laquelle un
      // client revient, et RSS veut la republier en `atom:link rel="self"`.
      selfUrl: `${bases.api}${request.originalUrl.split('?')[0]}`,
    };

    sendFeed(response, ifNoneMatch, buildRssFeed(await resolve(context)));
  }
}
