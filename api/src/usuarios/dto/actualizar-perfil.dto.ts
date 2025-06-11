import { IsString, IsOptional, IsEmail } from 'class-validator';

export class ActualizarPerfilDto {
  @IsOptional()
  @IsString({ message: 'Los nombres deben ser texto.' })
  nombres?: string;

  @IsOptional()
  @IsString({ message: 'Los apellidos deben ser texto.' })
  apellidos?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Debe ser un email válido.' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'El celular debe ser texto.' })
  celular?: string;
}
