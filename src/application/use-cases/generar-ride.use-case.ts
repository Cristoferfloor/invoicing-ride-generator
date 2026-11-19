import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  ComprobanteIlegibleError,
  ComprobanteNoAutorizadoError,
  ComprobanteNoEncontradoError,
  TipoNoSoportadoError,
} from '../../domain/errors/ride.errors';
import { ARCHIVO_RIDE_PORT, ArchivoRidePort } from '../../domain/ports/archivo-ride.port';
import { COMPROBANTES_PORT, ComprobantesPort } from '../../domain/ports/comprobantes.port';
import { LECTOR_FACTURA_PORT, LectorFacturaPort } from '../../domain/ports/lector-factura.port';
import { LOGOS_PORT, LogosPort } from '../../domain/ports/logos.port';
import { PDF_PORT, PdfPort } from '../../domain/ports/pdf.port';
import { PLANTILLA_RIDE_PORT, PlantillaRidePort } from '../../domain/ports/plantilla-ride.port';

export interface RideGenerado {
  pdf: Buffer;
  nombreArchivo: string;
  logoVersion: number | null;
  duracionMs: number;
}

const FACTURA = '01';

@Injectable()
export class GenerarRideUseCase {
  private readonly logger = new Logger(GenerarRideUseCase.name);

  constructor(
    @Inject(COMPROBANTES_PORT) private readonly comprobantes: ComprobantesPort,
    @Inject(LECTOR_FACTURA_PORT) private readonly lector: LectorFacturaPort,
    @Inject(LOGOS_PORT) private readonly logos: LogosPort,
    @Inject(PLANTILLA_RIDE_PORT) private readonly plantilla: PlantillaRidePort,
    @Inject(PDF_PORT) private readonly pdf: PdfPort,
    @Inject(ARCHIVO_RIDE_PORT) private readonly archivos: ArchivoRidePort,
  ) {}

  async ejecutar(claveAcceso: string): Promise<RideGenerado> {
    const comienzo = Date.now();
    const comprobante = await this.comprobantes.buscarPorClave(claveAcceso);

    if (!comprobante) {
      throw new ComprobanteNoEncontradoError(`No existe un comprobante con la clave ${claveAcceso}.`);
    }
    if (comprobante.estado !== 'AUTORIZADO' || !comprobante.numeroAutorizacion || !comprobante.fechaAutorizacion) {
      throw new ComprobanteNoAutorizadoError(
        `El comprobante ${comprobante.numero} esta en ${comprobante.estado}: el RIDE se emite cuando el SRI lo autoriza.`,
      );
    }
    if (comprobante.tipo !== FACTURA) {
      throw new TipoNoSoportadoError(`Por ahora el RIDE solo esta hecho para facturas (tipo ${comprobante.tipo}).`);
    }
    if (!comprobante.xmlFirmado) {
      throw new ComprobanteIlegibleError(`El comprobante ${comprobante.numero} no tiene guardado su XML firmado.`);
    }

    const factura = this.lector.leer(comprobante.xmlFirmado, {
      numero: comprobante.numeroAutorizacion,
      fecha: comprobante.fechaAutorizacion,
    });

    // El logo que tenia la empresa cuando se autorizo la factura.
    const logo = await this.logos.vigenteEn(comprobante.empresaRuc, new Date(comprobante.fechaAutorizacion));
    const html = this.plantilla.factura(
      factura,
      logo ? { fuente: `data:${logo.tipo};base64,${logo.contenido.toString('base64')}` } : null,
    );
    const pdf = await this.pdf.desdeHtml(html, { izquierda: `${factura.emisor.ruc}  ${factura.comprobante.numero}` });

    // Copia en la carpeta de RIDE: asi se puede abrir sin pedirlo.
    const guardadoEn = await this.archivos.guardar({
      empresaRuc: comprobante.empresaRuc,
      fechaEmision: factura.comprobante.fechaEmision,
      numero: comprobante.numero,
      pdf,
    });
    const duracionMs = Date.now() - comienzo;

    this.logger.log(JSON.stringify({
      evento: 'ride_generado',
      empresaRuc: comprobante.empresaRuc,
      numero: comprobante.numero,
      claveAcceso,
      logoVersion: logo?.version ?? null,
      bytes: pdf.length,
      guardadoEn,
      duracionMs,
    }));

    return { pdf, nombreArchivo: `${comprobante.numero}.pdf`, logoVersion: logo?.version ?? null, duracionMs };
  }
}
