import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PagoConTarjetaDto } from './dto/pago-con-tarjeta.dto';
import { WebhookMercadoPagoDto } from './dto/webhook-mercadopago.dto';
import { FiltrosPagosDto } from './dto/filtros-pagos.dto';
import { Prisma, EstadoPago } from '@prisma/client';

// IMPORTACIONES REALES DEL SDK DE MERCADOPAGO v2.8.0
// Documentación oficial: https://github.com/mercadopago/sdk-nodejs
import { MercadoPagoConfig, Payment } from 'mercadopago';

import {
  getMercadoPagoConfig,
  createMercadoPagoConfig,
  MERCADOPAGO_STATUS_MAPPING,
} from './mercadopago.config';

@Injectable()
export class PagosService {
  private readonly logger = new Logger(PagosService.name);
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

    if (webhookData.type === 'payment') {
      const paymentId = webhookData.data.id;
      await this.procesarNotificacionPago(paymentId);
    }

    return { message: 'Webhook procesado' };
  }

  /**
   * Procesar notificación de pago de MercadoPago
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
   * Obtener todos los pagos con filtros básicos
   */
  async findAll(filtros: FiltrosPagosDto) {
    const { pedidoId, usuarioId } = filtros;

    const where: Prisma.PagoWhereInput = {};

    if (pedidoId) where.pedidoId = pedidoId;
    if (usuarioId) where.pedido = { usuarioId };

    const pagos = await this.prisma.pago.findMany({
      where,
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
      orderBy: { creadoEn: 'desc' },
    });

    return { data: pagos };
  }

  /**
   * Obtener un pago por ID
   */
  async findOne(id: number) {
    const pago = await this.prisma.pago.findUnique({
      where: { id },
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
            direccion: true,
            detallePedidos: {
              include: {
                producto: {
                  select: { id: true, nombre: true, sku: true },
                },
              },
            },
          },
        },
      },
    });

    if (!pago) {
      throw new NotFoundException('Pago no encontrado');
    }

    return pago;
  }

  /**
   * Obtener pagos por pedido ID
   */
  async findByPedido(pedidoId: number) {
    return this.prisma.pago.findMany({
      where: { pedidoId },
      orderBy: { creadoEn: 'desc' },
    });
  }

  /**
   * Obtener estadísticas de pagos
   */
  async obtenerEstadisticasPagos() {
    const [totalPagos, pagosPorEstado, montoTotal] = await Promise.all([
      this.prisma.pago.count(),
      this.prisma.pago.groupBy({
        by: ['estado'],
        _count: { id: true },
        _sum: { monto: true },
      }),
      this.prisma.pago.aggregate({
        _sum: { monto: true },
        where: { estado: 'COMPLETADO' },
      }),
    ]);

    return {
      totalPagos,
      pagosPorEstado,
      montoTotalRecaudado: montoTotal._sum.monto || 0,
    };
  }

  /**
   * Obtener métodos de pago disponibles desde API oficial de MercadoPago
   */
  async obtenerMetodosPagoDisponibles() {
    try {
      const metodosReales = await this.obtenerMetodosPagoReales();
      const config = getMercadoPagoConfig();

      return {
        payment_methods: metodosReales,
        country: 'PE',
        currency: 'PEN',
        test_mode: config.accessToken.startsWith('TEST-'),
        identification_types: ['DNI', 'RUC', 'CE'],
      };
    } catch (error) {
      this.logger.error('Error al obtener métodos de pago:', error);
      throw new BadRequestException(
        'Error al consultar métodos de pago disponibles'
      );
    }
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

      // Manejo de errores basado en documentación oficial
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
  }

  /**
   * Mapear estado de MercadoPago a nuestro estado usando el mapping centralizado
   */
  private mapearEstadoDesdeMercadoPago(status: string): EstadoPago {
    return (MERCADOPAGO_STATUS_MAPPING[
      status as keyof typeof MERCADOPAGO_STATUS_MAPPING
    ] || 'PENDIENTE') as EstadoPago;
  }

  /**
   * Verificar estado del pedido después de un pago
   */
  private async verificarEstadoPedido(pedidoId: number) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: {
        pagos: {
          where: { estado: 'COMPLETADO' },
        },
      },
    });

    if (!pedido) return;

    const totalPagado = pedido.pagos.reduce(
      (total, pago) => total + Number(pago.monto),
      0
    );

    const totalPedido = Number(pedido.total);

    if (totalPagado >= totalPedido && pedido.estado === 'PENDIENTE') {
      await this.prisma.pedido.update({
        where: { id: pedidoId },
        data: { estado: 'CONFIRMADO' },
      });

      this.logger.log(`Pedido ${pedido.numero} confirmado - Pago completado`);
    }
  }

  /**
   * Validar configuración de MercadoPago
   */
  validarConfiguracionMercadoPago() {
    try {
      const config = getMercadoPagoConfig();

      return {
        configuracionValida: true,
        credencialesTest: {
          accessToken: config.accessToken.startsWith('TEST-'),
          publicKey: config.publicKey.startsWith('TEST-'),
        },
        webhookUrl: config.webhookUrl,
      };
    } catch (error) {
      this.logger.error('Error al validar configuración:', error);
      throw new BadRequestException(
        'Error al validar la configuración de MercadoPago'
      );
    }
  }

  /**
   * Validar tipo de documento peruano para MercadoPago
   */
  private validarTipoDocumento(documento: string): string {
    if (!documento) return 'DNI';

    const documentoLimpio = documento.replace(/[\s\-.]/g, '');

    // DNI: 8 dígitos numéricos
    if (documentoLimpio.length === 8 && /^\d{8}$/.test(documentoLimpio)) {
      return 'DNI';
    }

    // RUC: 11 dígitos, empieza con 10, 15, 17 o 20
    if (
      documentoLimpio.length === 11 &&
      /^(10|15|17|20)\d{9}$/.test(documentoLimpio)
    ) {
      return 'RUC';
    }

    // Carné de Extranjería: 9-12 caracteres alfanuméricos
    if (
      documentoLimpio.length >= 9 &&
      documentoLimpio.length <= 12 &&
      /^[A-Z0-9]+$/i.test(documentoLimpio)
    ) {
      return 'CE';
    }

    return 'DNI';
  }

  /**
   * Obtener métodos de pago desde API oficial de MercadoPago para Perú
   */
  private async obtenerMetodosPagoReales(): Promise<unknown[]> {
    try {
      const config = getMercadoPagoConfig();
      const response = await fetch(
        `https://api.mercadopago.com/v1/payment_methods?public_key=${config.publicKey}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const paymentMethods = (await response.json()) as unknown[];

      const metodosCheckoutAPI = paymentMethods.filter(
        (method: any) =>
          method.status === 'active' &&
          (method.payment_type_id === 'credit_card' ||
            method.payment_type_id === 'debit_card')
      );

      return metodosCheckoutAPI;
    } catch (error) {
      this.logger.error('Error al obtener métodos de pago desde API:', error);

      // Fallback mínimo - solo campos básicos según documentación oficial
      return [
        {
          id: 'visa',
          name: 'Visa',
          payment_type_id: 'credit_card',
          status: 'active',
        },
        {
          id: 'master',
          name: 'Mastercard',
          payment_type_id: 'credit_card',
          status: 'active',
        },
        {
          id: 'amex',
          name: 'American Express',
          payment_type_id: 'credit_card',
          status: 'active',
        },
        {
          id: 'diners',
          name: 'Diners Club',
          payment_type_id: 'credit_card',
          status: 'active',
        },
      ];
    }
  }
}
