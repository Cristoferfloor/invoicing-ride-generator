// Tablas del SRI (ficha tecnica de comprobantes electronicos).

// Como los escribe el RIDE del sistema actual.
export const AMBIENTES: Record<string, string> = {
  '1': 'Pruebas',
  '2': 'Producción',
};

export const TIPOS_EMISION: Record<string, string> = {
  '1': 'Normal',
  '2': 'Indisponibilidad del sistema',
};

// Codigos de impuesto: 2 IVA, 3 ICE, 5 IRBPNR.
export const IMPUESTO_IVA = '2';
export const IMPUESTO_ICE = '3';
export const IMPUESTO_IRBPNR = '5';

// El sistema anterior solo reconoce estas tres tarifas de IVA. Para
// cualquier otra (15%, 5%, ...) deja el porcentaje en blanco: a pedido del
// cliente, el RIDE nuevo se comporta igual, para verse identico al que sus
// clientes ya conocen.
const TARIFAS_CONOCIDAS: Record<string, string> = {
  '0': '0%',
  '2': '12%',
  '3': '14%',
};

export function etiquetaTarifa(codigoPorcentaje: string): string {
  return TARIFAS_CONOCIDAS[codigoPorcentaje] ?? '%';
}

export const FORMAS_PAGO: Record<string, string> = {
  '01': 'SIN UTILIZACION DEL SISTEMA FINANCIERO',
  '15': 'COMPENSACION DE DEUDAS',
  '16': 'TARJETA DE DEBITO',
  '17': 'DINERO ELECTRONICO',
  '18': 'TARJETA PREPAGO',
  '19': 'TARJETA DE CREDITO',
  '20': 'OTROS CON UTILIZACION DEL SISTEMA FINANCIERO',
  '21': 'ENDOSO DE TITULOS',
  // Codigos anteriores, para comprobantes viejos.
  '02': 'CHEQUE PROPIO',
  '03': 'CHEQUE CERTIFICADO',
  '04': 'CHEQUE DE GERENCIA',
  '05': 'CHEQUE DEL EXTERIOR',
  '06': 'DEBITO DE CUENTA',
  '07': 'TRANSFERENCIA PROPIO BANCO',
  '08': 'TRANSFERENCIA OTRO BANCO NACIONAL',
  '09': 'TRANSFERENCIA BANCO EXTERIOR',
  '10': 'TARJETA DE CREDITO NACIONAL',
  '11': 'TARJETA DE CREDITO INTERNACIONAL',
  '12': 'GIRO',
  '13': 'DEPOSITO EN CUENTA',
  '14': 'ENDOSO DE INVERSION',
};

export function nombreFormaPago(codigo: string): string {
  return FORMAS_PAGO[codigo] ?? codigo;
}
