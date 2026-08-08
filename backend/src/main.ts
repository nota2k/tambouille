import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // DO NOT REMOVE — it looks redundant locally and is not.
  //
  // In production this process runs under CloudLinux Passenger behind Apache
  // (see `api/.htaccess`), so the socket Express sees belongs to the Passenger
  // agent, not to the client. Without this line `req.ip` is that agent's
  // address — the same value for every request on earth — and anything keyed
  // on it silently becomes a single global bucket. `PasswordResetService`'s
  // per-caller rate limit is exactly such a thing: one attacker would have
  // spent the whole site's budget and locked every user out of password
  // recovery, which is the one door a locked-out user has left.
  //
  // The value is 1, not `true`. `true` trusts the entire `X-Forwarded-For`
  // chain, so a client could prepend any address it liked and mint itself a
  // fresh rate-limit identity per request. 1 trusts exactly one hop — the
  // Apache in front of us — and takes the rightmost entry Apache appended,
  // which is the real peer. Raise it only if a further proxy is added.
  //
  // Locally there is no proxy and no `X-Forwarded-For`, so this changes
  // nothing: `req.ip` stays the loopback socket address.
  app.set('trust proxy', 1);

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useStaticAssets(join(__dirname, '..', '..', 'uploads'), { prefix: '/uploads' });

  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
