import { Injectable } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Handlebars from 'handlebars';
import { toSVG } from 'bwip-js';

import { FacturaRide } from '../../domain/model/factura-ride.model';
import { LogoParaRide, PlantillaRidePort } from '../../domain/ports/plantilla-ride.port';

const CARPETA = join(__dirname, 'plantillas');

// El diseno del RIDE: uno solo para todas las empresas. Lo que cambia por
// empresa (el logo) entra como dato.
@Injectable()
export class HandlebarsPlantillaAdapter implements PlantillaRidePort {
  private readonly plantilla = Handlebars.compile(readFileSync(join(CARPETA, 'factura.hbs'), 'utf8'));
  private readonly estilos = readFileSync(join(CARPETA, 'estilos.css'), 'utf8');

  factura(datos: FacturaRide, logo: LogoParaRide | null): string {
    return this.plantilla({
      ...datos,
      logo,
      estilos: this.estilos,
      codigoBarras: this.codigoDeBarras(datos.comprobante.claveAcceso),
    });
  }

  // La clave de acceso en codigo de barras, como pide el SRI para el RIDE.
  private codigoDeBarras(claveAcceso: string): string {
    // Sin preserveAspectRatio="none" el navegador achata las barras para conservar la
    // proporcion; asi ocupan todo el alto que les da el RIDE.
    const svg = toSVG({ bcid: 'code128', text: claveAcceso, height: 10, scale: 1, includetext: false }).replace(
      '<svg ',
      '<svg preserveAspectRatio="none" ',
    );
    return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
  }
}
