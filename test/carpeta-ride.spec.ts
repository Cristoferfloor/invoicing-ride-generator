import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CarpetaRideAdapter, rutaDelRide } from '../src/infrastructure/archivos/carpeta-ride.adapter';

describe('copia del RIDE en carpeta', () => {
  const ride = { empresaRuc: '2390625475001', fechaEmision: '18/09/2026', numero: '005-001-000065864' };

  it('ordena por empresa y fecha de emision, como el sistema actual', () => {
    expect(rutaDelRide(ride)).toBe(join('2390625475001', '2026-09-18', '005-001-000065864.pdf'));
    expect(rutaDelRide({ ...ride, fechaEmision: '' })).toBe(join('2390625475001', 'sin-fecha', '005-001-000065864.pdf'));
  });

  it('escribe el PDF y no deja temporales', async () => {
    const carpeta = await mkdtemp(join(tmpdir(), 'rides-'));
    try {
      const ruta = await new CarpetaRideAdapter(carpeta).guardar({ ...ride, pdf: Buffer.from('%PDF-prueba') });

      expect(ruta).toBe(join(carpeta, rutaDelRide(ride)));
      expect((await readFile(ruta!)).toString()).toBe('%PDF-prueba');
      expect(await readdir(join(carpeta, '2390625475001', '2026-09-18'))).toEqual(['005-001-000065864.pdf']);
    } finally {
      await rm(carpeta, { recursive: true, force: true });
    }
  });

  it('sin carpeta configurada no guarda nada', async () => {
    expect(await new CarpetaRideAdapter(null).guardar({ ...ride, pdf: Buffer.from('x') })).toBeNull();
  });
});
