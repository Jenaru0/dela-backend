import { IsOptional, IsEnum, IsBoolean, IsString } from 'class-validator';
import { TipoPromocion } from '@prisma/client';

export class FiltrosPromocionesDto {
  @IsOptional()
  @IsString()
  codigo?: string;

  @IsOptional()
  @IsEnum(TipoPromocion)
  tipo?: TipoPromocion;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsBoolean()
  vigente?: boolean; // Para filtrar promociones vigentes por fecha
}
