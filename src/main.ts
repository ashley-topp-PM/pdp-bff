import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env['CORS_ORIGIN'] ?? '*' });
  const port = parseInt(process.env['PORT'] ?? '3001', 10);
  await app.listen(port);
  console.log(JSON.stringify({ level: 'INFO', service: 'pdp-bff', message: `Listening on port ${port}` }));
}

bootstrap().catch((err: unknown) => {
  console.error(JSON.stringify({ level: 'ERROR', service: 'pdp-bff', message: 'Bootstrap failed', error: String(err) }));
  process.exit(1);
});
