import { Module } from '@nestjs/common';
import { PromocionesService } from './promociones.service';
import { PromocionesController } from './promociones.controller';

@Module({
  controllers: [PromocionesController],
  providers: [PromocionesService],
  exports: [PromocionesService],
})
export class PromocionesModule {}
