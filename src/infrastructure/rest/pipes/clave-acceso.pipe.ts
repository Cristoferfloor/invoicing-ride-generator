import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const CLAVE_ACCESO = /^\d{49}$/;

@Injectable()
export class ClaveAccesoPipe implements PipeTransform<string, string> {
  transform(clave: string): string {
    if (!CLAVE_ACCESO.test(clave)) throw new BadRequestException('La clave de acceso debe tener 49 digitos.');
    return clave;
  }
}
