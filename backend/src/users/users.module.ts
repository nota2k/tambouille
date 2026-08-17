import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PlaylistsModule } from '../playlists/playlists.module';

@Module({
  imports: [PlaylistsModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
