export const ARCHIVO_RIDE_PORT = Symbol('ARCHIVO_RIDE_PORT');

export interface RideParaGuardar {
  empresaRuc: string;
  // Como viene en el XML: dd/mm/aaaa.
  fechaEmision: string;
  numero: string;
  pdf: Buffer;
}

export interface ArchivoRidePort {
  // Deja una copia del PDF en una carpeta para poder abrirlo sin pedirlo.
  // Devuelve donde quedo, o null si no esta configurado.
  guardar(ride: RideParaGuardar): Promise<string | null>;
}
