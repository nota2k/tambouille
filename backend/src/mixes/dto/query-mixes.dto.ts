import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryMixesDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  tags?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  @IsIn(['recent', 'plays'])
  sort?: 'recent' | 'plays';

  /**
   * Ne garder que les mix déposés depuis tant de jours.
   *
   * Existe pour le mix mis en avant sur l'accueil, qui est « le plus écouté du
   * dernier mois » : la fenêtre doit être appliquée AVANT le tri, donc en base.
   * La calculer côté client reviendrait à trier les dix mix déjà chargés, et à
   * manquer le bon dès qu'il en paraît plus de dix dans le mois.
   *
   * Plafonné à un an : au-delà, la fenêtre ne filtre plus rien sur ce
   * catalogue, et un entier libre venu de l'URL n'a pas à voyager jusqu'à
   * Prisma.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  sinceDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
