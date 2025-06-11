import { PartialType } from '@nestjs/mapped-types';
import { CreateProductoDto } from './crear-producto.dto';

export class UpdateProductoDto extends PartialType(CreateProductoDto) {}
