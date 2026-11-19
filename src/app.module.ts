import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { GenerarRideUseCase } from './application/use-cases/generar-ride.use-case';
import { ListarRidesUseCase } from './application/use-cases/listar-rides.use-case';
import { VariablesEntorno, validarEntorno } from './config/entorno.validation';
import { ARCHIVO_RIDE_PORT } from './domain/ports/archivo-ride.port';
import { COMPROBANTES_PORT } from './domain/ports/comprobantes.port';
import { LECTOR_FACTURA_PORT } from './domain/ports/lector-factura.port';
import { LOGOS_PORT } from './domain/ports/logos.port';
import { PDF_PORT } from './domain/ports/pdf.port';
import { PLANTILLA_RIDE_PORT } from './domain/ports/plantilla-ride.port';
import { CarpetaRideAdapter } from './infrastructure/archivos/carpeta-ride.adapter';
import { HttpLogosAdapter } from './infrastructure/http/http-logos.adapter';
import { MongoComprobantesRepository } from './infrastructure/mongo/mongo-comprobantes.repository';
import { ChromiumPdfAdapter } from './infrastructure/pdf/chromium-pdf.adapter';
import { HandlebarsPlantillaAdapter } from './infrastructure/pdf/handlebars-plantilla.adapter';
import { RidesController } from './infrastructure/rest/controllers/rides.controller';
import { SaludController } from './infrastructure/rest/controllers/salud.controller';
import { TOKEN_ADMIN, TokenAdminGuard } from './infrastructure/rest/guards/token-admin.guard';
import { FacturaXmlReader } from './infrastructure/xml/factura-xml.reader';

type Entorno = ConfigService<VariablesEntorno, true>;

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: validarEntorno })],
  controllers: [RidesController, SaludController],
  providers: [
    GenerarRideUseCase,
    ListarRidesUseCase,

    // Puertos -> adaptadores
    {
      provide: COMPROBANTES_PORT,
      inject: [ConfigService],
      useFactory: (entorno: Entorno) =>
        new MongoComprobantesRepository(
          entorno.get('RIDE_MONGO_URL'),
          entorno.get('ARCHIVE_S3_URL', { infer: true }),
          entorno.get('ARCHIVE_S3_KEY_ID', { infer: true }),
          entorno.get('ARCHIVE_S3_SECRET', { infer: true }),
        ),
    },
    { provide: LECTOR_FACTURA_PORT, useClass: FacturaXmlReader },
    {
      provide: LOGOS_PORT,
      inject: [ConfigService],
      useFactory: (entorno: Entorno) =>
        new HttpLogosAdapter(
          entorno.get('CONFIG_URL'),
          entorno.get('CONFIG_ADMIN_TOKEN'),
          entorno.get('CONFIG_TIMEOUT_MS', { infer: true }),
        ),
    },
    { provide: PLANTILLA_RIDE_PORT, useClass: HandlebarsPlantillaAdapter },
    {
      provide: PDF_PORT,
      inject: [ConfigService],
      useFactory: (entorno: Entorno) =>
        new ChromiumPdfAdapter(
          entorno.get('CHROMIUM_PATH', { infer: true }),
          entorno.get('RIDE_MAX_PARALLEL', { infer: true }),
        ),
    },
    {
      provide: ARCHIVO_RIDE_PORT,
      inject: [ConfigService],
      useFactory: (entorno: Entorno) => new CarpetaRideAdapter(entorno.get('RIDE_PDF_FOLDER', { infer: true }) ?? null),
    },

    // Seguridad
    TokenAdminGuard,
    {
      provide: TOKEN_ADMIN,
      inject: [ConfigService],
      useFactory: (entorno: Entorno) => entorno.get('RIDE_ADMIN_TOKEN'),
    },
  ],
})
export class AppModule {}
