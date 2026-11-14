import { Module } from '@nestjs/common';
import { MixcloudModule } from '../mixcloud/mixcloud.module';
import { ImportsController } from './imports.controller';
import { ImportsService, SOURCE_IMPORTERS } from './imports.service';
import { ArchiveImporter } from './archive.importer';
import { MixcloudImporter } from './mixcloud.importer';
import { SoundcloudImporter } from './soundcloud.importer';
import { OuiedireImporter } from './ouiedire.importer';
import { LylImporter } from './lyl.importer';
import { BrainImporter } from './brain.importer';
import { AudioLinkImporter } from './audio-link.importer';
import { PodcastImporter } from './podcast.importer';
import { FlarumClient } from './flarum.client';
import { MusiquesIncongruesImporter } from './musiques-incongrues.importer';

@Module({
  imports: [MixcloudModule],
  controllers: [ImportsController],
  providers: [
    MixcloudImporter,
    SoundcloudImporter,
    ArchiveImporter,
    OuiedireImporter,
    LylImporter,
    BrainImporter,
    FlarumClient,
    MusiquesIncongruesImporter,
    AudioLinkImporter,
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
      // `/show/...`, et `BrainImporter` à `listen.php?episode=NNN` — sa page de
      // liste reste donc au message « lien non reconnu », qui dit la vérité.
      // `MusiquesIncongruesImporter` ne réclame que `/d/...` : `/t/musique`,
      // qui n'appartient à personne en particulier, reste au message « lien
      // non reconnu », qui dit la vérité.
      //
      // `AudioLinkImporter` doit précéder le podcast : sans lui, un lien vers
      // un .mp3 serait téléchargé comme un flux et buterait sur sa limite de
      // taille. Il passe après les importeurs dédiés, pour qu'un lien de
      // fichier Archive.org garde ses métadonnées.
      inject: [
        MixcloudImporter,
        SoundcloudImporter,
        ArchiveImporter,
        OuiedireImporter,
        LylImporter,
        BrainImporter,
        MusiquesIncongruesImporter,
        AudioLinkImporter,
        PodcastImporter,
      ],
      useFactory: (
        mixcloud: MixcloudImporter,
        soundcloud: SoundcloudImporter,
        archive: ArchiveImporter,
        ouiedire: OuiedireImporter,
        lyl: LylImporter,
        brain: BrainImporter,
        musiquesIncongrues: MusiquesIncongruesImporter,
        audioLink: AudioLinkImporter,
        podcast: PodcastImporter,
      ) => [
        mixcloud,
        soundcloud,
        archive,
        ouiedire,
        lyl,
        brain,
        musiquesIncongrues,
        audioLink,
        podcast,
      ],
    },
  ],
  exports: [ImportsService, MusiquesIncongruesImporter, FlarumClient],
})
export class ImportsModule {}
