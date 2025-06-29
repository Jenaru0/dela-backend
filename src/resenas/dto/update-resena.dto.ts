import { IsInt, IsString, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { EstadoResena } from '@prisma/client';

export class UpdateResenaDto {
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  calificacion?: number;

  @IsString()
  @IsOptional()
  comentario?: string;

  @IsEnum(EstadoResena)
  @IsOptional()
  estado?: EstadoResena;
}
