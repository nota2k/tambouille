import { IsString, MinLength } from 'class-validator';

export class OidcLoginDto {
  @IsString()
  @MinLength(1)
  idToken!: string;
}
