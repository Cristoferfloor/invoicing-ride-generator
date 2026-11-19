export abstract class ErrorRide extends Error {
  abstract readonly codigo: string;

  constructor(mensaje: string) {
    super(mensaje);
    this.name = new.target.name;
  }
}

export class ComprobanteNoEncontradoError extends ErrorRide {
  readonly codigo = 'COMPROBANTE_NO_ENCONTRADO';
}

// El RIDE se emite del comprobante autorizado por el SRI: antes de eso no
// existe el numero de autorizacion que debe aparecer impreso.
export class ComprobanteNoAutorizadoError extends ErrorRide {
  readonly codigo = 'COMPROBANTE_NO_AUTORIZADO';
}

export class TipoNoSoportadoError extends ErrorRide {
  readonly codigo = 'TIPO_NO_SOPORTADO';
}



export class ComprobanteIlegibleError extends ErrorRide {
  readonly codigo = 'COMPROBANTE_ILEGIBLE';
}
