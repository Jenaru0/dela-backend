import {
  IsString,
  IsOptional,
  MaxLength,
  IsNumber,
  IsInt,
  Min,
  IsPositive,
  IsBoolean,
} from 'class-validator';

export class CreateProductoDto {
  @IsString()
  @MaxLength(200)
  nombre: string;

  @IsString()
  @MaxLength(50)
  sku: string;

  @IsString()
  @MaxLength(150)
  slug: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcionCorta?: string;

  @IsNumber()
  @IsPositive()
  precioUnitario: number;

  @IsOptional()
  @IsNumber()
  precioAnterior?: number;
  @IsInt()
  @Min(0)
  stock: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockMinimo?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unidadMedida?: string;

  @IsOptional()
  @IsNumber()
  peso?: number;

  @IsOptional()
  infoNutricional?: object;

  @IsOptional()
  @IsBoolean()
  destacado?: boolean;

  @IsInt()
  categoriaId: number;

  @IsOptional()
  estado?: 'ACTIVO' | 'INACTIVO';
}
