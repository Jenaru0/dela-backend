import {
  IsString,
  IsObject,
  IsBoolean,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class WebhookMercadoPagoDto {
  @IsNumber()
  id: number;

  @IsBoolean()
  live_mode: boolean;

  @IsString()
  type: string;

  @IsString()
  date_created: string;

  @IsOptional()
  @IsString()
  application_id?: string;

  @IsNumber()
  user_id: number;

  @IsOptional()
  @IsString()
  version?: string;

  @IsString()
  api_version: string;

  @IsString()
  action: string;

  @IsObject()
  data: {
    id: string;
  };
}

export class NotificacionPagoDto {
  @IsString()
  resource: string;

  @IsString()
  topic: string;
}
