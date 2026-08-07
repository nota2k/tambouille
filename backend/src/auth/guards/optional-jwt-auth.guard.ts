import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Like JwtAuthGuard, but never rejects: an invalid/missing token just leaves `request.user` unset. */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(_err: unknown, user: unknown): TUser {
    return (user ?? undefined) as TUser;
  }
}
