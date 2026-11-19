// Lo que se imprime en el RIDE de una factura. Todo sale del XML autorizado:
// aqui ya viene listo para mostrar, con los textos y los numeros formateados.

export interface EmisorRide {
  razonSocial: string;
  nombreComercial: string | null;
  ruc: string;
  dirMatriz: string;
  dirEstablecimiento: string | null;
  obligadoContabilidad: string;
  contribuyenteEspecial: string | null;
  agenteRetencion: string | null;
  regimenRimpe: string | null;
}

export interface ComprobanteRide {
  titulo: string;
  numero: string;
  claveAcceso: string;
  numeroAutorizacion: string;
  fechaAutorizacion: string;
  ambiente: string;
  tipoEmision: string;
  fechaEmision: string;
  guiaRemision: string | null;
}

export interface CompradorRide {
  razonSocial: string;
  identificacion: string;
  direccion: string | null;
}

export interface LineaRide {
  codigoPrincipal: string;
  codigoAuxiliar: string;
  cantidad: string;
  descripcion: string;
  // El RIDE trae tres columnas de detalle adicional.
  detalleAdicional1: string;
  detalleAdicional2: string;
  detalleAdicional3: string;
  precioUnitario: string;
  descuento: string;
  precioTotal: string;
}

export interface PagoRide {
  formaPago: string;
  total: string;
  plazo: string;
  tiempo: string;
}

export interface TotalRide {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
}

export interface CampoAdicionalRide {
  nombre: string;
  valor: string;
}

export interface FacturaRide {
  emisor: EmisorRide;
  comprobante: ComprobanteRide;
  comprador: CompradorRide;
  lineas: LineaRide[];
  pagos: PagoRide[];
  totales: TotalRide[];
  infoAdicional: CampoAdicionalRide[];
}
