import { IsEmail, IsOptional, IsString, IsEnum } from 'class-validator';

export class CreateUsuarioDto {
  @IsEmail()
  email: string;

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
