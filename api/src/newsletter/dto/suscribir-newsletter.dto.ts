import { IsEmail, IsNotEmpty } from 'class-validator';

export class SuscribirNewsletterDto {
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  email: string;
}
