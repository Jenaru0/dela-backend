import { IsInt, IsString, IsEmail, IsOptional, Min } from 'class-validator';

/**
 * DTO para MercadoPago Checkout API
 * Solo campos REALES requeridos por MercadoPago
 */
export class PagoConTarjetaDto {
  @IsInt()
  @Min(1)
  pedidoId: number;

  @IsString()
  token: string; // Token generado por MercadoPago.js (OBLIGATORIO)

  @IsEmail()
  email: string; // Email del pagador (OBLIGATORIO para MP)

  @IsOptional()
  @IsString()
  documento?: string; // Documento del pagador (opcional pero recomendado)
}
