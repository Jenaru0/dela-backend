import { IsEnum, IsOptional, IsString, IsInt } from 'class-validator';
import { EstadoPedido } from '@prisma/client';

export class FiltrosPedidosDto {
  @IsOptional()
  @IsInt()
  usuarioId?: number;

  @IsOptional()
  @IsEnum(EstadoPedido)
  estado?: EstadoPedido;

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
