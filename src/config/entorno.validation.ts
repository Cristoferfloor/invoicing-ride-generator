import { plainToInstance } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Matches, Max, Min, validateSync } from 'class-validator';

export class VariablesEntorno {
  @Matches(/^mongodb(\+srv)?:\/\/.+/, { message: 'RIDE_MONGO_URL debe ser mongodb://usuario:clave@host:puerto/base' })
  RIDE_MONGO_URL!: string;

  @IsString()
  @IsNotEmpty({ message: 'RIDE_ADMIN_TOKEN es obligatorio (header X-Token-Admin).' })
  RIDE_ADMIN_TOKEN!: string;

  @IsUrl({ require_tld: false, require_protocol: true }, { message: 'CONFIG_URL debe ser la direccion del servicio de Configuracion.' })
  CONFIG_URL!: string;

  @IsString()
  @IsNotEmpty({ message: 'CONFIG_ADMIN_TOKEN es obligatorio para pedir el logo.' })
  CONFIG_ADMIN_TOKEN!: string;

  @IsOptional()
  @IsString()
  CHROMIUM_PATH: string = '/usr/bin/chromium';

  // Carpeta donde queda una copia de cada RIDE generado. Sin ella, no se
  // guardan copias.
  @IsOptional()
  @IsString()
  RIDE_PDF_FOLDER?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(16)
  RIDE_MAX_PARALLEL: number = 4;

  @IsOptional()
  @IsInt()
  @Min(1000)
  CONFIG_TIMEOUT_MS: number = 5000;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3007;

  // Almacen propio (Garage, habla S3) donde se archivan los XML firmados
  // viejos. Sin esto, un comprobante archivado no se puede leer.
  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true }, { message: 'ARCHIVE_S3_URL debe ser la direccion de Garage.' })
  ARCHIVE_S3_URL?: string;

  @IsOptional()
  @IsString()
  ARCHIVE_S3_KEY_ID?: string;

  @IsOptional()
  @IsString()
  ARCHIVE_S3_SECRET?: string;
}

export function validarEntorno(entorno: Record<string, unknown>): VariablesEntorno {
  const variables = plainToInstance(VariablesEntorno, entorno, { enableImplicitConversion: true });
  const errores = validateSync(variables);
  if (errores.length > 0) {
    const detalle = errores.flatMap((e) => Object.values(e.constraints ?? {})).join('; ');
    throw new Error(`Variables de entorno invalidas: ${detalle}`);
  }
  return variables;
}
