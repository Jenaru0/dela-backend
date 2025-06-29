import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { DireccionesModule } from '../direcciones/direcciones.module';
import { ReclamosModule } from '../reclamos/reclamos.module';
import { ResenasModule } from '../resenas/resenas.module';
import { FavoritosModule } from '../favorito/favoritos.module';

@Module({
  imports: [
    UsuariosModule,
    DireccionesModule,
    ReclamosModule,
    ResenasModule,
    FavoritosModule,
  ],
  controllers: [AdminController],
})
export class AdminModule {}
