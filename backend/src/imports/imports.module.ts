import { Module } from '@nestjs/common';
import { MixcloudModule } from '../mixcloud/mixcloud.module';
import { ImportsController } from './imports.controller';
import { ImportsService, SOURCE_IMPORTERS } from './imports.service';
import { ArchiveImporter } from './archive.importer';
import { MixcloudImporter } from './mixcloud.importer';
import { PodcastImporter } from './podcast.importer';

@Module({
  imports: [MixcloudModule],
  controllers: [ImportsController],
  providers: [
    MixcloudImporter,
    ArchiveImporter,
    PodcastImporter,
    ImportsService,
    {
      provide: SOURCE_IMPORTERS,
      // ORDER IS LOAD-BEARING. `PodcastImporter` claims every https URL, so it
      // must stay last — put anything after it and that importer never runs.
      inject: [MixcloudImporter, ArchiveImporter, PodcastImporter],
      useFactory: (
        mixcloud: MixcloudImporter,
        archive: ArchiveImporter,
        podcast: PodcastImporter,
      ) => [mixcloud, archive, podcast],
    },
  ],
})
export class ImportsModule {}
