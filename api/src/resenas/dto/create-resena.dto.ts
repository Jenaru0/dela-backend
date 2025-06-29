import { IsInt, IsString, IsOptional, Min, Max } from 'class-validator';

export class CreateResenaDto {
  @IsInt()
  productoId: number;

  @IsInt()
  @Min(1)
  @Max(5)
  calificacion: number;

  @IsString()
  @IsOptional()
  comentario?: string;
}
