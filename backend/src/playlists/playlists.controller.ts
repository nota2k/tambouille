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
  UseGuards,
} from '@nestjs/common';
import { PlaylistsService } from './playlists.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { AddMixDto } from './dto/add-mix.dto';
import { MyPlaylistsDto } from './dto/my-playlists.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import {
  CurrentUserId,
  OptionalUserId,
} from '../auth/decorators/current-user.decorator';

@Controller('playlists')
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  // Declared before ':id' so "me" is not swallowed by the id route.
  @Get('me')
  @UseGuards(JwtAuthGuard)
  listMine(@CurrentUserId() userId: string, @Query() query: MyPlaylistsDto) {
    return this.playlistsService.listMine(userId, query.mixId);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  findOne(@Param('id') id: string, @OptionalUserId() currentUserId?: string) {
    return this.playlistsService.findOne(id, currentUserId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUserId() userId: string, @Body() dto: CreatePlaylistDto) {
    return this.playlistsService.create(userId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() dto: UpdatePlaylistDto,
  ) {
    return this.playlistsService.update(id, userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.playlistsService.remove(id, userId);
  }

  @Post(':id/mixes')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  addMix(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() dto: AddMixDto,
  ) {
    return this.playlistsService.addMix(id, userId, dto.mixId);
  }

  @Delete(':id/mixes/:mixId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMix(
    @Param('id') id: string,
    @Param('mixId') mixId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.playlistsService.removeMix(id, userId, mixId);
  }
}
