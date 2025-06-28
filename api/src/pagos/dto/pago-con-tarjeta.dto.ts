import { IsInt, IsEnum, IsString, IsEmail, IsOptional } from 'class-validator';
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
  pedidoId: number;

  @IsString()
  token: string; // Token de seguridad generado por MercadoPago.js

  @IsEnum(MetodoPago)
  metodoPago: MetodoPago;

  @IsOptional()
  @IsInt()
  cuotas?: number;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  documento?: string;
}
