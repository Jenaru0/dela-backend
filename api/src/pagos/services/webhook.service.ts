import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EstadoPago } from '@prisma/client';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import {
  getMercadoPagoConfig,
  createMercadoPagoConfig,
  MERCADOPAGO_STATUS_MAPPING,
} from '../mercadopago.config';
import { WebhookMercadoPagoDto } from '../dto/webhook-mercadopago.dto';

/**
 * Servicio dedicado al manejo de webhooks de MercadoPago
 * Maneja: webhooks de payment, merchant_order, plan, subscription
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private mercadopago: MercadoPagoConfig;

  constructor(private readonly prisma: PrismaService) {
    const config = getMercadoPagoConfig();
    this.mercadopago = createMercadoPagoConfig(config);
  }

  /**
   * Procesar webhook de MercadoPago
   */
  async procesarWebhook(webhookData: WebhookMercadoPagoDto) {
    this.logger.log(
      `Webhook recibido: ${webhookData.type} - ${webhookData.action}`
    );

    try {
      switch (webhookData.type) {
        case 'payment': {
          const paymentId = webhookData.data.id;
          await this.procesarNotificacionPago(paymentId);
          break;
        }

        case 'merchant_order': {
          const merchantOrderId = webhookData.data.id;
          this.procesarNotificacionMerchantOrder(merchantOrderId);
          break;
        }

        case 'plan': {
          const planId = webhookData.data.id;
          this.logger.log(`Webhook de plan recibido: ${planId}`);
          // Implementar según necesidades de suscripciones
          break;
        }

        case 'subscription': {
          const subscriptionId = webhookData.data.id;
          this.logger.log(`Webhook de suscripción recibido: ${subscriptionId}`);
          // Implementar según necesidades de suscripciones
          break;
        }

        default:
          this.logger.warn(`Tipo de webhook no manejado: ${webhookData.type}`);
      }

      return {
        message: 'Webhook procesado',
        type: webhookData.type,
        action: webhookData.action,
      };
    } catch (error) {
      this.logger.error(`Error procesando webhook: ${error.message}`);
      return {
        message: 'Error procesando webhook',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Procesar notificación de pago
   */
  private async procesarNotificacionPago(paymentId: string) {
    try {
      const payment = new Payment(this.mercadopago);
      const pagoMercadoPago = await payment.get({ id: paymentId });

      this.logger.log(
        `Procesando pago MP ID: ${paymentId} - Estado: ${pagoMercadoPago.status}`
      );

      const pago = await this.prisma.pago.findFirst({
        where: { mercadopagoId: paymentId },
      });

      if (!pago) {
        this.logger.warn(`No se encontró pago con mercadopagoId: ${paymentId}`);
        return;
      }

      const nuevoEstado =
        MERCADOPAGO_STATUS_MAPPING[
          pagoMercadoPago.status as keyof typeof MERCADOPAGO_STATUS_MAPPING
        ] || 'PENDIENTE';

      await this.prisma.pago.update({
        where: { id: pago.id },
        data: {
          estado: nuevoEstado as EstadoPago,
          fechaPago: pagoMercadoPago.date_approved
            ? new Date(pagoMercadoPago.date_approved)
            : null,
        },
      });

      if (nuevoEstado === 'COMPLETADO') {
        await this.verificarEstadoPedido(pago.pedidoId);
      }

      this.logger.log(`Pago actualizado: ${pago.id} - Estado: ${nuevoEstado}`);
    } catch (error) {
      this.logger.error(
        `Error al procesar notificación de pago ${paymentId}:`,
        error
      );
    }
  }

  /**
   * Procesar notificación de merchant order
   */
  private procesarNotificacionMerchantOrder(merchantOrderId: string) {
    try {
      this.logger.log(`Procesando merchant order: ${merchantOrderId}`);

      // Aquí se implementaría la lógica para MerchantOrder
      // Por ejemplo, obtener la orden y actualizar el estado del pedido

      this.logger.log(`Merchant order procesada: ${merchantOrderId}`);
    } catch (error) {
      this.logger.error(
        `Error al procesar merchant order ${merchantOrderId}:`,
        error
      );
    }
  }

  /**
   * Verificar estado del pedido
   */
  private async verificarEstadoPedido(pedidoId: number): Promise<void> {
    try {
      const pedido = await this.prisma.pedido.findUnique({
        where: { id: pedidoId },
      });

      if (!pedido) {
        this.logger.warn(`Pedido no encontrado: ${pedidoId}`);
        return;
      }

      if (pedido.estado !== 'PENDIENTE') {
        this.logger.log(
          `Pedido ${pedidoId} ya está en estado: ${pedido.estado}`
        );
        return;
      }

      // Lógica para actualizar estado del pedido según sea necesario
      this.logger.log(`Verificando estado del pedido: ${pedidoId}`);
    } catch (error) {
      this.logger.error(`Error verificando pedido ${pedidoId}:`, error);
    }
  }
}
