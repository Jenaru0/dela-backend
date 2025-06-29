import { IsOptional, IsInt } from 'class-validator';

export class FiltrosPagosDto {
  @IsOptional()
  @IsInt()
  pedidoId?: number;

  @IsOptional()
  @IsInt()
  usuarioId?: number;
}
