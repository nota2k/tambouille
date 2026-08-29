import {
  Body,
  Controller,
  Delete,
  forwardRef,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Redirect,
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import type { Request } from 'express';
import {
  MixesService,
  assertExactlyOneAudioSource,
  assertSourcePageHasASource,
} from './mixes.service';
import { CoverImportService } from './cover-import.service';
import { IncongruesSyncService } from '../incongrues/incongrues.sync.service';
import { CreateMixDto } from './dto/create-mix.dto';
import { UpdateMixDto } from './dto/update-mix.dto';
import { QueryMixesDto } from './dto/query-mixes.dto';
import { QuerySuggestionsDto } from './dto/query-suggestions.dto';
import { mediaBasesFor } from '../common/media-bases';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import {
  CurrentUserId,
  OptionalUserId,
} from '../auth/decorators/current-user.decorator';
import {
  AUDIO_MIME_TYPES,
  COVER_MAX_BYTES,
  r2StorageByField,
  r2StorageFor,
  fileFilterByField,
  fileFilterFor,
  IMAGE_MIME_TYPES,
  type UploadedFile as R2File,
} from '../common/upload.utils';

type UploadedFilesShape = {
  audio?: R2File[];
  cover?: R2File[];
};

@Controller('mixes')
export class MixesController {
  constructor(
    private readonly mixesService: MixesService,
    private readonly coverImportService: CoverImportService,
    @Inject(forwardRef(() => IncongruesSyncService))
    private readonly incongruesSync: IncongruesSyncService,
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findAll(
    @Query() query: QueryMixesDto,
    @OptionalUserId() currentUserId?: string,
  ) {
    // Filet de rattrapage. Détaché volontairement : la page ne doit pas
    // attendre le forum, et une synchronisation en échec n'est pas une raison
    // de ne rien afficher. L'anti-rebond garde ceci à un passage par minute au
    // plus, quel que soit le trafic.
    void this.incongruesSync.syncAllDebounced().catch(() => undefined);

    return this.mixesService.findAll(query, currentUserId);
  }

  @Get('me/favorites')
  @UseGuards(JwtAuthGuard)
  listFavorites(
    @CurrentUserId() userId: string,
    @Query() query: QueryMixesDto,
  ) {
    return this.mixesService.listFavorites(userId, query);
  }

  @Get('me/recent')
  @UseGuards(JwtAuthGuard)
  listRecentlyPlayed(
    @CurrentUserId() userId: string,
    @Query() query: QueryMixesDto,
  ) {
    return this.mixesService.listRecentlyPlayed(userId, query);
  }

  @Get('feed/following')
  @UseGuards(JwtAuthGuard)
  listFollowingFeed(
    @CurrentUserId() userId: string,
    @Query() query: QueryMixesDto,
  ) {
    return this.mixesService.listFollowingFeed(userId, query);
  }

  @Get('tags')
  findAllTags() {
    return this.mixesService.findAllTags();
  }

  /**
   * Un mix par son compte et son slug, ce que sert `/mixes/<compte>/<slug>`.
   *
   * ── Pourquoi trois segments et pas `:username/:slug` ───────────────────────
   *
   * `/mixes/:username/:slug` entrerait en concurrence avec `/mixes/:id/audio`
   * et `/mixes/:id/suggestions`, qui ont la même forme. Nest tranche par ordre
   * de déclaration, et le segment fixe gagnerait : un mix intitulé « Audio »,
   * dont le slug vaut `audio`, deviendrait inatteignable. Le préfixe rend la
   * route unique par sa longueur, sans dépendre d'un ordre qu'une refonte
   * pourrait défaire sans bruit.
   */
  /**
   * Y a-t-il déjà un mix pour cette source ?
   *
   * Préfixée comme `by-slug`, et pour la même raison : un segment fixe placé
   * après `:id` deviendrait inatteignable au gré de l'ordre de déclaration.
   *
   * Réservée aux comptes connectés : elle ne sert qu'au formulaire d'import,
   * et sans garde elle laisserait n'importe qui demander à l'API si telle
   * adresse est déjà chez nous.
   */
  @Get('by-source')
  @UseGuards(JwtAuthGuard)
  async findBySource(
    @Query('ref') ref?: string,
    @Query('pageUrl') pageUrl?: string,
  ) {
    /*
     * Enveloppé dans un objet, et ce n'est pas de la cérémonie.
     *
     * Un contrôleur Nest qui rend `null` envoie un corps VIDE, pas le littéral
     * JSON `null`. Axios le parse alors en chaîne vide, et `data ?? null` la
     * laisse passer — `??` ne rattrape que `null` et `undefined`. Le formulaire
     * d'upload tenait donc `''` pour un doublon, désactivait son bouton de
     * publication pour toujours, et n'affichait aucun encart puisque `''` est
     * falsy : un bouton mort sans explication.
     *
     * `{ mix }` se sérialise dans les deux cas, et l'absence se lit
     * explicitement chez l'appelant.
     */
    return { mix: await this.mixesService.findBySource(ref, pageUrl) };
  }

  @Get('by-slug/:username/:slug')
  @UseGuards(OptionalJwtAuthGuard)
  findBySlug(
    @Param('username') username: string,
    @Param('slug') slug: string,
    @OptionalUserId() currentUserId?: string,
  ) {
    return this.mixesService.findBySlug(username, slug, currentUserId);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  findOne(@Param('id') id: string, @OptionalUserId() currentUserId?: string) {
    return this.mixesService.findOne(id, currentUserId);
  }

  /**
   * L'URL que portent les `enclosure` des flux de syndication. Elle redirige
   * plutôt que de servir l'audio : une URL d'enclosure vit des années dans la
   * base locale de chaque abonné, et y graver le domaine R2 reviendrait à
   * s'interdire tout changement d'hébergement — ce projet en a déjà fait un.
   *
   * `302` et non `301` : un `301` est mémorisé par les clients, ce qui annule
   * exactement le bénéfice recherché.
   */
  @Get(':id/audio')
  @Redirect()
  resolveAudio(@Param('id') id: string, @Req() request: Request) {
    return this.mixesService.resolveAudio(id, mediaBasesFor(request));
  }

  @Get(':id/suggestions')
  @UseGuards(OptionalJwtAuthGuard)
  listSuggestions(
    @Param('id') id: string,
    @Query() query: QuerySuggestionsDto,
    @OptionalUserId() currentUserId?: string,
  ) {
    return this.mixesService.listSuggestions(
      id,
      query.limit ?? 3,
      currentUserId,
    );
  }

  /**
   * Les autres mixs du même artiste, pour la section qui les affiche sous le
   * mix. Distincte de `suggestions` : celle-là cherche quoi écouter ensuite et
   * se rabat sur des voisins quand elle n'a pas de signal, celle-ci répond à
   * une question précise et préfère ne rien rendre que rendre autre chose.
   */
  @Get(':id/by-artist')
  @UseGuards(OptionalJwtAuthGuard)
  listByArtist(
    @Param('id') id: string,
    @Query() query: QuerySuggestionsDto,
    @OptionalUserId() currentUserId?: string,
  ) {
    return this.mixesService.listByArtist(id, query.limit ?? 3, currentUserId);
  }

  @Post(':id/play')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  registerPlay(
    @Param('id') id: string,
    @OptionalUserId() currentUserId?: string,
  ) {
    return this.mixesService.registerPlay(id, currentUserId);
  }

  @Post(':id/favorite')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  addFavorite(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.mixesService.addFavorite(userId, id);
  }

  @Delete(':id/favorite')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeFavorite(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.mixesService.removeFavorite(userId, id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'audio', maxCount: 1 },
        { name: 'cover', maxCount: 1 },
      ],
      {
        storage: r2StorageByField({ audio: 'audio', cover: 'covers' }),
        fileFilter: fileFilterByField({
          audio: AUDIO_MIME_TYPES,
          cover: IMAGE_MIME_TYPES,
        }),
        limits: { fileSize: 250 * 1024 * 1024 },
      },
    ),
  )
  async create(
    @CurrentUserId() userId: string,
    @Body() dto: CreateMixDto,
    @UploadedFiles() files: UploadedFilesShape,
  ) {
    // No audio file is no longer an error by itself: a Mixcloud-hosted mix has
    // none by design. But the audio source is checked *here*, before the cover
    // import below, and not left to `MixesService` alone — importing a cover
    // writes an object to R2, and nothing in this codebase deletes R2 objects,
    // so a refused create would leave one behind for good.
    //
    // What this check protects is exactly that: the cover import, and nothing
    // else. It does NOT protect the audio upload. Multer-s3 streams the audio
    // body straight to R2 during interception, before this method is entered,
    // so a create carrying both an audio file and a remote source has already
    // written up to 250 MB by the time the request is refused — an orphan
    // nothing ever deletes. Known gap: closing it means restaging uploads
    // (buffer, or write then delete on failure), which is a separate job.
    //
    // This is the same function the service calls, imported rather than
    // restated, so the two cannot drift. The service keeps its own check: that
    // is the real guarantee, and this is only a cheap gate in front of it.
    const audioFile = files.audio?.[0];
    assertExactlyOneAudioSource(
      audioFile?.key ?? null,
      dto.sourceType || null,
      dto.sourceRef || null,
    );
    assertSourcePageHasASource(
      dto.sourceRef || null,
      dto.sourcePageUrl?.trim() || null,
    );

    // An uploaded cover always wins over one imported from the source. Best-
    // effort: a source whose cover cannot be fetched still yields a mix,
    // without one.
    const coverUrl = await this.coverImportService.resolveCoverUrl(
      files.cover?.[0]?.key,
      dto.coverSourceUrl,
    );

    return this.mixesService.create(userId, dto, {
      audioUrl: audioFile?.key,
      coverUrl,
    });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('cover', {
      storage: r2StorageFor('covers'),
      fileFilter: fileFilterFor(IMAGE_MIME_TYPES),
      limits: { fileSize: COVER_MAX_BYTES },
    }),
  )
  update(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() dto: UpdateMixDto,
    @UploadedFile() file?: R2File,
  ) {
    const coverUrl = file ? file.key : undefined;
    return this.mixesService.update(id, userId, dto, coverUrl);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.mixesService.remove(id, userId);
  }
}
