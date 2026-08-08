import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ImportsService } from './imports.service';

class ResolveDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  url!: string;
}

class ItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  ref!: string;
}

@Controller('imports')
@UseGuards(JwtAuthGuard)
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  @Post('resolve')
  resolve(@Body() dto: ResolveDto) {
    // A bare word is the current Mixcloud usage — a username, not a URL — and
    // it keeps working without a mode switch or a second field.
    const raw = dto.url.trim();
    const url = /^[A-Za-z0-9_-]{1,64}$/.test(raw)
      ? `https://www.mixcloud.com/${raw}/`
      : raw;
    return this.imports.resolve(url);
  }

  @Post('item')
  importItem(@Body() dto: ItemDto) {
    return this.imports.importItem(dto.ref);
  }
}
