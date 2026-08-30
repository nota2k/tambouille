import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PlaylistsModule } from '../playlists/playlists.module';
import { IncongruesModule } from '../incongrues/incongrues.module';

@Module({
  imports: [PlaylistsModule, IncongruesModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
