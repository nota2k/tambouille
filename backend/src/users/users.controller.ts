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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { PlaylistsService } from '../playlists/playlists.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PaginationDto } from './dto/pagination.dto';
import { SearchUsersDto } from './dto/search-users.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import {
  CurrentUserId,
  OptionalUserId,
} from '../auth/decorators/current-user.decorator';
import {
  r2StorageFor,
  fileFilterFor,
  IMAGE_MIME_TYPES,
  type UploadedFile as R2File,
} from '../common/upload.utils';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly playlistsService: PlaylistsService,
  ) {}

  @Get('search')
  searchUsers(@Query() query: SearchUsersDto) {
    return this.usersService.search(query);
  }

  @Get(':username')
  @UseGuards(OptionalJwtAuthGuard)
  getProfile(
    @Param('username') username: string,
    @OptionalUserId() currentUserId?: string,
  ) {
    return this.usersService.getPublicProfile(username, currentUserId);
  }

  @Get(':username/followers')
  listFollowers(
    @Param('username') username: string,
    @Query() query: PaginationDto,
  ) {
    return this.usersService.listFollowers(username, query);
  }

  @Get(':username/following')
  listFollowing(
    @Param('username') username: string,
    @Query() query: PaginationDto,
  ) {
    return this.usersService.listFollowing(username, query);
  }

  @Get(':username/playlists')
  listPlaylists(
    @Param('username') username: string,
    @Query() query: PaginationDto,
  ) {
    return this.playlistsService.listByUsername(username, query);
  }

  @Post(':username/follow')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  follow(@Param('username') username: string, @CurrentUserId() userId: string) {
    return this.usersService.follow(userId, username);
  }

  @Delete(':username/follow')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  unfollow(
    @Param('username') username: string,
    @CurrentUserId() userId: string,
  ) {
    return this.usersService.unfollow(userId, username);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @CurrentUserId() userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAccount(@CurrentUserId() userId: string) {
    return this.usersService.deleteAccount(userId);
  }

  @Post('me/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: r2StorageFor('avatars'),
      fileFilter: fileFilterFor(IMAGE_MIME_TYPES),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadAvatar(@CurrentUserId() userId: string, @UploadedFile() file?: R2File) {
    if (!file) {
      throw new BadRequestException('avatar file is required');
    }
    return this.usersService.updateAvatar(userId, file.key);
  }

  @Post('me/cover')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('cover', {
      storage: r2StorageFor('banners'),
      fileFilter: fileFilterFor(IMAGE_MIME_TYPES),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  uploadCover(@CurrentUserId() userId: string, @UploadedFile() file?: R2File) {
    if (!file) {
      throw new BadRequestException('cover file is required');
    }
    return this.usersService.updateCover(userId, file.key);
  }
}
