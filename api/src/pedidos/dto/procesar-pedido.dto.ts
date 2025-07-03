import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { MetodoPago, MetodoEnvio } from '@prisma/client';

export class DetallePedidoDto {
  @IsNumber()
  @Min(1)
  productoId: number;

  @IsNumber()
  @Min(1)
  cantidad: number;
}

export class DatosTarjetaDto {
  @IsString()
  @IsNotEmpty()
  numeroTarjeta: string;

  @IsString()
  @IsNotEmpty()
  fechaExpiracion: string; // MM/YY

  @IsString()
  @IsNotEmpty()
  codigoSeguridad: string;

  @IsString()
  @IsNotEmpty()
  nombreTitular: string;

  @IsString()
  @IsNotEmpty()
  tipoDocumento: string; // DNI, CE, etc.

  @IsString()
  @IsNotEmpty()
  numeroDocumento: string;

  @IsString()
  @IsOptional()
  email?: string;
}

export class ProcesarPedidoDto {
  @IsNumber()
  usuarioId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetallePedidoDto)
  detalles: DetallePedidoDto[];

  @IsEnum(MetodoPago)
  metodoPago: MetodoPago;

  @IsEnum(MetodoEnvio)
  metodoEnvio: MetodoEnvio;

  @IsOptional()
  @IsNumber()
  direccionId?: number;

  @IsOptional()
  @IsString()
  promocionCodigo?: string;

  @IsOptional()
  @IsString()
  notasCliente?: string;

  @IsOptional()
  @IsString()
  notasInternas?: string;

  // Datos para pago con tarjeta
  @IsOptional()
  @IsString()
  token?: string; // Token de MercadoPago (preferido)

  @IsOptional()
  @ValidateNested()
  @Type(() => DatosTarjetaDto)
  datosTarjeta?: DatosTarjetaDto; // Solo para desarrollo/testing

  @IsOptional()
  @IsString()
  issuerId?: string; // Para MercadoPago
}
