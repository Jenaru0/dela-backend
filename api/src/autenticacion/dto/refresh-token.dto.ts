import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsNotEmpty({ message: 'El refresh token es requerido.' })
  @IsString({ message: 'El refresh token debe ser una cadena de texto.' })
  refresh_token: string;
}
