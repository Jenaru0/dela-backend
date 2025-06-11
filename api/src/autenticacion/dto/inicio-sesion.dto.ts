import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

// Este DTO valida los datos enviados al endpoint de inicio de sesión.
export class InicioSesionDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  email: string;

  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  contrasena: string;
}
