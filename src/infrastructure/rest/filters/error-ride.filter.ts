import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

import { ErrorRide } from '../../../domain/errors/ride.errors';

const ESTADO_HTTP: Record<string, HttpStatus> = {
  COMPROBANTE_NO_ENCONTRADO: HttpStatus.NOT_FOUND,
  COMPROBANTE_NO_AUTORIZADO: HttpStatus.CONFLICT,
  TIPO_NO_SOPORTADO: HttpStatus.NOT_IMPLEMENTED,
  COMPROBANTE_ILEGIBLE: HttpStatus.UNPROCESSABLE_ENTITY,
};

@Catch(ErrorRide)
export class ErrorRideFilter implements ExceptionFilter<ErrorRide> {
  private readonly logger = new Logger(ErrorRideFilter.name);

  catch(excepcion: ErrorRide, host: ArgumentsHost): void {
    this.logger.warn(JSON.stringify({ evento: 'peticion_rechazada', error: excepcion.codigo, mensaje: excepcion.message }));
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(ESTADO_HTTP[excepcion.codigo] ?? HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ estado: 'RECHAZADO', error: excepcion.codigo, mensaje: excepcion.message });
  }
}
