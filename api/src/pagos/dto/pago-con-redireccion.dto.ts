import {
  IsInt,
  IsEnum,
  IsDecimal,
  IsOptional,
  IsString,
  IsEmail,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { MetodoPago } from '@prisma/client';

// DTO para información del comprador
export class CompradorDto {
  @IsString()
  nombres: string;

  @IsString()
  apellidos: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  celular?: string;

  @IsOptional()
  @IsString()
  documento?: string;
}

// DTO para información de dirección
export class DireccionDto {
  @IsString()
  direccion: string;

  @IsOptional()
  @IsString()
  distrito?: string;

  @IsOptional()
  @IsString()
  provincia?: string;

  @IsOptional()
  @IsString()
  codigoPostal?: string;

  @IsOptional()
  @IsString()
  referencia?: string;
}

/**
 * DTO para crear pagos con redirección (Checkout Redirect)
 *
 * Este DTO se usa cuando quieres redirigir al usuario a MercadoPago
 * para que complete el pago en su plataforma.
 *
 * Flujo: Usuario → Tu Web → Redirección MercadoPago → Usuario paga → Webhook
 */
export class PagoConRedireccionDto {
  @IsInt()
  pedidoId: number;

  @IsEnum(MetodoPago)
  metodoPago: MetodoPago;

  @Transform(({ value }) => parseFloat(value as string))
  @IsDecimal()
  monto: number;

  @ValidateNested()
  @Type(() => CompradorDto)
  comprador: CompradorDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DireccionDto)
  direccion?: DireccionDto;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  referencia?: string;

  @IsOptional()
  @IsObject()
  metadatos?: Record<string, any>;
}
