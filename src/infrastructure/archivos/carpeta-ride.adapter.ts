import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { ArchivoRidePort, RideParaGuardar } from '../../domain/ports/archivo-ride.port';

// <ruc>/<aaaa-mm-dd>/<numero>.pdf, ordenado como en el sistema actual.
export function rutaDelRide(ride: Pick<RideParaGuardar, 'empresaRuc' | 'fechaEmision' | 'numero'>): string {
  const fecha = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(ride.fechaEmision);
  const dia = fecha ? `${fecha[3]}-${fecha[2]}-${fecha[1]}` : 'sin-fecha';
  return join(ride.empresaRuc, dia, `${ride.numero}.pdf`);
}

export class CarpetaRideAdapter implements ArchivoRidePort {
  constructor(private readonly carpeta: string | null) {}

  async guardar(ride: RideParaGuardar): Promise<string | null> {
    if (!this.carpeta) return null;

    const ruta = join(this.carpeta, rutaDelRide(ride));
    await mkdir(dirname(ruta), { recursive: true });
    // Primero a un temporal y luego se renombra: quien abra la carpeta nunca
    // ve un PDF a medio escribir.
    const temporal = `${ruta}.${process.pid}.tmp`;
    await writeFile(temporal, ride.pdf);
    await rename(temporal, ruta);
    return ruta;
  }
}
