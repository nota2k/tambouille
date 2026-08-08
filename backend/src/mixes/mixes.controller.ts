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
  diskStorageByField,
  diskStorageFor,
  fileFilterByField,
  fileFilterFor,
  IMAGE_MIME_TYPES,
} from '../common/upload.utils';

type UploadedFilesShape = {
  audio?: Express.Multer.File[];
  cover?: Express.Multer.File[];
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
      storage: diskStorageByField({ audio: 'audio', cover: 'covers' }),
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
      audioUrl: `/uploads/audio/${audioFile.filename}`,
      coverUrl: coverFile ? `/uploads/covers/${coverFile.filename}` : undefined,
    });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('cover', {
      storage: diskStorageFor('covers'),
      fileFilter: fileFilterFor(IMAGE_MIME_TYPES),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  update(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() dto: UpdateMixDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const coverUrl = file ? `/uploads/covers/${file.filename}` : undefined;
    return this.mixesService.update(id, userId, dto, coverUrl);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.mixesService.remove(id, userId);
  }
}
