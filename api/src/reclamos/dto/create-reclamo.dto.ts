import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsInt,
  MaxLength,
} from 'class-validator';
import { TipoReclamo, PrioridadReclamo } from '@prisma/client';

export class CreateReclamoDto {
  @IsOptional()
  @IsInt()
  pedidoId?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  asunto: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsEnum(TipoReclamo)
  @IsOptional()
  tipoReclamo?: TipoReclamo = TipoReclamo.OTRO;

  @IsEnum(PrioridadReclamo)
  @IsOptional()
  prioridad?: PrioridadReclamo = PrioridadReclamo.MEDIA;
}
