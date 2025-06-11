import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateDireccionDto {
  @IsOptional()
  @IsString({ message: 'El alias debe ser texto.' })
  alias?: string;

  @IsString({ message: 'La dirección es requerida.' })
  direccion: string;

  @IsOptional()
  @IsString({ message: 'El distrito debe ser texto.' })
  distrito?: string;

  @IsOptional()
  @IsString({ message: 'La provincia debe ser texto.' })
  provincia?: string;

  @IsOptional()
  @IsString({ message: 'El código postal debe ser texto.' })
  codigoPostal?: string;

  @IsOptional()
  @IsString({ message: 'La referencia debe ser texto.' })
  referencia?: string;

  @IsOptional()
  @IsBoolean({ message: 'El campo predeterminada debe ser verdadero o falso.' })
  predeterminada?: boolean;
}
