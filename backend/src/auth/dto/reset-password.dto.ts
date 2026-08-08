import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @MinLength(1)
  token!: string;

  // Identical to `SetPasswordDto` and to registration on purpose: a reset must
  // not be a way to set a password the other two paths would have refused.
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
