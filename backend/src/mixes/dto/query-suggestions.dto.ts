import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * DTO dédié plutôt que `QueryMixesDto` : celui-ci porte `limit = 20` par défaut, qui
 * écrasait silencieusement le défaut voulu ici. Les suggestions n'ont par ailleurs ni
 * pagination ni filtres — l'ancre est le mix affiché, pas une recherche.
 *
 * Partagée avec `/:id/by-artist`, qui a exactement les mêmes besoins : une seule
 * limite, bornée, sans pagination ni filtres. Deux classes identiques auraient
 * fini par diverger sur le plafond, qui est ici une protection et non un goût.
 *
 * Le plafond est bas parce que la route est publique et que `limit` sert de `take` sur un
 * groupBy : trois cartes suffisent à l'usage, douze couvrent une éventuelle grille plus large.
 */
export class QuerySuggestionsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  limit?: number = 3;
}
