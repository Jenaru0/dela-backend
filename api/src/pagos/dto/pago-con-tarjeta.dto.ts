import {
  IsInt,
  IsString,
  IsEmail,
  IsOptional,
  Min,
  IsObject,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MetodoPago } from '@prisma/client';

export class DatosTarjetaDto {
  @IsString()
  numeroTarjeta: string;

  @IsString()
  fechaExpiracion: string;

  @IsString()
  codigoSeguridad: string;

  @IsString()
  nombreTitular: string;

  @IsString()
  tipoDocumento: string;

  @IsString()
  numeroDocumento: string;

  @IsEmail()
  email: string;
}

export class PagoConTarjetaDto {
  @IsInt()
  @Min(1)
  pedidoId: number;

  @IsInt()
  @Min(1)
  monto: number;

  @IsEnum(MetodoPago)
  metodoPago: MetodoPago;

  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsString()
  issuerId?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DatosTarjetaDto)
  datosTarjeta?: DatosTarjetaDto;
}
