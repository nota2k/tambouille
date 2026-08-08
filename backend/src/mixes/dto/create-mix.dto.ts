import { IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { KEY_PATTERN as MIXCLOUD_KEY_PATTERN } from '../../mixcloud/mixcloud.service';

export class CreateMixDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /** Comma-separated list of tags, e.g. "house,deep-house,live" */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  tags?: string;

  /** JSON-encoded array of { artist, title, timecodeSec }, e.g. [{"artist":"Daft Punk","title":"One More Time","timecodeSec":125}] */
  @IsOptional()
  @IsString()
  tracklist?: string;

  /**
   * Cover to import from Mixcloud's CDN, used only when no cover file was
   * uploaded. The URL is validated server-side before anything is fetched.
   */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  coverSourceUrl?: string;

  /**
   * Cloudcast key of a mix whose audio stays on Mixcloud, e.g.
   * "/Notamusic/vorwerk-7-passages-pas-sages/". Exactly one of this and an
   * uploaded audio file must be present; `MixesService` enforces that.
   *
   * The pattern is the relay's, imported rather than restated: a stored key is
   * later interpolated into a Mixcloud URL, so it must satisfy the same guard.
   *
   * An empty string is deliberately let through instead of being rejected
   * here, so the service can name the real problem — no audio source at all —
   * rather than answering a blank field with the regex.
   */
  @ValidateIf((dto: CreateMixDto) => Boolean(dto.mixcloudKey))
  @IsString()
  @MaxLength(300)
  @Matches(MIXCLOUD_KEY_PATTERN, { message: 'mixcloudKey is not a valid Mixcloud key' })
  mixcloudKey?: string;
}
