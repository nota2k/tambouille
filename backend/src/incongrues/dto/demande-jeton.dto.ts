import { IsString, MaxLength, MinLength } from 'class-validator';

/** Le pseudo saisi ici n'est jamais accepté ailleurs (voir `UpdateProfileDto`) :
 *  c'est le seul point d'entrée qui remet `incongruesVerifiedAt` à `null`. */
export class DemandeJetonDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  incongruesUsername!: string;
}
