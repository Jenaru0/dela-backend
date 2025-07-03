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
import { NotificacionService } from '../../notificaciones/services/notificacion.service';
import { ContextoPago } from '../../notificaciones/types/notificacion.types';

/**
 * Servicio dedicado al manejo de webhooks de MercadoPago
 * Maneja: webhooks de payment, merchant_order, plan, subscription
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private mercadopago: MercadoPagoConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacionService: NotificacionService
  ) {
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
        `Procesando pago MP ID: ${paymentId} - Estado: ${pagoMercadoPago.status} - Status Detail: ${pagoMercadoPago.status_detail}`
      );

      const pago = await this.prisma.pago.findFirst({
        where: { mercadopagoId: paymentId },
        include: {
          pedido: {
            include: {
              usuario: {
                select: {
                  id: true,
                  nombres: true,
                  apellidos: true,
                  email: true,
                  celular: true,
                },
              },
            },
          },
        },
      });

      if (!pago) {
        this.logger.warn(`No se encontró pago con mercadopagoId: ${paymentId}`);
        return;
      }

      // Determinar el nuevo estado basado en status o status_detail
      const estadoReferencia =
        pagoMercadoPago.status_detail || pagoMercadoPago.status || 'unknown';
      const nuevoEstado =
        MERCADOPAGO_STATUS_MAPPING[
          estadoReferencia as keyof typeof MERCADOPAGO_STATUS_MAPPING
        ] || 'PENDIENTE';

      // Log detallado del estado
      this.logger.log(
        `📊 Estado detectado: ${estadoReferencia} -> ${nuevoEstado}`
      );
      this.logger.log(
        `📋 ${this.notificacionService.getDescripcionEstado(estadoReferencia)}`
      );

      // Actualizar pago en base de datos
      await this.prisma.pago.update({
        where: { id: pago.id },
        data: {
          estado: nuevoEstado as EstadoPago,
          fechaPago: pagoMercadoPago.date_approved
            ? new Date(pagoMercadoPago.date_approved)
            : null,
        },
      });

      // Construir contexto para notificaciones
      const contextoPago: ContextoPago = {
        pagoId: pago.id,
        mercadopagoId: pago.mercadopagoId || paymentId,
        monto: Number(pago.monto),
        moneda: 'PEN', // Asumiendo PEN para Perú
        metodoPago: pago.paymentMethodId || 'Tarjeta',
        ultimosCuatroDigitos: pago.ultimosCuatroDigitos || undefined,
        fechaPago: pagoMercadoPago.date_approved
          ? new Date(pagoMercadoPago.date_approved)
          : undefined,
        pedidoId: pago.pedidoId,
        numeroPedido: pago.pedido.numero,
        usuario: {
          id: pago.pedido.usuario.id,
          nombres: pago.pedido.usuario.nombres || 'Usuario',
          apellidos: pago.pedido.usuario.apellidos || '',
          email: pago.pedido.usuario.email,
          celular: pago.pedido.usuario.celular || undefined,
        },
      };

      // Enviar notificación basada en el estado
      await this.notificacionService.enviarNotificacionPorEstado(
        estadoReferencia,
        contextoPago
      );

      // Manejar estados específicos del pedido
      if (nuevoEstado === 'COMPLETADO') {
        await this.confirmarPedidoDirectamente(pago.pedidoId);
      } else if (nuevoEstado === 'PENDIENTE' && estadoReferencia === 'CONT') {
        // Para estado CONT (pendiente), el pedido debería mantenerse en procesamiento
        await this.procesarPedidoComoContendiente(pago.pedidoId);
      } else if (['FALLIDO', 'CANCELADO', 'RECHAZADO'].includes(nuevoEstado)) {
        await this.cancelarPedidoPorPagoFallido(pago.pedidoId);
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
   * Confirmar pedido directamente (para webhooks con resultado final)
   */
  private async confirmarPedidoDirectamente(pedidoId: number): Promise<void> {
    try {
      const pedido = await this.prisma.pedido.findUnique({
        where: { id: pedidoId },
      });

      if (!pedido) {
        this.logger.warn(`Pedido no encontrado: ${pedidoId}`);
        return;
      }

      // Confirmar directamente desde cualquier estado previo
      if (pedido.estado === 'PENDIENTE') {
        await this.prisma.pedido.update({
          where: { id: pedidoId },
          data: { estado: 'CONFIRMADO' },
        });
        this.logger.log(
          `✅ Pedido ${pedidoId} confirmado directamente por webhook de pago exitoso`
        );
      } else {
        this.logger.log(
          `Pedido ${pedidoId} ya está en estado: ${pedido.estado} - no se modifica`
        );
      }
    } catch (error) {
      this.logger.error(`Error confirmando pedido ${pedidoId}:`, error);
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

      // Si el pedido está en estado PENDIENTE, lo confirmamos al tener pago exitoso
      if (pedido.estado === 'PENDIENTE') {
        await this.prisma.pedido.update({
          where: { id: pedidoId },
          data: { estado: 'CONFIRMADO' },
        });
        this.logger.log(
          `✅ Pedido ${pedidoId} confirmado por pago exitoso vía webhook`
        );
      } else {
        this.logger.log(
          `Pedido ${pedidoId} ya está en estado: ${pedido.estado}`
        );
      }
    } catch (error) {
      this.logger.error(`Error verificando pedido ${pedidoId}:`, error);
    }
  }

  /**
   * Cancelar pedido por pago fallido
   */
  private async cancelarPedidoPorPagoFallido(pedidoId: number): Promise<void> {
    try {
      const pedido = await this.prisma.pedido.findUnique({
        where: { id: pedidoId },
      });

      if (!pedido) {
        this.logger.warn(`Pedido no encontrado: ${pedidoId}`);
        return;
      }

      // Si el pedido está en estado PENDIENTE, lo cancelamos por pago fallido
      if (pedido.estado === 'PENDIENTE') {
        await this.prisma.pedido.update({
          where: { id: pedidoId },
          data: { estado: 'CANCELADO' },
        });
        this.logger.log(
          `❌ Pedido ${pedidoId} cancelado por pago fallido vía webhook`
        );
      }
    } catch (error) {
      this.logger.error(`Error cancelando pedido ${pedidoId}:`, error);
    }
  }

  /**
   * Procesar pedido como pendiente contendiente (estado CONT)
   * Para estado CONT, el pedido se mantiene procesando pero en estado especial
   */
  private async procesarPedidoComoContendiente(
    pedidoId: number
  ): Promise<void> {
    try {
      const pedido = await this.prisma.pedido.findUnique({
        where: { id: pedidoId },
      });

      if (!pedido) {
        this.logger.warn(`Pedido no encontrado: ${pedidoId}`);
        return;
      }

      // Para estado CONT, mantenemos el pedido en estado pendiente
      // pero con una nota especial de que está en procesamiento
      this.logger.log(
        `⏳ Pedido ${pedidoId} en estado CONT - manteniendo procesamiento pendiente`
      );

      // Opcionalmente, podríamos agregar un campo de metadatos o estado especial
      // Por ahora, solo logueamos que está en este estado especial
    } catch (error) {
      this.logger.error(
        `Error procesando pedido contendiente ${pedidoId}:`,
        error
      );
    }
  }
}
