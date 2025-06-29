import { Module } from '@nestjs/common';
import { PagosService } from './pagos.service';
import { PagosController } from './pagos.controller';

// Servicios especializados
import { PaymentService } from './services/payment.service';
import { RefundService } from './services/refund.service';
import { CustomerService } from './services/customer.service';
import { MetaService } from './services/meta.service';
import { WebhookService } from './services/webhook.service';

@Module({
  controllers: [PagosController],
  providers: [
    PagosService,
    PaymentService,
    RefundService,
    CustomerService,
    MetaService,
    WebhookService,
  ],
  exports: [
    PagosService,
    PaymentService,
    RefundService,
    CustomerService,
    MetaService,
    WebhookService,
  ],
})
export class PagosModule {}
