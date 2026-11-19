import { DOMParser } from '@xmldom/xmldom';

import {
  AMBIENTES,
  IMPUESTO_ICE,
  IMPUESTO_IRBPNR,
  IMPUESTO_IVA,
  TIPOS_EMISION,
  etiquetaTarifa,
  nombreFormaPago,
} from '../../domain/catalogos';
import { ComprobanteIlegibleError } from '../../domain/errors/ride.errors';
import { CampoAdicionalRide, FacturaRide, LineaRide, PagoRide, TotalRide } from '../../domain/model/factura-ride.model';
import { LectorFacturaPort } from '../../domain/ports/lector-factura.port';

interface Autorizacion {
  numero: string;
  fecha: string;
}

type Documento = ReturnType<InstanceType<typeof DOMParser>['parseFromString']>;
type Elemento = NonNullable<Documento['documentElement']>;

const dinero = (valor: string | null): string => (Number(valor ?? 0) || 0).toFixed(2);

function fechaLegible(iso: string | null): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${dos(fecha.getDate())}/${dos(fecha.getMonth() + 1)}/${fecha.getFullYear()} ${dos(fecha.getHours())}:${dos(fecha.getMinutes())}:${dos(fecha.getSeconds())}`;
}

export class FacturaXmlReader implements LectorFacturaPort {
  // El XML firmado del SRI mas los datos de la autorizacion, convertidos en
  // lo que se ve impreso.
  leer(xml: string, autorizacion: Autorizacion): FacturaRide {
    const factura = this.raiz(xml);
    const tributaria = this.hijo(factura, 'infoTributaria');
    const info = this.hijo(factura, 'infoFactura');

    const totales = this.totales(info);

    return {
      emisor: {
        razonSocial: this.texto(tributaria, 'razonSocial') ?? '',
        nombreComercial: this.nombreComercial(tributaria),
        ruc: this.texto(tributaria, 'ruc') ?? '',
        dirMatriz: this.texto(tributaria, 'dirMatriz') ?? '',
        dirEstablecimiento: this.texto(info, 'dirEstablecimiento'),
        obligadoContabilidad: this.texto(info, 'obligadoContabilidad') ?? 'NO',
        contribuyenteEspecial: this.texto(info, 'contribuyenteEspecial'),
        agenteRetencion: this.texto(tributaria, 'agenteRetencion'),
        regimenRimpe: this.texto(tributaria, 'contribuyenteRimpe'),
      },
      comprobante: {
        titulo: 'FACTURA',
        numero: [
          this.texto(tributaria, 'estab'),
          this.texto(tributaria, 'ptoEmi'),
          this.texto(tributaria, 'secuencial'),
        ].join('-'),
        claveAcceso: this.texto(tributaria, 'claveAcceso') ?? '',
        numeroAutorizacion: autorizacion.numero,
        fechaAutorizacion: fechaLegible(autorizacion.fecha),
        ambiente: AMBIENTES[this.texto(tributaria, 'ambiente') ?? ''] ?? '',
        tipoEmision: TIPOS_EMISION[this.texto(tributaria, 'tipoEmision') ?? ''] ?? '',
        fechaEmision: this.texto(info, 'fechaEmision') ?? '',
        guiaRemision: this.texto(info, 'guiaRemision'),
      },
      comprador: {
        razonSocial: this.texto(info, 'razonSocialComprador') ?? '',
        identificacion: this.texto(info, 'identificacionComprador') ?? '',
        direccion: this.texto(info, 'direccionComprador'),
      },
      lineas: this.lineas(factura),
      pagos: this.pagos(info),
      totales,
      infoAdicional: this.infoAdicional(factura),
    };
  }

  // El sistema actual imprime solo la razon social: el nombre comercial se
  // muestra unicamente cuando es distinto.
  private nombreComercial(tributaria: Elemento): string | null {
    const comercial = this.texto(tributaria, 'nombreComercial');
    return comercial && comercial !== this.texto(tributaria, 'razonSocial') ? comercial : null;
  }

  private raiz(xml: string) {
    let documento;
    try {
      documento = new DOMParser({ onError: () => undefined }).parseFromString(xml, 'text/xml');
    } catch (error) {
      throw new ComprobanteIlegibleError(`El XML del comprobante no se pudo leer: ${(error as Error).message}`);
    }
    const raiz = documento?.documentElement;
    if (!raiz || raiz.nodeName !== 'factura') {
      throw new ComprobanteIlegibleError('El XML del comprobante no es una factura.');
    }
    return raiz;
  }

  private hijo(elemento: Elemento, nombre: string): Elemento {
    const encontrado = elemento.getElementsByTagName(nombre).item(0);
    if (!encontrado) throw new ComprobanteIlegibleError(`La factura no tiene <${nombre}>.`);
    return encontrado as unknown as Elemento;
  }

  private texto(elemento: Elemento, nombre: string): string | null {
    const encontrado = elemento.getElementsByTagName(nombre).item(0);
    const valor = encontrado?.textContent?.trim();
    return valor ? valor : null;
  }

  private elementos(padre: Elemento, nombre: string): Elemento[] {
    const lista = padre.getElementsByTagName(nombre);
    return Array.from({ length: lista.length }, (_, i) => lista.item(i) as unknown as Elemento);
  }

  private lineas(factura: Elemento): LineaRide[] {
    return this.elementos(factura, 'detalle').map((detalle) => {
      // El RIDE tiene tres columnas de detalle adicional; si el producto trae
      // mas, los sobrantes se juntan en la tercera.
      const adicionales = this.elementos(detalle, 'detAdicional').map(
        (det) => `${det.getAttribute('nombre') ?? ''}: ${det.getAttribute('valor') ?? ''}`,
      );

      return {
        codigoPrincipal: this.texto(detalle, 'codigoPrincipal') ?? '',
        codigoAuxiliar: this.texto(detalle, 'codigoAuxiliar') ?? '',
        // Cantidad y precio tal como vienen en el XML autorizado (1.3000).
        cantidad: this.texto(detalle, 'cantidad') ?? '',
        descripcion: this.texto(detalle, 'descripcion') ?? '',
        detalleAdicional1: adicionales[0] ?? '',
        detalleAdicional2: adicionales[1] ?? '',
        detalleAdicional3: adicionales.slice(2).join(' | '),
        precioUnitario: this.texto(detalle, 'precioUnitario') ?? '',
        descuento: dinero(this.texto(detalle, 'descuento')),
        precioTotal: dinero(this.texto(detalle, 'precioTotalSinImpuesto')),
      };
    });
  }

  private pagos(info: Elemento): PagoRide[] {
    return this.elementos(info, 'pago').map((pago) => ({
      formaPago: nombreFormaPago(this.texto(pago, 'formaPago') ?? ''),
      total: dinero(this.texto(pago, 'total')),
      plazo: this.texto(pago, 'plazo') ?? '',
      tiempo: this.texto(pago, 'unidadTiempo') ?? '',
    }));
  }

  // El mismo cuadro de totales del RIDE de siempre, con las mismas filas
  // fijas aunque vayan en cero. A pedido del cliente, se comporta identico al
  // sistema anterior: el porcentaje solo se muestra para 0%, 12% y 14%, y
  // "No sujeto de IVA" siempre en 0.00.
  private totales(info: Elemento): TotalRide[] {
    const impuestos = this.elementos(info, 'totalImpuesto').map((impuesto) => ({
      codigo: this.texto(impuesto, 'codigo') ?? '',
      codigoPorcentaje: this.texto(impuesto, 'codigoPorcentaje') ?? '',
      base: Number(this.texto(impuesto, 'baseImponible') ?? 0),
      valor: Number(this.texto(impuesto, 'valor') ?? 0),
    }));
    const iva = impuestos.filter((i) => i.codigo === IMPUESTO_IVA);
    const suma = (codigo: string) =>
      impuestos.filter((i) => i.codigo === codigo).reduce((total, i) => total + i.valor, 0);
    const base = (codigoPorcentaje: string) =>
      iva.filter((i) => i.codigoPorcentaje === codigoPorcentaje).reduce((total, i) => total + i.base, 0);

    // 6 "no sujeto" y 7 "exento" tienen su propia fila fija; el resto
    // (0, 12, 14, 15, ...) son las tarifas gravadas.
    const codigosGravados = [...new Set(iva.map((i) => i.codigoPorcentaje))].filter(
      (codigo) => codigo !== '0' && codigo !== '6' && codigo !== '7',
    );

    const totales: TotalRide[] = [{ etiqueta: 'SUBTOTAL 0%', valor: base('0').toFixed(2) }];

    for (const codigo of codigosGravados) {
      totales.push({ etiqueta: `SUBTOTAL ${etiquetaTarifa(codigo)}`, valor: base(codigo).toFixed(2) });
    }

    totales.push({ etiqueta: 'SUBTOTAL No sujeto de IVA', valor: '0.00' });
    totales.push({ etiqueta: 'SUBTOTAL SIN IMPUESTOS', valor: dinero(this.texto(info, 'totalSinImpuestos')) });
    totales.push({ etiqueta: 'DESCUENTO', valor: dinero(this.texto(info, 'totalDescuento')) });
    totales.push({ etiqueta: 'ICE', valor: suma(IMPUESTO_ICE).toFixed(2) });

    if (codigosGravados.length === 0) {
      totales.push({ etiqueta: 'IVA 0%', valor: '0.00' });
    }
    for (const codigo of codigosGravados) {
      const valor = iva.filter((i) => i.codigoPorcentaje === codigo).reduce((total, i) => total + i.valor, 0);
      totales.push({ etiqueta: `IVA ${etiquetaTarifa(codigo)}`, valor: valor.toFixed(2) });
    }

    const irbpnr = suma(IMPUESTO_IRBPNR);
    if (irbpnr > 0) totales.push({ etiqueta: 'IRBPNR', valor: irbpnr.toFixed(2) });

    totales.push({ etiqueta: 'PROPINA', valor: dinero(this.texto(info, 'propina')) });
    totales.push({ etiqueta: 'VALOR TOTAL', valor: dinero(this.texto(info, 'importeTotal')), destacado: true });
    return totales;
  }

  private infoAdicional(factura: Elemento): CampoAdicionalRide[] {
    return this.elementos(factura, 'campoAdicional').map((campo) => ({
      nombre: campo.getAttribute('nombre') ?? '',
      valor: campo.textContent?.trim() ?? '',
    }));
  }
}
