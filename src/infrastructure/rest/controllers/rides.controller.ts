import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiProduces, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { GenerarRideUseCase } from '../../../application/use-cases/generar-ride.use-case';
import { ListarRidesUseCase } from '../../../application/use-cases/listar-rides.use-case';
import { GenerarRideQueryDto } from '../dto/generar-ride.query.dto';
import { ListarRidesQueryDto } from '../dto/listar-rides.query.dto';
import { TokenAdminGuard } from '../guards/token-admin.guard';
import { ClaveAccesoPipe } from '../pipes/clave-acceso.pipe';

// Inicio del dia de hoy en Ecuador (UTC-5).
function inicioDeHoyEcuador(): Date {
  const ahora = new Date(Date.now() - 5 * 3600 * 1000);
  return new Date(`${ahora.toISOString().slice(0, 10)}T00:00:00-05:00`);
}

@ApiTags('RIDE')
@ApiSecurity('token-admin')
@Controller('v1/rides')
@UseGuards(TokenAdminGuard)
export class RidesController {
  constructor(
    private readonly generarRide: GenerarRideUseCase,
    private readonly listarRides: ListarRidesUseCase,
  ) {}

  // Que facturas hay y cuales ya tienen su RIDE listo. Por defecto, las de hoy.
  @Get()
  @ApiOperation({ summary: 'Lista de facturas autorizadas con el estado de su RIDE' })
  async lista(@Query() consulta: ListarRidesQueryDto) {
    const desde = consulta.desde ? new Date(consulta.desde) : inicioDeHoyEcuador();
    const hasta = consulta.hasta ? new Date(consulta.hasta) : new Date(Date.now() + 60_000);
    return {
      desde,
      hasta,
      ...(await this.listarRides.ejecutar({
        empresaRuc: consulta.empresaRuc,
        desde,
        hasta,
        limite: consulta.limite ?? 50,
      })),
    };
  }

  // El PDF no se guarda: se arma cada vez a partir del XML autorizado, que es
  // el documento que vale.
  @Get(':claveAcceso')
  @ApiOperation({ summary: 'RIDE en PDF de un comprobante autorizado' })
  @ApiParam({ name: 'claveAcceso', description: '49 digitos' })
  @ApiProduces('application/pdf')
  async ride(
    @Param('claveAcceso', ClaveAccesoPipe) claveAcceso: string,
    @Query() consulta: GenerarRideQueryDto,
    @Res() respuesta: Response,
  ): Promise<void> {
    const { pdf, nombreArchivo, logoVersion, duracionMs } = await this.generarRide.ejecutar(claveAcceso);
    const disposicion = consulta.descargar === 'true' ? 'attachment' : 'inline';
    respuesta
      .setHeader('Content-Type', 'application/pdf')
      .setHeader('Content-Disposition', `${disposicion}; filename="${nombreArchivo}"`)
      // Para que el Nucleo deje registrado con que logo se armo y cuanto tardo.
      .setHeader('X-Ride-Logo-Version', String(logoVersion ?? ''))
      .setHeader('X-Ride-Duracion-Ms', String(duracionMs))
      .send(pdf);
  }
}
