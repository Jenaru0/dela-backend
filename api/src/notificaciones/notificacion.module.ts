import { Module } from '@nestjs/common';
import { NotificacionService } from './services/notificacion.service';

@Module({
  providers: [NotificacionService],
  exports: [NotificacionService],
})
export class NotificacionModule {}
