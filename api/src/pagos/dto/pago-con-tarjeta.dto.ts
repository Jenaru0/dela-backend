import { IsInt, IsString, IsEmail, IsOptional, Min } from 'class-validator';

export class PagoConTarjetaDto {
  @IsInt()
  @Min(1)
  pedidoId: number;

  @IsString()
  token: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  documento?: string;
}
