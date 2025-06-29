import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EstadoPago } from '@prisma/client';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import {
  getMercadoPagoConfig,
  createMercadoPagoConfig,
  MERCADOPAGO_STATUS_MAPPING,
} from '../mercadopago.config';
import { PagoConTarjetaDto } from '../dto/pago-con-tarjeta.dto';

/**
 * Servicio dedicado exclusivamente a Payment API de MercadoPago
 * Maneja: crear pagos, obtener pagos, buscar pagos, capturar pagos, cancelar pagos
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private mercadopago: MercadoPagoConfig;

  constructor(private readonly prisma: PrismaService) {
    const config = getMercadoPagoConfig();
    this.mercadopago = createMercadoPagoConfig(config);
  }

  /**
   * Crear pago directo con Checkout API
   */
  async crearPagoDirectoMercadoPago(dto: PagoConTarjetaDto) {
    this.logger.log(`Iniciando pago Checkout API para pedido ${dto.pedidoId}`);

    const pedido = await this.prisma.pedido.findUnique({
      where: { id: dto.pedidoId },
      include: { usuario: true },
    });

    if (!pedido) {
      throw new NotFoundException('Pedido no encontrado');
    }

    const pagosExistentes = await this.prisma.pago.findMany({
      where: {
        pedidoId: dto.pedidoId,
        estado: { in: ['COMPLETADO', 'PROCESANDO'] },
      },
    });

    if (pagosExistentes.length > 0) {
      throw new BadRequestException(
        'Este pedido ya tiene pagos procesados o en proceso'
      );
    }

    try {
      const payment = new Payment(this.mercadopago);

      const paymentData = {
        transaction_amount: Number(pedido.total),
        token: dto.token,
        description: `Pedido ${pedido.numero}`,
        installments: 1,
        payer: {
          email: dto.email,
          identification: dto.documento
            ? {
                type: this.validarTipoDocumento(dto.documento),
                number: dto.documento,
              }
            : undefined,
        },
        external_reference: pedido.numero,
        notification_url: getMercadoPagoConfig().webhookUrl,
        statement_descriptor: 'DELA-PLATFORM',
        binary_mode: false,
      };

      this.logger.log(`💳 Procesando pago - Monto: S/${Number(pedido.total)}`);

      const pagoMercadoPago = await payment.create({ body: paymentData });

      if (!pagoMercadoPago.id) {
        throw new BadRequestException('Error al crear pago en MercadoPago');
      }

      const pago = await this.prisma.pago.create({
        data: {
          pedidoId: dto.pedidoId,
          monto: Number(pedido.total),
          estado: this.mapearEstadoDesdeMercadoPago(
            pagoMercadoPago.status || 'pending'
          ),
          fechaPago: pagoMercadoPago.date_approved
            ? new Date(pagoMercadoPago.date_approved)
            : null,
          mercadopagoId: pagoMercadoPago.id?.toString(),
          paymentMethodId: pagoMercadoPago.payment_method_id,
          cuotas: pagoMercadoPago.installments || 1,
          ultimosCuatroDigitos: pagoMercadoPago.card?.last_four_digits,
        },
        include: {
          pedido: {
            select: {
              id: true,
              numero: true,
              total: true,
              usuario: {
                select: {
                  id: true,
                  nombres: true,
                  apellidos: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (pagoMercadoPago.status === 'approved') {
        await this.verificarEstadoPedido(dto.pedidoId);
        this.logger.log(
          `✅ Pago aprobado - Pedido ${pedido.numero} confirmado`
        );
      }

      this.logger.log(
        `🎯 Pago creado - MP ID: ${pagoMercadoPago.id} - Estado: ${pagoMercadoPago.status}`
      );

      return {
        pago,
        mercadopago: {
          id: pagoMercadoPago.id,
          status: pagoMercadoPago.status,
          status_detail: pagoMercadoPago.status_detail,
          date_approved: pagoMercadoPago.date_approved,
          transaction_amount: pagoMercadoPago.transaction_amount,
          installments: pagoMercadoPago.installments,
          payment_method_id: pagoMercadoPago.payment_method_id,
          card: pagoMercadoPago.card
            ? {
                first_six_digits: pagoMercadoPago.card.first_six_digits,
                last_four_digits: pagoMercadoPago.card.last_four_digits,
              }
            : null,
        },
        checkout_info: {
          tipo: 'CHECKOUT_API',
          procesado_directamente: true,
          requiere_redireccion: false,
          estado_pedido:
            pagoMercadoPago.status === 'approved' ? 'CONFIRMADO' : 'PENDIENTE',
        },
      };
    } catch (error) {
      this.logger.error('❌ Error en Checkout API:', error);
      return this.manejarErroresPago(error);
    }
  }

  /**
   * Obtener pago por ID de MercadoPago
   */
  async obtenerPago(pagoId: string) {
    try {
      const payment = new Payment(this.mercadopago);
      const pago = await payment.get({ id: pagoId });

      return {
        id: pago.id,
        status: pago.status,
        status_detail: pago.status_detail,
        date_created: pago.date_created,
        date_approved: pago.date_approved,
        transaction_amount: pago.transaction_amount,
        installments: pago.installments,
        payment_method_id: pago.payment_method_id,
        card: pago.card,
        payer: pago.payer,
      };
    } catch (error) {
      this.logger.error(`Error al obtener pago ${pagoId}:`, error);
      throw new NotFoundException('Pago no encontrado en MercadoPago');
    }
  }

  /**
   * Buscar pagos con filtros avanzados usando la API oficial
   */
  async buscarPagos(filtros: {
    external_reference?: string;
    status?: string;
    date_created_from?: string;
    date_created_to?: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      this.logger.log('Buscando pagos en MercadoPago');

      const payment = new Payment(this.mercadopago);

      const searchOptions: Record<string, any> = {
        limit: filtros.limit || 50,
        offset: filtros.offset || 0,
      };

      if (filtros.external_reference) {
        searchOptions.external_reference = filtros.external_reference;
      }
      if (filtros.status) {
        searchOptions.status = filtros.status;
      }
      if (filtros.date_created_from) {
        searchOptions['date_created.from'] = filtros.date_created_from;
      }
      if (filtros.date_created_to) {
        searchOptions['date_created.to'] = filtros.date_created_to;
      }

      const searchResult = await payment.search({
        options: searchOptions,
      });

      return searchResult;
    } catch (error) {
      this.logger.error(`Error al buscar pagos: ${error.message}`);
      throw new BadRequestException(`Error al buscar pagos: ${error.message}`);
    }
  }

  /**
   * Cancelar pago
   */
  async cancelarPago(pagoId: string) {
    try {
      this.logger.log(`Cancelando pago ${pagoId}`);

      const pagoExistente = await this.prisma.pago.findFirst({
        where: { mercadopagoId: pagoId },
      });

      if (!pagoExistente) {
        throw new NotFoundException('Pago no encontrado');
      }

      if (
        !['PENDIENTE', 'PROCESANDO', 'AUTORIZADO'].includes(
          pagoExistente.estado
        )
      ) {
        throw new BadRequestException(
          'El pago no puede ser cancelado en su estado actual'
        );
      }

      const payment = new Payment(this.mercadopago);
      const cancelledPayment = await payment.cancel({ id: pagoId });

      this.logger.log(`Pago cancelado: ${pagoId}`);

      if (cancelledPayment.status === 'cancelled') {
        await this.prisma.pago.updateMany({
          where: { mercadopagoId: pagoId },
          data: {
            estado: 'CANCELADO',
            actualizadoEn: new Date(),
          },
        });
      }

      return {
        id: cancelledPayment.id,
        status: cancelledPayment.status,
        status_detail: cancelledPayment.status_detail,
        date_last_updated: cancelledPayment.date_last_updated,
      };
    } catch (error) {
      this.logger.error(`Error al cancelar pago: ${error.message}`);
      return this.manejarErroresCancelacion(error);
    }
  }

  /**
   * Capturar pago autorizado
   */
  async capturarPago(pagoId: string, monto?: number) {
    try {
      this.logger.log(`Capturando pago ${pagoId}`);

      const pagoExistente = await this.prisma.pago.findFirst({
        where: { mercadopagoId: pagoId },
      });

      if (!pagoExistente) {
        throw new NotFoundException('Pago no encontrado');
      }

      if (pagoExistente.estado !== 'AUTORIZADO') {
        throw new BadRequestException(
          'El pago debe estar en estado autorizado para ser capturado'
        );
      }

      const payment = new Payment(this.mercadopago);
      const capturedPayment = await payment.capture({
        id: pagoId,
        transaction_amount: monto,
        requestOptions: {
          idempotencyKey: `capture-${pagoId}-${Date.now()}`,
        },
      });

      this.logger.log(`Pago capturado: ${pagoId}`);

      if (capturedPayment.status === 'approved') {
        await this.prisma.pago.updateMany({
          where: { mercadopagoId: pagoId },
          data: {
            estado: 'COMPLETADO',
            fechaPago: new Date(capturedPayment.date_approved!),
            actualizadoEn: new Date(),
          },
        });
      }

      return {
        id: capturedPayment.id,
        status: capturedPayment.status,
        status_detail: capturedPayment.status_detail,
        transaction_amount: capturedPayment.transaction_amount,
        date_approved: capturedPayment.date_approved,
        captured_amount: monto || capturedPayment.transaction_amount,
      };
    } catch (error) {
      this.logger.error(`Error al capturar pago: ${error.message}`);
      return this.manejarErroresCaptura(error);
    }
  }

  // Métodos privados de utilidad
  private validarTipoDocumento(numeroDocumento: string): string {
    if (!numeroDocumento || numeroDocumento.length < 8) {
      return 'DNI';
    }

    if (numeroDocumento.length === 8) {
      return 'DNI';
    } else if (numeroDocumento.length === 11) {
      return 'RUC';
    }

    return 'DNI';
  }

  private mapearEstadoDesdeMercadoPago(estadoMercadoPago: string): EstadoPago {
    return MERCADOPAGO_STATUS_MAPPING[estadoMercadoPago] || 'PENDIENTE';
  }

  private async verificarEstadoPedido(pedidoId: number): Promise<void> {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: pedidoId },
    });

    if (!pedido) {
      throw new NotFoundException('Pedido no encontrado');
    }

    if (pedido.estado !== 'PENDIENTE') {
      throw new BadRequestException(
        'El pedido no está en estado válido para procesar pagos'
      );
    }
  }

  private manejarErroresPago(error: any) {
    if (
      error.message?.includes('invalid_token') ||
      error.message?.includes('4000')
    ) {
      throw new BadRequestException(
        'Token de tarjeta inválido o expirado. Regenere el token desde el frontend.'
      );
    }

    if (
      error.message?.includes('invalid_payment_method') ||
      error.message?.includes('3028')
    ) {
      throw new BadRequestException(
        'Método de pago no válido para Checkout API. Use tarjetas de crédito o débito.'
      );
    }

    if (error.message?.includes('cc_rejected_insufficient_amount')) {
      throw new BadRequestException(
        'Tarjeta rechazada por fondos insuficientes.'
      );
    }

    if (error.message?.includes('cc_rejected_bad_filled_security_code')) {
      throw new BadRequestException(
        'Código de seguridad de la tarjeta inválido.'
      );
    }

    if (
      error.message?.includes('cc_rejected_bad_filled_date') ||
      error.message?.includes('3029') ||
      error.message?.includes('3030')
    ) {
      throw new BadRequestException(
        'Fecha de vencimiento de la tarjeta inválida.'
      );
    }

    if (
      error.message?.includes('cc_rejected_bad_filled_card_number') ||
      error.message?.includes('3016')
    ) {
      throw new BadRequestException('Número de tarjeta inválido.');
    }

    if (error.message?.includes('cc_rejected_card_disabled')) {
      throw new BadRequestException(
        'Tarjeta deshabilitada. Contacte a su banco emisor.'
      );
    }

    if (error.message?.includes('cc_rejected_duplicated_payment')) {
      throw new BadRequestException(
        'Ya se procesó un pago con esta información. Use otra tarjeta si necesita realizar otro pago.'
      );
    }

    if (error.message?.includes('cc_rejected_high_risk')) {
      throw new BadRequestException(
        'Pago rechazado por políticas de seguridad. Intente con otro método de pago.'
      );
    }

    throw new BadRequestException(
      `Error al procesar pago con Checkout API: ${error.message || 'Error desconocido'}`
    );
  }

  private manejarErroresCancelacion(error: any) {
    if (error.message?.includes('not found')) {
      throw new NotFoundException('Pago no encontrado en MercadoPago');
    }

    if (error.message?.includes('not valid')) {
      throw new BadRequestException(
        'El pago no puede ser cancelado. Solo se pueden cancelar pagos en estado: pending, in_process o authorized'
      );
    }

    throw new BadRequestException(`Error al cancelar pago: ${error.message}`);
  }

  private manejarErroresCaptura(error: any) {
    if (error.message?.includes('not found')) {
      throw new NotFoundException('Pago no encontrado en MercadoPago');
    }

    if (error.message?.includes('not valid')) {
      throw new BadRequestException(
        'El pago no puede ser capturado. Solo se pueden capturar pagos en estado authorized'
      );
    }

    throw new BadRequestException(`Error al capturar pago: ${error.message}`);
  }
}
