export const PDF_PORT = Symbol('PDF_PORT');

export interface PiePdf {
  izquierda: string;
}

export interface PdfPort {
  desdeHtml(html: string, pie: PiePdf): Promise<Buffer>;
}
