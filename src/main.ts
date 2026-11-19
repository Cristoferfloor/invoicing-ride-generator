import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { VariablesEntorno } from './config/entorno.validation';
import { ErrorRideFilter } from './infrastructure/rest/filters/error-ride.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new ErrorRideFilter());

  const documento = new DocumentBuilder()
    .setTitle('Generador RIDE')
    .setDescription('RIDE en PDF de los comprobantes autorizados, a partir del XML autorizado')
    .setVersion('0.1.0')
    .addApiKey({ type: 'apiKey', in: 'header', name: 'X-Token-Admin' }, 'token-admin')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, documento));

  const puerto = app.get<ConfigService<VariablesEntorno, true>>(ConfigService).get('PORT', { infer: true });
  await app.listen(puerto, '0.0.0.0');

  new Logger('Bootstrap').log(`ride-generator-service escuchando en :${puerto} (documentacion en /docs)`);
}

void bootstrap();
