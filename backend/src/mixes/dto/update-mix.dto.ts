import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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
}
