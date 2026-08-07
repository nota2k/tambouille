import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  body!: string;

  /** Required for a top-level comment; ignored for a reply. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  timecodeSec?: number;

  /** Present only when posting a reply. Must reference a top-level comment on the same mix. */
  @IsOptional()
  @IsString()
  parentId?: string;
}
