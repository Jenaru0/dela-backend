import { IsString, IsEnum, IsOptional } from 'class-validator';
import { EstadoReclamo, TipoReclamo, PrioridadReclamo } from '@prisma/client';

export class UpdateReclamoDto {
  @IsString()
  @IsOptional()
  asunto?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsEnum(EstadoReclamo)
  @IsOptional()
  estado?: EstadoReclamo;

  @IsEnum(TipoReclamo)
  @IsOptional()
  tipoReclamo?: TipoReclamo;

  @IsEnum(PrioridadReclamo)
  @IsOptional()
  prioridad?: PrioridadReclamo;
}
