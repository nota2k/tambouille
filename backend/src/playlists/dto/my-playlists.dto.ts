import { IsOptional, IsUUID } from 'class-validator';

export class MyPlaylistsDto {
  /** When set, each returned playlist carries `containsMix` for this mix. */
  @IsOptional()
  @IsUUID()
  mixId?: string;
}
