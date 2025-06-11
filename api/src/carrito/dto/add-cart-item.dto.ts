import { IsInt, IsPositive } from 'class-validator';

export class AddCartItemDto {
  @IsInt()
  productoId: number;

  @IsInt()
  @IsPositive()
  cantidad: number;
}
