import {
  IsString,
  IsEnum,
  IsDecimal,
  IsOptional,
  IsInt,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { TipoPromocion } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreatePromocionDto {
  @IsString()
  codigo: string;

  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsEnum(TipoPromocion)
  tipo: TipoPromocion;

  @Transform(({ value }) => parseFloat(value as string))
  @IsDecimal()
  valor: number;

  @IsOptional()
  @Transform(({ value }) => (value ? parseFloat(value as string) : undefined))
  @IsDecimal()
  montoMinimo?: number;

  @IsDateString()
  inicioValidez: string;

  @IsDateString()
  finValidez: string;

  @IsOptional()
  @IsInt()
  usoMaximo?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean = true;
}
