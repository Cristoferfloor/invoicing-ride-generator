export const LOGOS_PORT = Symbol('LOGOS_PORT');

export interface LogoEmpresa {
  contenido: Buffer;
  tipo: string;
  version: number;
}

export interface LogosPort {
  // El logo que la empresa tenia en esa fecha, para que un RIDE reimpreso
  // salga igual que el original. null si la empresa no tiene logo cargado.
  vigenteEn(empresaRuc: string, fecha: Date): Promise<LogoEmpresa | null>;
}
