import 'dotenv/config'; // must run first: @Cron decorators read TIME_ZONE at import time
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const port = config.get<number>('app.port');
  const isProd = process.env.NODE_ENV === 'production';

  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  if (isProd) app.set('trust proxy', 1); // real client IP for rate limiting behind a reverse proxy

  // Uploaded images/PDFs are embedded by the frontend, which lives on another origin
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
  app.enableCors({ origin: config.get<string[]>('app.corsOrigins'), credentials: true });
  // Attachments arrive as base64 data URLs inside JSON
  app.use(json({ limit: '15mb' }));
  app.use(urlencoded({ limit: '15mb', extended: true }));
  app.use(compression({ level: 6, threshold: 20_000 }));
  app.useStaticAssets(config.get<string>('app.uploadDir'), { prefix: '/uploads', index: false, dotfiles: 'deny' });

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('SBO').setDescription('Smart Bill Operation API').setVersion('1.0').addBearerAuth().build(),
  );
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  Logger.log(`SBO API listening on http://localhost:${port}/api`, 'Bootstrap');
}
bootstrap();
