import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Salud')
@Controller('salud')
export class SaludController {
  @Get()
  @ApiOperation({ summary: 'El servicio esta arriba' })
  estado() {
    return { estado: 'ok', servicio: 'ride-generator-service', version: '0.1.0' };
  }
}
