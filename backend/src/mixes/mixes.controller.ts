import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { MixesService, assertExactlyOneAudioSource } from './mixes.service';
import { CoverImportService } from './cover-import.service';
import { CreateMixDto } from './dto/create-mix.dto';
import { UpdateMixDto } from './dto/update-mix.dto';
import { QueryMixesDto } from './dto/query-mixes.dto';
import { QuerySuggestionsDto } from './dto/query-suggestions.dto';
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
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findAll(
    @Query() query: QueryMixesDto,
    @OptionalUserId() currentUserId?: string,
  ) {
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

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  findOne(@Param('id') id: string, @OptionalUserId() currentUserId?: string) {
    return this.mixesService.findOne(id, currentUserId);
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

    // An uploaded cover always wins over one imported from Mixcloud.
    const coverFile = files.cover?.[0];
    let coverUrl = coverFile?.key;
    if (!coverUrl && dto.coverSourceUrl) {
      coverUrl = await this.coverImportService.importFromUrl(
        dto.coverSourceUrl,
      );
    }

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
