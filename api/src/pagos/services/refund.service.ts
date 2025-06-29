import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MercadoPagoConfig, PaymentRefund } from 'mercadopago';
import {
  getMercadoPagoConfig,
  createMercadoPagoConfig,
} from '../mercadopago.config';

/**
 * Servicio dedicado exclusivamente a PaymentRefund API de MercadoPago
 * Maneja: crear reembolsos, obtener reembolsos, listar reembolsos
 */
@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);
  private mercadopago: MercadoPagoConfig;

  constructor(private readonly prisma: PrismaService) {
    const config = getMercadoPagoConfig();
    this.mercadopago = createMercadoPagoConfig(config);
  }

  /**
   * Crear reembolso (total o parcial)
   */
  async crearReembolso(pagoId: string, monto?: number, razon?: string) {
    try {
      this.logger.log(`Creando reembolso para pago ${pagoId}`);

      const pagoExistente = await this.prisma.pago.findFirst({
        where: { mercadopagoId: pagoId },
      });

      if (!pagoExistente) {
        throw new NotFoundException('Pago no encontrado');
      }

      const paymentRefund = new PaymentRefund(this.mercadopago);

      const body: Record<string, any> = {};

      if (monto !== undefined) {
        body.amount = monto;
      }

      const requestOptions = {
        idempotencyKey: `refund-${pagoId}-${Date.now()}`,
      };

      const refund = await paymentRefund.create({
        payment_id: pagoId,
        body,
        requestOptions,
      });

      this.logger.log(`Reembolso creado: ${refund.id}`);

      if (refund.status === 'approved') {
        await this.prisma.pago.updateMany({
          where: { mercadopagoId: pagoId },
          data: {
            estado: 'REEMBOLSADO',
            actualizadoEn: new Date(),
          },
        });
      }

      return {
        id: refund.id,
        payment_id: refund.payment_id,
        amount: refund.amount,
        status: refund.status,
        date_created: refund.date_created,
        reason: razon || null,
      };
    } catch (error) {
      this.logger.error(`Error al crear reembolso: ${error.message}`);
      return this.manejarErroresReembolso(error);
    }
  }

  /**
   * Reembolso total usando el método específico del SDK
   */
  async crearReembolsoTotal(pagoId: string, razon?: string) {
    try {
      this.logger.log(`Creando reembolso total para pago ${pagoId}`);

      const pagoExistente = await this.prisma.pago.findFirst({
        where: { mercadopagoId: pagoId },
      });

      if (!pagoExistente) {
        throw new NotFoundException('Pago no encontrado');
      }

      const paymentRefund = new PaymentRefund(this.mercadopago);

      const requestOptions = {
        idempotencyKey: `total-refund-${pagoId}-${Date.now()}`,
      };

      const refund = await paymentRefund.total({
        payment_id: pagoId,
        requestOptions,
      });

      this.logger.log(`Reembolso total creado: ${refund.id}`);

      if (refund.status === 'approved') {
        await this.prisma.pago.updateMany({
          where: { mercadopagoId: pagoId },
          data: {
            estado: 'REEMBOLSADO',
            actualizadoEn: new Date(),
          },
        });
      }

      return {
        id: refund.id,
        payment_id: refund.payment_id,
        amount: refund.amount,
        status: refund.status,
        date_created: refund.date_created,
        reason: razon || null,
        type: 'total',
      };
    } catch (error) {
      this.logger.error(`Error al crear reembolso total: ${error.message}`);
      return this.manejarErroresReembolso(error);
    }
  }

  /**
   * Obtener lista de reembolsos de un pago
   */
  async obtenerReembolsos(pagoId: string) {
    try {
      this.logger.log(`Obteniendo reembolsos para pago ${pagoId}`);

      const pagoExistente = await this.prisma.pago.findFirst({
        where: { mercadopagoId: pagoId },
      });

      if (!pagoExistente) {
        throw new NotFoundException('Pago no encontrado');
      }

      const paymentRefund = new PaymentRefund(this.mercadopago);
      const refunds = await paymentRefund.list({
        payment_id: pagoId,
      });

      return refunds;
    } catch (error) {
      this.logger.error(`Error al obtener reembolsos: ${error.message}`);

      if (error.message?.includes('not found')) {
        throw new NotFoundException('Pago no encontrado en MercadoPago');
      }

      throw new BadRequestException(
        `Error al obtener reembolsos: ${error.message}`
      );
    }
  }

  /**
   * Obtener reembolso específico
   */
  async obtenerReembolso(pagoId: string, reembolsoId: string) {
    try {
      this.logger.log(`Obteniendo reembolso ${reembolsoId} del pago ${pagoId}`);

      const pagoExistente = await this.prisma.pago.findFirst({
        where: { mercadopagoId: pagoId },
      });

      if (!pagoExistente) {
        throw new NotFoundException('Pago no encontrado');
      }

      const paymentRefund = new PaymentRefund(this.mercadopago);
      const refund = await paymentRefund.get({
        payment_id: pagoId,
        refund_id: reembolsoId,
      });

      return refund;
    } catch (error) {
      this.logger.error(`Error al obtener reembolso: ${error.message}`);

      if (error.message?.includes('not found')) {
        throw new NotFoundException('Reembolso no encontrado');
      }

      throw new BadRequestException(
        `Error al obtener reembolso: ${error.message}`
      );
    }
  }

  private manejarErroresReembolso(error: any) {
    if (error.message?.includes('not found')) {
      throw new NotFoundException('Pago no encontrado en MercadoPago');
    }

    if (error.message?.includes('too old')) {
      throw new BadRequestException(
        'El pago es demasiado antiguo para ser reembolsado (máximo 90 días)'
      );
    }

    if (error.message?.includes('not valid')) {
      throw new BadRequestException('El estado del pago no permite reembolsos');
    }

    throw new BadRequestException(
      `Error al procesar reembolso: ${error.message}`
    );
  }
}
