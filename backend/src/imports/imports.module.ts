import { Module } from '@nestjs/common';
import { MixcloudModule } from '../mixcloud/mixcloud.module';
import { ImportsController } from './imports.controller';
import { ImportsService, SOURCE_IMPORTERS } from './imports.service';
import { ArchiveImporter } from './archive.importer';
import { MixcloudImporter } from './mixcloud.importer';
import { SoundcloudImporter } from './soundcloud.importer';
import { OuiedireImporter } from './ouiedire.importer';
import { LylImporter } from './lyl.importer';
import { PodcastImporter } from './podcast.importer';

@Module({
  imports: [MixcloudModule],
  controllers: [ImportsController],
  providers: [
    MixcloudImporter,
    SoundcloudImporter,
    ArchiveImporter,
    OuiedireImporter,
    LylImporter,
    PodcastImporter,
    ImportsService,
    {
      provide: SOURCE_IMPORTERS,
      // ORDER IS LOAD-BEARING. `PodcastImporter` claims every https URL, so it
      // must stay last — put anything after it and that importer never runs.
      //
      // `OuiedireImporter` sits before it and claims `/emission/...` only, so
      // `ouiedire.net/feed` still reaches the podcast importer that reads it
      // properly. `LylImporter` narrows the same way, to `/episode/...` and
      // `/show/...`.
      inject: [
        MixcloudImporter,
        SoundcloudImporter,
        ArchiveImporter,
        OuiedireImporter,
        LylImporter,
        PodcastImporter,
      ],
      useFactory: (
        mixcloud: MixcloudImporter,
        soundcloud: SoundcloudImporter,
        archive: ArchiveImporter,
        ouiedire: OuiedireImporter,
        lyl: LylImporter,
        podcast: PodcastImporter,
      ) => [mixcloud, soundcloud, archive, ouiedire, lyl, podcast],
    },
  ],
})
export class ImportsModule {}
