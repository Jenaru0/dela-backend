import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DireccionesService } from './direcciones.service';
import { DireccionesController } from './direcciones.controller';
import { MapTilerService } from './services/maptiler.service';
import { GeocodingController } from './controllers/geocoding.controller';

@Module({
  imports: [ConfigModule],
  controllers: [DireccionesController, GeocodingController],
  providers: [DireccionesService, MapTilerService],
  exports: [DireccionesService, MapTilerService],
})
export class DireccionesModule {}
