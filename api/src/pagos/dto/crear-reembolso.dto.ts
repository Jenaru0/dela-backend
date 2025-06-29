import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CrearReembolsoDto {
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El monto debe ser un número con máximo 2 decimales' }
  )
  @IsPositive({ message: 'El monto debe ser positivo' })
  amount?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
