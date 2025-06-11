import { IsInt } from 'class-validator';

export class CreateFavoritoDto {
  @IsInt()
  productoId: number;
}
