import {
  IsEmail,
  IsOptional,
  IsString,
  IsEnum,
  MinLength,
} from 'class-validator';

export class CreateUsuarioDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  contrasena: string;

  @IsOptional()
  @IsString()
  nombres?: string;

  @IsOptional()
  @IsString()
  apellidos?: string;

  @IsOptional()
  @IsString()
  celular?: string;

  @IsOptional()
  @IsEnum(['CLIENTE', 'ADMIN'], {
    message: 'El tipo de usuario debe ser CLIENTE o ADMIN.',
  })
  tipoUsuario?: 'CLIENTE' | 'ADMIN';
}
