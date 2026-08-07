import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PaginationDto } from '../users/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserId } from '../auth/decorators/current-user.decorator';

@Controller('mixes/:mixId/comments')
export class MixCommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  list(@Param('mixId') mixId: string, @Query() query: PaginationDto) {
    return this.commentsService.list(mixId, query);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Param('mixId') mixId: string, @CurrentUserId() userId: string, @Body() dto: CreateCommentDto) {
    return this.commentsService.create(mixId, userId, dto);
  }
}
