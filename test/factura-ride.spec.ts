import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { etiquetaTarifa, nombreFormaPago } from '../src/domain/catalogos';
import { ComprobanteIlegibleError } from '../src/domain/errors/ride.errors';
import { FacturaRide } from '../src/domain/model/factura-ride.model';
import { FacturaXmlReader } from '../src/infrastructure/xml/factura-xml.reader';

const XML = readFileSync(join(__dirname, 'fixtures', 'factura-autorizada.xml'), 'utf8');
const AUTORIZACION = {
  numero: '1709202601239062547500110020010003472460034724610',
  fecha: '2026-09-17T08:18:40-05:00',
};

describe('lectura del XML autorizado', () => {
  const lector = new FacturaXmlReader();
  let factura: FacturaRide;

  beforeAll(() => {
    factura = lector.leer(XML, AUTORIZACION);
  });

  it('saca los datos del emisor y del comprobante', () => {
    expect(factura.emisor.razonSocial).toBe('ROOTS Y ROUTES S.A.S');
    expect(factura.emisor.ruc).toBe('2390625475001');
    expect(factura.emisor.obligadoContabilidad).toBe('SI');
    expect(factura.comprobante.numero).toBe('002-001-000347246');
    expect(factura.comprobante.claveAcceso).toHaveLength(49);
    expect(factura.comprobante.ambiente).toBe('Pruebas');
    expect(factura.comprobante.tipoEmision).toBe('Normal');
    expect(factura.comprobante.fechaEmision).toBe('17/09/2026');
    expect(factura.comprobante.numeroAutorizacion).toBe(AUTORIZACION.numero);
    expect(factura.comprobante.fechaAutorizacion).toMatch(/^17\/09\/2026 \d{2}:\d{2}:\d{2}$/);
  });

  it('identifica al comprador', () => {
    expect(factura.comprador.razonSocial).toBe('Consumidor Final');
    expect(factura.comprador.identificacion).toBe('9999999999999');
  });

  it('arma las lineas del detalle', () => {
    expect(factura.lineas).toHaveLength(2);
    expect(factura.lineas[0]).toMatchObject({
      codigoPrincipal: '9126',
      descripcion: 'TOALLA HIGIENICA NOSOTARS NATURAL BUENAS NOCHES X 10 U',
      cantidad: '1.00',
      precioUnitario: '3.9000',
      precioTotal: '3.90',
      detalleAdicional1: '',
      detalleAdicional2: '',
      detalleAdicional3: '',
    });
  });

  // A pedido del cliente, el RIDE se comporta igual que el sistema anterior:
  // solo reconoce 0%, 12% y 14%. Con IVA 15% deja el porcentaje en blanco.
  it('deja el IVA 15% sin porcentaje, igual que el sistema anterior', () => {
    const etiquetas = factura.totales.map((t) => `${t.etiqueta}=${t.valor}`);
    expect(etiquetas).toEqual([
      'SUBTOTAL 0%=3.90',
      'SUBTOTAL %=0.69',
      'SUBTOTAL No sujeto de IVA=0.00',
      'SUBTOTAL SIN IMPUESTOS=4.59',
      'DESCUENTO=0.00',
      'ICE=0.00',
      'IVA %=0.10',
      'PROPINA=0.00',
      'VALOR TOTAL=4.69',
    ]);
    expect(factura.totales.at(-1)).toEqual({ etiqueta: 'VALOR TOTAL', valor: '4.69', destacado: true });
  });

  it('traduce la forma de pago', () => {
    expect(factura.pagos).toEqual([
      { formaPago: 'SIN UTILIZACION DEL SISTEMA FINANCIERO', total: '4.69', plazo: '1', tiempo: 'DIAS' },
    ]);
  });

  it('muestra la informacion adicional tal como viene en el XML', () => {
    expect(factura.infoAdicional).toEqual([
      { nombre: 'Telefono', valor: '0980283975' },
      { nombre: 'Direccion', valor: 'SANTO DOMINGO' },
      { nombre: 'Email', valor: 'villafuertepedro94@gmail.com' },
      { nombre: 'Observaciones', valor: '-' },
      { nombre: 'RUC Proveedor', valor: '1790598616001' },
    ]);
  });

  it('avisa cuando el XML no es una factura', () => {
    expect(() => lector.leer('<notaCredito/>', AUTORIZACION)).toThrow(ComprobanteIlegibleError);
    expect(() => lector.leer('no soy xml', AUTORIZACION)).toThrow(ComprobanteIlegibleError);
  });
});

describe('catalogos del SRI', () => {
  // Identico al sistema anterior: solo reconoce estas tres. El resto queda
  // en blanco (a pedido del cliente, para verse igual al RIDE de siempre).
  it('solo traduce 0%, 12% y 14%; el resto queda en blanco', () => {
    expect(etiquetaTarifa('0')).toBe('0%');
    expect(etiquetaTarifa('2')).toBe('12%');
    expect(etiquetaTarifa('3')).toBe('14%');
    expect(etiquetaTarifa('4')).toBe('%');
    expect(etiquetaTarifa('5')).toBe('%');
    expect(etiquetaTarifa('99')).toBe('%');
  });

  it('traduce las formas de pago', () => {
    expect(nombreFormaPago('01')).toBe('SIN UTILIZACION DEL SISTEMA FINANCIERO');
    expect(nombreFormaPago('20')).toBe('OTROS CON UTILIZACION DEL SISTEMA FINANCIERO');
  });
});

