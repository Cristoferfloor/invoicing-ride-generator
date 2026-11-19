import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class GenerarRideQueryDto {
  @ApiPropertyOptional({
    enum: ['true', 'false'],
    description: 'true lo descarga como archivo; por defecto se muestra en el navegador.',
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  descargar?: string;
}
