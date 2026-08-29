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
  UseGuards,
} from '@nestjs/common';
import { VeilleService } from './veille.service';
import { AddSourceDto } from './dto/add-source.dto';
import { UpdateSourceDto } from './dto/update-source.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import {
  CurrentUserId,
  OptionalUserId,
} from '../auth/decorators/current-user.decorator';

@Controller('users')
export class VeilleController {
  constructor(private readonly veille: VeilleService) {}

  // `me` avant `:username` : sans ça, "me" serait pris pour un nom de compte.
  @Post('me/watched-sources')
  @UseGuards(JwtAuthGuard)
  addSource(@CurrentUserId() userId: string, @Body() body: AddSourceDto) {
    return this.veille.addSource(userId, body.url);
  }

  @Patch('me/watched-sources/:id')
  @UseGuards(JwtAuthGuard)
  updateSource(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() body: UpdateSourceDto,
  ) {
    return this.veille.updateSource(userId, id, body);
  }

  @Delete('me/watched-sources/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeSource(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.veille.removeSource(userId, id);
  }

  @Get(':username/watched-sources')
  @UseGuards(OptionalJwtAuthGuard)
  getFeed(
    @Param('username') username: string,
    @OptionalUserId() viewerId?: string,
  ) {
    return this.veille.getFeed(username, viewerId);
  }
}
