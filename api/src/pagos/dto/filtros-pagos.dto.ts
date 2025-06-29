import { IsOptional, IsEnum, IsInt, IsString } from 'class-validator';
import { EstadoPago, MetodoPago } from '@prisma/client';

export class FiltrosPagosDto {
  @IsOptional()
  @IsInt()
  pedidoId?: number;

  @IsOptional()
  @IsEnum(EstadoPago)
  estado?: EstadoPago;

  @IsOptional()
  @IsEnum(MetodoPago)
  metodoPago?: MetodoPago;

  @IsOptional()
  @IsString()
  fechaInicio?: string;

  @IsOptional()
  @IsString()
  fechaFin?: string;

  @IsOptional()
  @IsInt()
  page?: number = 1;

  @IsOptional()
  @IsInt()
  limit?: number = 10;
}
