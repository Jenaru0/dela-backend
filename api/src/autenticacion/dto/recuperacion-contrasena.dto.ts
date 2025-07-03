import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SolicitarRecuperacionDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  email: string;
}

export class ValidarTokenDto {
  @IsNotEmpty({ message: 'El token es requerido.' })
  @IsString({ message: 'El token debe ser una cadena de texto.' })
  token: string;
}

export class RestablecerContrasenaDto {
  @IsNotEmpty({ message: 'El token es requerido.' })
  @IsString({ message: 'El token debe ser una cadena de texto.' })
  token: string;

  @IsNotEmpty({ message: 'La nueva contraseña es requerida.' })
  @MinLength(6, {
    message: 'La nueva contraseña debe tener al menos 6 caracteres.',
  })
  nuevaContrasena: string;

  @IsNotEmpty({ message: 'La confirmación de contraseña es requerida.' })
  @IsString({
    message: 'La confirmación de contraseña debe ser una cadena de texto.',
  })
  confirmarContrasena: string;
}
