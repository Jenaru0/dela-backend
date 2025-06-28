import {
  IsInt,
  IsEnum,
  IsString,
  IsEmail,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { MetodoPago } from '@prisma/client';

/**
 * DTO para crear pagos con tarjeta (Checkout API)
 *
 * Este DTO se usa cuando el usuario ingresa los datos de su tarjeta
 * directamente en tu sitio web y MercadoPago.js genera un token.
 *
 * Flujo: Usuario → Tu Web → Token → API MercadoPago
 */
export class PagoConTarjetaDto {
  @IsInt()
  @Min(1)
  pedidoId: number;

  @IsString()
  token: string; // Token de seguridad generado por MercadoPago.js

  @IsEnum(MetodoPago)
  metodoPago: MetodoPago;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  cuotas?: number;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  documento?: string;

  @IsOptional()
  @IsString()
  nombreTarjeta?: string; // Nombre del titular de la tarjeta

  @IsOptional()
  @IsString()
  referencia?: string; // Referencia adicional del pago
}
