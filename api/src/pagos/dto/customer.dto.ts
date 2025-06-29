import { IsOptional, IsString, IsNumber, IsEmail } from 'class-validator';

export class CrearClienteDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  phone?: {
    area_code?: string;
    number?: string;
  };

  @IsOptional()
  identification?: {
    type?: string;
    number?: string;
  };

  @IsOptional()
  @IsString()
  description?: string;
}

export class BuscarClientesDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsNumber()
  offset?: number;
}

export class CrearTokenTarjetaDto {
  @IsString()
  card_number: string;

  @IsString()
  security_code: string;

  @IsString()
  expiration_month: string;

  @IsString()
  expiration_year: string;

  cardholder: {
    name: string;
    identification?: {
      type: string;
      number: string;
    };
  };
}
