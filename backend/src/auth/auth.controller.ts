import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { SetUsernameDto } from './dto/set-username.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUserId } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
}
