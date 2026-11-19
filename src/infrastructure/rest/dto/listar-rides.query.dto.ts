import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListarRidesQueryDto {
  @ApiPropertyOptional({ description: 'RUC de la empresa; sin esto, todas.', example: '2390625475001' })
  @IsOptional()
  @Matches(/^\d{10}00[1-9]$/, { message: 'empresaRuc debe tener 13 digitos y terminar en 001.' })
  empresaRuc?: string;

  @ApiPropertyOptional({ description: 'Desde esta fecha; por defecto, hoy.', example: '2026-09-17T00:00:00-05:00' })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'desde debe ser una fecha ISO 8601.' })
  desde?: string;

  @ApiPropertyOptional({ example: '2026-09-18T00:00:00-05:00' })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'hasta debe ser una fecha ISO 8601.' })
  hasta?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 500, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limite?: number;
}
