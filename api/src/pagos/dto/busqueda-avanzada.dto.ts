import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class BusquedaAvanzadaDto {
  @IsOptional()
  @IsString()
  external_reference?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  date_created_from?: string;

  @IsOptional()
  @IsString()
  date_created_to?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value as string))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value as string))
  @IsInt()
  @Min(0)
  offset?: number;
}
