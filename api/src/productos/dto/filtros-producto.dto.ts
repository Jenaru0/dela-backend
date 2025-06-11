import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class FiltrosProductosDto {
  @IsOptional()
  @IsString()
  busqueda?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  categoriaId?: number;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  precioMin?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  precioMax?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  destacado?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  disponible?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['nombre', 'precioUnitario', 'creadoEn', 'destacado'])
  orderBy?: 'nombre' | 'precioUnitario' | 'creadoEn' | 'destacado';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(50)
  limit?: number;
}
