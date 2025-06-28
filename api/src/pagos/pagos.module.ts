import { Module } from '@nestjs/common';
import { PagosService } from './pagos.service';
import { PagosController } from './pagos.controller';
import { PagosMercadoPagoService } from './pagos-mercadopago.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PagosController],
  providers: [PagosService, PagosMercadoPagoService],
  exports: [PagosService, PagosMercadoPagoService],
})
export class PagosModule {}
