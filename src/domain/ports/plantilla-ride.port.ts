import { FacturaRide } from '../model/factura-ride.model';

export const PLANTILLA_RIDE_PORT = Symbol('PLANTILLA_RIDE_PORT');

export interface LogoParaRide {
  // La imagen embebida en el HTML (data:...), para no depender de la red al
  // momento de imprimir.
  fuente: string;
}

export interface PlantillaRidePort {
  factura(datos: FacturaRide, logo: LogoParaRide | null): string;
}
