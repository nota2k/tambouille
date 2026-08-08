import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MailModule } from './mail.module';
import { MailService } from './mail.service';

/**
 * Deliberately not AppModule. Booting the whole app would need Postgres and a
 * full set of R2 variables for what is only a check of the SMTP configuration,
 * and this has to stay runnable against production to be worth anything.
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), MailModule],
})
class MailTestModule {}

async function main(): Promise<void> {
  const to = process.argv[2];
  if (!to) {
    console.error('Usage: npm run mail:test -- <address>');
    process.exit(1);
  }

  const context = await NestFactory.createApplicationContext(MailTestModule);
  const mail = context.get(MailService);

  const sent = await mail.send({
    to,
    subject: 'Tambouille — test SMTP',
    text: 'Si tu lis ceci, la configuration SMTP fonctionne.',
  });

  await context.close();

  if (sent) {
    console.log(`OK: message accepted for ${to}`);
    process.exit(0);
  }

  console.error('FAILED: see the error logged above');
  process.exit(1);
}

void main();
