import { Injectable, Logger } from '@nestjs/common';

import { LogoEmpresa, LogosPort } from '../../domain/ports/logos.port';

interface EnCache {
  logo: LogoEmpresa;
  hasta: number;
}

const VIDA_CACHE_MS = 10 * 60 * 1000;
const MAXIMO_EN_CACHE = 50;

// El logo lo guarda Configuracion, con versiones. Aqui se pide el que estaba
// vigente el dia de la autorizacion.
@Injectable()
export class HttpLogosAdapter implements LogosPort {
  private readonly logger = new Logger(HttpLogosAdapter.name);
  private readonly cache = new Map<string, EnCache>();

  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly tiempoLimiteMs: number,
  ) {}

  async vigenteEn(empresaRuc: string, fecha: Date): Promise<LogoEmpresa | null> {
    const dia = fecha.toISOString().slice(0, 10);
    const llave = `${empresaRuc}|${dia}`;
    const guardado = this.cache.get(llave);
    if (guardado && guardado.hasta > Date.now()) return guardado.logo;

    const logo = await this.pedir(empresaRuc, fecha);
    // Solo se recuerda el logo que existe: si la empresa todavia no lo ha
    // cargado, el proximo RIDE vuelve a preguntar y sale con el logo apenas
    // lo suban.
    if (logo) {
      if (this.cache.size >= MAXIMO_EN_CACHE) this.cache.clear();
      this.cache.set(llave, { logo, hasta: Date.now() + VIDA_CACHE_MS });
    }
    return logo;
  }

  private async pedir(empresaRuc: string, fecha: Date): Promise<LogoEmpresa | null> {
    const direccion = `${this.url}/v1/empresas/${empresaRuc}/logo?vigenteEn=${encodeURIComponent(fecha.toISOString())}`;
    const respuesta = await fetch(direccion, {
      headers: { 'X-Token-Admin': this.token },
      signal: AbortSignal.timeout(this.tiempoLimiteMs),
    });

    // Sin logo cargado el RIDE igual se emite, solo que sin imagen.
    if (respuesta.status === 404) return null;
    if (!respuesta.ok) {
      throw new Error(`Configuracion respondio ${respuesta.status} al pedir el logo de ${empresaRuc}.`);
    }

    const logo = {
      contenido: Buffer.from(await respuesta.arrayBuffer()),
      tipo: respuesta.headers.get('content-type') ?? 'image/png',
      version: Number(respuesta.headers.get('x-logo-version') ?? 0),
    };
    this.logger.log(JSON.stringify({ evento: 'logo_leido', empresaRuc, version: logo.version, bytes: logo.contenido.length }));
    return logo;
  }
}
