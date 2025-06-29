import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateComentarioReclamoDto {
  @IsString()
  @IsNotEmpty()
  comentario: string;

  @IsBoolean()
  @IsOptional()
  esInterno?: boolean = false;
}
