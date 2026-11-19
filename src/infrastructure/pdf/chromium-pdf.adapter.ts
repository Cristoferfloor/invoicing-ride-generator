import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import puppeteer, { Browser } from 'puppeteer-core';

import { PdfPort, PiePdf } from '../../domain/ports/pdf.port';

const PIE = (izquierda: string) => `
  <div style="width:100%;font-size:7px;font-family:Helvetica,Arial,sans-serif;color:#444;padding:0 12mm;display:flex;justify-content:space-between">
    <span>${izquierda}</span><span>Pagina <span class="pageNumber"></span> de <span class="totalPages"></span></span>
  </div>`;

// Convierte el HTML del RIDE en PDF con Chromium. El navegador se abre una
// sola vez y se reutiliza; cada RIDE usa su propia pestana.
@Injectable()
export class ChromiumPdfAdapter implements PdfPort, OnApplicationShutdown {
  private readonly logger = new Logger(ChromiumPdfAdapter.name);
  private navegador: Browser | null = null;
  private abriendo: Promise<Browser> | null = null;
  private enCurso = 0;
  private readonly esperando: Array<() => void> = [];

  constructor(
    private readonly ejecutable: string,
    private readonly maximoEnParalelo: number,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    await this.navegador?.close();
    this.navegador = null;
  }

  async desdeHtml(html: string, pie: PiePdf): Promise<Buffer> {
    await this.tomarTurno();
    try {
      const navegador = await this.abrirNavegador();
      const pagina = await navegador.newPage();
      try {
        // La pagina no necesita internet: el logo y el codigo de barras van
        // embebidos en el HTML.
        await pagina.setJavaScriptEnabled(false);
        await pagina.setContent(html, { waitUntil: 'load' });
        await pagina.emulateMediaType('print');
        return Buffer.from(
          await pagina.pdf({
            format: 'A4',
            printBackground: true,
            // Margenes holgados: asi nada queda pegado al borde ni se pierde
            // al imprimir.
            margin: { top: '5mm', bottom: '12mm', left: '10mm', right: '10mm' },
            displayHeaderFooter: true,
            headerTemplate: '<div></div>',
            footerTemplate: PIE(pie.izquierda),
          }),
        );
      } finally {
        await pagina.close();
      }
    } finally {
      this.soltarTurno();
    }
  }

  private async abrirNavegador(): Promise<Browser> {
    if (this.navegador?.connected) return this.navegador;
    if (this.abriendo) return this.abriendo;

    this.abriendo = puppeteer
      .launch({
        executablePath: this.ejecutable,
        headless: true,
        // Dentro del contenedor no hay espacio de nombres de usuario para el
        // sandbox de Chromium, y el contenido que se imprime es nuestro.
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--font-render-hinting=none'],
      })
      .then((navegador) => {
        this.navegador = navegador;
        this.abriendo = null;
        this.logger.log(JSON.stringify({ evento: 'chromium_abierto' }));
        return navegador;
      })
      .catch((error) => {
        this.abriendo = null;
        throw error;
      });

    return this.abriendo;
  }

  // Tope de RIDEs a la vez: cada pestana de Chromium consume memoria.
  private async tomarTurno(): Promise<void> {
    if (this.enCurso < this.maximoEnParalelo) {
      this.enCurso++;
      return;
    }
    await new Promise<void>((seguir) => this.esperando.push(seguir));
    this.enCurso++;
  }

  private soltarTurno(): void {
    this.enCurso--;
    this.esperando.shift()?.();
  }
}
