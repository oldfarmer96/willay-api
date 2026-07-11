import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  ConsoleLogger,
  Logger,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors/response/response.interceptor';
import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new ConsoleLogger({
      prefix: 'willay-API',
    }),
  });

  const logger = new Logger('bootstrap');
  const configService = app.get(ConfigService);

  const httpAdapter = app.getHttpAdapter().getInstance();
  httpAdapter.set('trust proxy', 1);

  const apiVersion = configService.getOrThrow<string>('API_VERSION');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: apiVersion,
  });

  const isProd = configService.getOrThrow<string>('NODE_ENV') === 'production';
  const corsOrigins = configService
    .getOrThrow<string>('CORS_ORIGINS')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: isProd ? corsOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  });

  app.use(cookieParser(), compression(), helmet());

  const apiPrefix = configService.getOrThrow<string>('API_PREFIX');

  app.setGlobalPrefix(apiPrefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor());

  app.enableShutdownHooks();

  const port = configService.getOrThrow<number>('PORT');
  const nodeEnv = configService.getOrThrow<number>('NODE_ENV');

  await app.listen(port, '0.0.0.0');

  logger.log(
    `Application is running on: ${await app.getUrl()}, NODE_ENV: ${nodeEnv}`,
  );
}

void bootstrap();
