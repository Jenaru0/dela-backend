import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { EstadoPedido } from '@prisma/client';

export class UpdatePedidoDto {
  @IsOptional()
  @IsEnum(EstadoPedido)
  estado?: EstadoPedido;

  @IsOptional()
  @IsDateString()
  fechaEntrega?: string;

  @IsOptional()
  @IsString()
  notasInternas?: string;
}
