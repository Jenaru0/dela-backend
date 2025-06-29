import { PartialType } from '@nestjs/mapped-types';
import { CreateImagenProductoDto } from './crear-imagen-producto.dto';

export class UpdateImagenProductoDto extends PartialType(
  CreateImagenProductoDto
) {}
