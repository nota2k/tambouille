import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateSourceDto {
  @IsOptional()
  // `MinLength(1)` seul laisse passer une chaîne d'espaces : elle a une
  // longueur, juste pas de contenu. Couper avant de valider fait qu'un label
  // vidé par l'utilisateur est traité comme vide, pas comme un texte valide.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
