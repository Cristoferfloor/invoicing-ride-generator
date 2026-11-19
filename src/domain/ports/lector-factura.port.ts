import { FacturaRide } from '../model/factura-ride.model';

export const LECTOR_FACTURA_PORT = Symbol('LECTOR_FACTURA_PORT');

export interface LectorFacturaPort {
  // Del XML autorizado por el SRI a lo que se imprime.
  leer(xml: string, autorizacion: { numero: string; fecha: string }): FacturaRide;
}
