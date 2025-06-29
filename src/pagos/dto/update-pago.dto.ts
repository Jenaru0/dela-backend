import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { EstadoPago } from '@prisma/client';

export class UpdatePagoDto {
  @IsOptional()
  @IsEnum(EstadoPago)
  estado?: EstadoPago;

  @IsOptional()
  @IsString()
  referencia?: string;

  @IsOptional()
  @IsDateString()
  fechaPago?: string;
}
