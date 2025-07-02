import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateDireccionDto {
  @IsOptional()
  @IsString({ message: 'El alias debe ser texto.' })
  alias?: string;

  @IsString({ message: 'La dirección es requerida.' })
  direccion: string;

  @IsOptional()
  @IsString({ message: 'El número exterior debe ser texto.' })
  numeroExterior?: string;

  @IsOptional()
  @IsString({ message: 'El número interior debe ser texto.' })
  numeroInterior?: string;

  @IsOptional()
  @IsString({ message: 'La referencia debe ser texto.' })
  referencia?: string;

  @IsString({ message: 'El departamento es requerido.' })
  departamento: string;

  @IsString({ message: 'La provincia es requerida.' })
  provincia: string;

  @IsString({ message: 'El distrito es requerido.' })
  distrito: string;

  @IsOptional()
  @IsString({ message: 'El código UBIGEO debe ser texto.' })
  ubigeoId?: string;

  @IsOptional()
  @IsString({ message: 'El código postal debe ser texto.' })
  codigoPostal?: string;

  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    return isNaN(num) ? undefined : num;
  })
  @IsNumber({}, { message: 'La latitud debe ser un número decimal válido.' })
  @Min(-90, { message: 'La latitud debe estar entre -90 y 90 grados.' })
  @Max(90, { message: 'La latitud debe estar entre -90 y 90 grados.' })
  latitud?: number;

  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    return isNaN(num) ? undefined : num;
  })
  @IsNumber({}, { message: 'La longitud debe ser un número decimal válido.' })
  @Min(-180, { message: 'La longitud debe estar entre -180 y 180 grados.' })
  @Max(180, { message: 'La longitud debe estar entre -180 y 180 grados.' })
  longitud?: number;

  @IsOptional()
  @IsBoolean({ message: 'El campo validadaGps debe ser verdadero o falso.' })
  validadaGps?: boolean;

  @IsOptional()
  @IsString({ message: 'El mapTilerPlaceId debe ser texto.' })
  mapTilerPlaceId?: string;

  @IsOptional()
  @IsBoolean({ message: 'El campo predeterminada debe ser verdadero o falso.' })
  predeterminada?: boolean;
}
