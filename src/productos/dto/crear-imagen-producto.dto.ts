import {
  IsInt,
  IsString,
  IsBoolean,
  IsOptional,
  IsUrl,
  Min,
} from 'class-validator';

export class CreateImagenProductoDto {
  @IsInt()
  @IsOptional()
  productoId: number;

  @IsString()
  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  altText?: string;

  @IsOptional()
  @IsBoolean()
  principal?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}
