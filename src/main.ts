import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  ConsoleLogger,
  Logger,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import helmet from 'helmet';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new ConsoleLogger({
      prefix: 'willay-API',
    }),
  });

  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);

  app.set('trust proxy', 1);

  const apiVersion = configService.getOrThrow<string>('API_VERSION');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: apiVersion,
  });

  const nodeEnv = configService.getOrThrow<string>('NODE_ENV');
  const isProduction = nodeEnv === 'production';

  const corsOrigins = configService
    .getOrThrow<string>('CORS_ORIGINS')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: isProduction ? corsOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

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

  await app.listen(port, '0.0.0.0');

  logger.log(
    `Aplicación ejecutándose en ${await app.getUrl()} | NODE_ENV=${nodeEnv}`,
  );
}

void bootstrap();
