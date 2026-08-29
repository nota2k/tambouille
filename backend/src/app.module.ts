import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MixesModule } from './mixes/mixes.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { CommentsModule } from './comments/comments.module';
import { MixcloudModule } from './mixcloud/mixcloud.module';
import { ImportsModule } from './imports/imports.module';
import { FeedsModule } from './feeds/feeds.module';
import { SeoModule } from './seo/seo.module';
import { VeilleModule } from './veille/veille.module';
import { IncongruesModule } from './incongrues/incongrues.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    MixesModule,
    PlaylistsModule,
    CommentsModule,
    MixcloudModule,
    ImportsModule,
    FeedsModule,
    SeoModule,
    VeilleModule,
    IncongruesModule,
  ],
})
export class AppModule {}
