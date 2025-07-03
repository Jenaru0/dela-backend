import { Module } from '@nestjs/common';
import { AutenticacionService } from './autenticacion.service';
import { AutenticacionController } from './autenticacion.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtEstrategia } from './estrategias/jwt.estrategia';
import { NotificacionModule } from '../notificaciones/notificacion.module';

// Une todo lo anterior en un solo módulo para que pueda ser importado en el app.module.ts
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super_secreto_seguro', // Usa variable de entorno fuerte
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }, // Access token más corto
    }),
    NotificacionModule,
  ],
  providers: [AutenticacionService, JwtEstrategia],
  controllers: [AutenticacionController],
  exports: [AutenticacionService],
})
export class AutenticacionModule {}
