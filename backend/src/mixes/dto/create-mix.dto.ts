import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  Validate,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SourceRefConstraint } from './source-ref.constraint';

export class CreateMixDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /**
   * Le nom de l'artiste. Purement affiché — jamais rendu dans un `href` ni
   * passé à un `fetch` —, donc échappé par Vue et sans garde de protocole,
   * contrairement à `sourceRef`.
   */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  artist?: string;

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
   * Which player engine the audio needs: 'mixcloud', 'remote' or
   * 'soundcloud'. Paired with `sourceRef`; `MixesService` refuses one without
   * the other.
   */
  @IsOptional()
  @IsString()
  @IsIn(['mixcloud', 'remote', 'soundcloud'])
  sourceType?: string;

  /**
   * What `sourceType` lets us interpret: a cloudcast key, or an https URL to a
   * directly playable audio file.
   *
   * A cloudcast key is later interpolated into a Mixcloud URL, so it must
   * satisfy the relay's own guard — the pattern is imported, never restated.
   * A remote URL is never fetched by the server, but it is served to every
   * visitor's browser, so it is held to https and to a public address.
   *
   * An empty string is deliberately let through instead of being rejected
   * here, so the service can name the real problem — no audio source at all —
   * rather than answering a blank field with a regex.
   */
  @ValidateIf((dto: { sourceType?: string; sourceRef?: string }) =>
    Boolean(dto.sourceRef),
  )
  @IsString()
  @MaxLength(2048)
  @Validate(SourceRefConstraint)
  sourceRef?: string;

  /**
   * Duration in seconds, when the source reported one. Multipart bodies carry
   * everything as text, so this arrives as a string and needs coercing.
   * Absent for a hand-filled upload: nothing probes the audio server-side.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24 * 3600)
  durationSec?: number;
}
