import { IsString, Matches } from 'class-validator';

/** Le pseudo saisi ici n'est jamais accepté ailleurs (voir `UpdateProfileDto`) :
 *  c'est le seul point d'entrée qui remet `incongruesVerifiedAt` à `null`. */
export class DemandeJetonDto {
  /** Le jeu de caractères est verrouillé parce que cette valeur part telle
   *  quelle dans `filter[author]` côté forum, et que ce filtre accepte
   *  plusieurs pseudos séparés par des virgules : sans cette garde, revendiquer
   *  « moi,victime » ferait remonter — puis importer — les messages d'un tiers.
   *  Trente caractères suffisent, la limite du forum est en deçà. */
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{1,30}$/, {
    message:
      'Pseudo Musiques Incongrues invalide : lettres, chiffres, tiret et tiret bas uniquement, 30 caractères au plus',
  })
  incongruesUsername!: string;
}
