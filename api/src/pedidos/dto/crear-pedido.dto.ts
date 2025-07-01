import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MetodoPago, MetodoEnvio } from '@prisma/client';

export class DetallePedidoDto {
  @IsInt()
  productoId: number;

  @IsInt()
  cantidad: number;
}

export class CreatePedidoDto {
  @IsInt()
  usuarioId: number;

  @IsOptional() // Permitir null para recojo en tienda
  @IsInt()
  direccionId: number | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetallePedidoDto)
  detalles: DetallePedidoDto[];

  @IsEnum(MetodoPago)
  metodoPago: MetodoPago;

  @IsEnum(MetodoEnvio)
  metodoEnvio: MetodoEnvio;

  @IsOptional()
  @IsString()
  promocionCodigo?: string;

  @IsOptional()
  @IsString()
  notasCliente?: string;

  @IsOptional()
  @IsString()
  notasInternas?: string;
}
