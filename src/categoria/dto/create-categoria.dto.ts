import { IsString, IsOptional, IsUrl, MaxLength } from 'class-validator';

export class CreateCategoriaDto {
  @IsString()
  @MaxLength(100)
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsString()
  @MaxLength(100)
  slug: string;

  @IsOptional()
  @IsUrl({}, { message: 'La imagen url debe ser una URL valida' })
  imagenUrl?: string;
}
