export const COMPROBANTES_PORT = Symbol('COMPROBANTES_PORT');

export interface ComprobanteGuardado {
  claveAcceso: string;
  empresaRuc: string;
  tipo: string;
  estado: string;
  numero: string;
  xmlFirmado: string | null;
  numeroAutorizacion: string | null;
  fechaAutorizacion: string | null;
}

// Para la lista: lo que se ve de un comprobante sin abrir su PDF.
export interface ResumenComprobante {
  claveAcceso: string;
  empresaRuc: string;
  numero: string;
  estado: string;
  autorizadoEn: string | null;
  rideGeneradoEn: Date | null;
  bytes: number | null;
  logoVersion: number | null;
}

export interface FiltroComprobantes {
  empresaRuc?: string;
  desde: Date;
  hasta: Date;
  limite: number;
}

export interface ComprobantesPort {
  buscarPorClave(claveAcceso: string): Promise<ComprobanteGuardado | null>;
  listar(filtro: FiltroComprobantes): Promise<ResumenComprobante[]>;
}
