import { IsString, IsUUID } from 'class-validator';

export class AddMixDto {
  @IsString()
  @IsUUID()
  mixId!: string;
}
