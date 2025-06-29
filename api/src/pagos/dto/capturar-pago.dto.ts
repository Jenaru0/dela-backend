import { IsOptional, IsNumber, Min } from 'class-validator';

export class CapturarPagoDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  monto?: number;
}
