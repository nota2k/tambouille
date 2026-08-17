import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { PasswordResetService } from './password-reset.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { OidcLoginDto } from './dto/oidc-login.dto';
import { SetUsernameDto } from './dto/set-username.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUserId } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  google(@Body() dto: GoogleLoginDto) {
    return this.authService.loginWithGoogle(dto.idToken);
  }

  // Guarded, unlike `POST google` above: the session is what proves the caller
  // owns the account the Google identity gets attached to.
  @Post('google/link')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  linkGoogle(@CurrentUserId() userId: string, @Body() dto: GoogleLoginDto) {
    return this.authService.linkGoogle(userId, dto.idToken);
  }

  @Post('oidc')
  @HttpCode(HttpStatus.OK)
  oidc(@Body() dto: OidcLoginDto) {
    return this.authService.loginWithKeycloak(dto.idToken);
  }

  // Guarded, unlike `POST oidc` above, for the same reason `google/link` is:
  // the session is what proves the caller owns the account the membership card
  // gets attached to.
  @Post('oidc/link')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  linkOidc(@CurrentUserId() userId: string, @Body() dto: OidcLoginDto) {
    return this.authService.linkKeycloak(userId, dto.idToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUserId() userId: string) {
    return this.authService.me(userId);
  }

  @Post('username')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  setUsername(@CurrentUserId() userId: string, @Body() dto: SetUsernameDto) {
    return this.authService.setUsername(userId, dto.username);
  }

  @Post('password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  setPassword(@CurrentUserId() userId: string, @Body() dto: SetPasswordDto) {
    return this.authService.setPassword(userId, dto.password);
  }

  // Unguarded, and 204 for every caller — the point of the endpoint is that
  // someone locked out can use it. The status is fixed here rather than in the
  // service so that no future branch can make it depend on the address: a body
  // or a code that differed for a registered address would turn this form into
  // a way of discovering who has an account.
  @Post('password/forgot')
  @HttpCode(HttpStatus.NO_CONTENT)
  forgotPassword(@Body() dto: ForgotPasswordDto, @Ip() ip: string) {
    return this.passwordResetService.forgot(dto.email, ip);
  }

  // Also unguarded: the token is the credential. 204 rather than a session —
  // a valid token proves control of the mailbox, not that the person at the
  // keyboard is the one who asked, so the new password gets used to sign in.
  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordResetService.reset(dto.token, dto.password);
  }
}
