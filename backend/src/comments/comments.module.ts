import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { MixCommentsController } from './mix-comments.controller';
import { CommentsController } from './comments.controller';

@Module({
  controllers: [MixCommentsController, CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
