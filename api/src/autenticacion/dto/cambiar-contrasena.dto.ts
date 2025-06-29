import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class CambiarContrasenaDto {
  @IsString()
  @IsNotEmpty({ message: 'La contraseña actual es requerida.' })
  contrasenaActual: string;

  @IsString()
  @IsNotEmpty({ message: 'La nueva contraseña es requerida.' })
  @MinLength(6, {
    message: 'La nueva contraseña debe tener al menos 6 caracteres.',
  })
  nuevaContrasena: string;

  @IsString()
  @IsNotEmpty({ message: 'La confirmación de contraseña es requerida.' })
  confirmarContrasena: string;
}
