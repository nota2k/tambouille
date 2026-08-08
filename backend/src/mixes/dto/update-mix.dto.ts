import { IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { KEY_PATTERN as MIXCLOUD_KEY_PATTERN } from '../../mixcloud/mixcloud.service';

export class UpdateMixDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /** Comma-separated list of tags, e.g. "house,deep-house,live" */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  tags?: string;

  /** JSON-encoded array of { artist, title, timecodeSec }. Replaces the entire tracklist when present. */
  @IsOptional()
  @IsString()
  tracklist?: string;

  /**
   * Corrects the cloudcast key of a Mixcloud-hosted mix. Same pattern as the
   * relay's, imported rather than restated.
   *
   * This cannot convert a mix from one host to the other: `MixesService`
   * refuses the result if it would leave the mix with both sources or with
   * none, which is what either conversion would do. An empty string is let
   * through so that attempt is answered by the rule, not by the regex.
   */
  @ValidateIf((dto: UpdateMixDto) => Boolean(dto.mixcloudKey))
  @IsString()
  @MaxLength(300)
  @Matches(MIXCLOUD_KEY_PATTERN, { message: 'mixcloudKey is not a valid Mixcloud key' })
  mixcloudKey?: string;
}
