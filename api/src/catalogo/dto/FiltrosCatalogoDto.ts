// src/catalogo/dto/filtros-catalogo.dto.ts
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class FiltrosCatalogoDto {
  @IsOptional()
  @IsString()
  busqueda?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  categoriaId?: number;
}
