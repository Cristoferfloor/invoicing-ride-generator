import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { HandlebarsPlantillaAdapter } from '../src/infrastructure/pdf/handlebars-plantilla.adapter';
import { FacturaXmlReader } from '../src/infrastructure/xml/factura-xml.reader';

const XML = readFileSync(join(__dirname, 'fixtures', 'factura-autorizada.xml'), 'utf8');

describe('plantilla del RIDE', () => {
  const factura = new FacturaXmlReader().leer(XML, {
    numero: '1709202601239062547500110020010003472460034724610',
    fecha: '2026-09-17T08:18:40-05:00',
  });
  const plantilla = new HandlebarsPlantillaAdapter();

  it('imprime lo que exige el SRI, con el codigo de barras de la clave', () => {
    const html = plantilla.factura(factura, null);

    for (const texto of [
      'ROOTS Y ROUTES S.A.S', '2390625475001', 'FACTURA', '002-001-000347246',
      '1709202601239062547500110020010003472460034724610', 'Pruebas', 'Normal',
      'Consumidor Final', 'SUBTOTAL %', 'IVA %',
      'SIN UTILIZACION DEL SISTEMA FINANCIERO', 'RUC Proveedor',
    ]) {
      expect(html).toContain(texto);
    }
    expect(html).toContain('data:image/svg+xml;base64,');
  });

  it('embebe el logo de la empresa cuando lo hay', () => {
    expect(plantilla.factura(factura, null)).not.toContain('class="logo"');
    expect(plantilla.factura(factura, { fuente: 'data:image/png;base64,AAA' })).toContain('src="data:image/png;base64,AAA"');
  });

  it('escapa el texto que viene del ERP', () => {
    const conHtml = structuredClone(factura);
    conHtml.lineas[0].descripcion = '<script>alert(1)</script> TORNILLO 1" & 2"';
    const html = plantilla.factura(conHtml, null);

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('TORNILLO 1&quot; &amp; 2&quot;');
  });
});
