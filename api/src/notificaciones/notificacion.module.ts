import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificacionService } from './services/notificacion.service';
import { EmailService } from './services/email.service';

@Module({
  imports: [ConfigModule],
  providers: [NotificacionService, EmailService],
  exports: [NotificacionService, EmailService],
})
export class NotificacionModule {}
