import {
  BadRequestException,
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
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { MixesService } from './mixes.service';
import { CreateMixDto } from './dto/create-mix.dto';
import { UpdateMixDto } from './dto/update-mix.dto';
import { QueryMixesDto } from './dto/query-mixes.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUserId, OptionalUserId } from '../auth/decorators/current-user.decorator';
import {
  AUDIO_MIME_TYPES,
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
  constructor(private readonly mixesService: MixesService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findAll(@Query() query: QueryMixesDto, @OptionalUserId() currentUserId?: string) {
    return this.mixesService.findAll(query, currentUserId);
  }

  @Get('me/favorites')
  @UseGuards(JwtAuthGuard)
  listFavorites(@CurrentUserId() userId: string, @Query() query: QueryMixesDto) {
    return this.mixesService.listFavorites(userId, query);
  }

  @Get('me/recent')
  @UseGuards(JwtAuthGuard)
  listRecentlyPlayed(@CurrentUserId() userId: string, @Query() query: QueryMixesDto) {
    return this.mixesService.listRecentlyPlayed(userId, query);
  }

  @Get('feed/following')
  @UseGuards(JwtAuthGuard)
  listFollowingFeed(@CurrentUserId() userId: string, @Query() query: QueryMixesDto) {
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

  @Post(':id/play')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  registerPlay(@Param('id') id: string, @OptionalUserId() currentUserId?: string) {
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
    FileFieldsInterceptor([{ name: 'audio', maxCount: 1 }, { name: 'cover', maxCount: 1 }], {
      storage: r2StorageByField({ audio: 'audio', cover: 'covers' }),
      fileFilter: fileFilterByField({ audio: AUDIO_MIME_TYPES, cover: IMAGE_MIME_TYPES }),
      limits: { fileSize: 250 * 1024 * 1024 },
    }),
  )
  create(
    @CurrentUserId() userId: string,
    @Body() dto: CreateMixDto,
    @UploadedFiles() files: UploadedFilesShape,
  ) {
    const audioFile = files.audio?.[0];
    if (!audioFile) {
      throw new BadRequestException('audio file is required');
    }
    const coverFile = files.cover?.[0];

    return this.mixesService.create(userId, dto, {
      audioUrl: audioFile.key,
      coverUrl: coverFile ? coverFile.key : undefined,
    });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('cover', {
      storage: r2StorageFor('covers'),
      fileFilter: fileFilterFor(IMAGE_MIME_TYPES),
      limits: { fileSize: 5 * 1024 * 1024 },
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
