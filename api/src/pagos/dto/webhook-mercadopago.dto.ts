import { IsString, IsObject } from 'class-validator';

export class WebhookMercadoPagoDto {
  @IsString()
  id: string;

  @IsString()
  live_mode: string;

  @IsString()
  type: string;

  @IsString()
  date_created: string;

  @IsString()
  application_id: string;

  @IsString()
  user_id: string;

  @IsString()
  version: string;

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
