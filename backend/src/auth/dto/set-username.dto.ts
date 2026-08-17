import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SetUsernameDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message:
      'username may only contain letters, numbers, underscores, dots and dashes',
  })
  username!: string;
}
