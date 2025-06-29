import { IsIn, IsString } from 'class-validator';

export class CancelarPagoDto {
  @IsString()
  @IsIn(['cancelled'], { message: 'El estado debe ser "cancelled"' })
  status: 'cancelled';
}
