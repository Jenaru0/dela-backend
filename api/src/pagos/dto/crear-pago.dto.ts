import {
  IsInt,
  IsEnum,
  IsDecimal,
  IsOptional,
  IsString,
} from 'class-validator';
import { MetodoPago } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreatePagoDto {
  @IsInt()
  pedidoId: number;

  @IsEnum(MetodoPago)
  metodoPago: MetodoPago;

  @Transform(({ value }) => parseFloat(value as string))
  @IsDecimal()
  monto: number;

  @IsOptional()
  @IsString()
  referencia?: string; // Para referencia de transacción externa
}
