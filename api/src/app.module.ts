import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ProductosModule } from './productos/productos.module';
import { AutenticacionModule } from './autenticacion/autenticacion.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { CategoriaModule } from './categoria/categoria.module';
import { CatalogoModule } from './catalogo/catalogo.module';
import { FavoritosModule } from './favorito/favoritos.module';
import { CarritoModule } from './carrito/carrito.module';
import { DireccionesModule } from './direcciones/direcciones.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { ReclamosModule } from './reclamos/reclamos.module';
import { ResenasModule } from './resenas/resenas.module';
import { AdminModule } from './admin/admin.module';
import { PedidosModule } from './pedidos/pedidos.module';
import { PromocionesModule } from './promociones/promociones.module';
import { PagosModule } from './pagos/pagos.module';

@Module({
  imports: [
    PrismaModule,
    ProductosModule,
    AutenticacionModule,
    UsuariosModule,
    CategoriaModule,
    CatalogoModule,
    FavoritosModule,
    CarritoModule,
    DireccionesModule,
    NewsletterModule,
    ReclamosModule,
    ResenasModule,
    AdminModule,
    PedidosModule,
    PromocionesModule,
    PagosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
