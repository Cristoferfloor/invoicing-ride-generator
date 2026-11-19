import { Inject, Injectable } from '@nestjs/common';

import { COMPROBANTES_PORT, ComprobantesPort, FiltroComprobantes } from '../../domain/ports/comprobantes.port';

export interface RideEnLista {
  numero: string;
  claveAcceso: string;
  autorizadoEn: string | null;
  rideGeneradoEn: Date | null;
  bytes: number | null;
  logoVersion: number | null;
  // Donde se pide el PDF de esta factura.
  enlace: string;
}

@Injectable()
export class ListarRidesUseCase {
  constructor(@Inject(COMPROBANTES_PORT) private readonly comprobantes: ComprobantesPort) {}

  async ejecutar(filtro: FiltroComprobantes): Promise<{ total: number; listos: number; rides: RideEnLista[] }> {
    const comprobantes = await this.comprobantes.listar(filtro);
    const rides = comprobantes.map((c) => ({
      numero: c.numero,
      claveAcceso: c.claveAcceso,
      autorizadoEn: c.autorizadoEn,
      rideGeneradoEn: c.rideGeneradoEn,
      bytes: c.bytes,
      logoVersion: c.logoVersion,
      enlace: `/v1/rides/${c.claveAcceso}`,
    }));

    return { total: rides.length, listos: rides.filter((r) => r.rideGeneradoEn !== null).length, rides };
  }
}
