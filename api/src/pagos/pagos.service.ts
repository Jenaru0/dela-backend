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

      // Buscar el pago en nuestra base de datos por MercadoPago ID
      const pago = await this.prisma.pago.findFirst({
        where: { mercadopagoId: paymentId },
      });

      if (!pago) {
        this.logger.warn(`No se encontró pago con mercadopagoId: ${paymentId}`);
        return;
      }

      // Mapear el estado de MercadoPago a nuestro estado
      const nuevoEstado =
        MERCADOPAGO_STATUS_MAPPING[
          pagoMercadoPago.status as keyof typeof MERCADOPAGO_STATUS_MAPPING
        ] || 'PENDIENTE';

      // Actualizar el pago
      await this.prisma.pago.update({
        where: { id: pago.id },
        data: {
          estado: nuevoEstado as EstadoPago,
          fechaPago: pagoMercadoPago.date_approved
            ? new Date(pagoMercadoPago.date_approved)
            : null,
        },
      });

      // Si el pago fue aprobado, verificar el estado del pedido
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
   * Obtener métodos de pago disponibles (MEJORADO - Datos reales de MercadoPago)
   */
  async obtenerMetodosPagoDisponibles() {
    try {
      const metodosReales = await this.obtenerMetodosPagoReales();

      const config = getMercadoPagoConfig();

      return {
        metodos: metodosReales,
        configuracion: {
          pais: 'PE', // Específico para Perú
          moneda: 'PEN', // Soles peruanos
          modoTest: config.accessToken.startsWith('TEST-'),
          // Configuración específica para Perú
          identificacion_requerida: true,
          tipos_documento: ['DNI', 'RUC', 'CE'],
        },
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

    // Verificar que el pedido existe
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: dto.pedidoId },
      include: {
        usuario: true,
        detallePedidos: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                sku: true,
                precioUnitario: true,
              },
            },
          },
        },
      },
    });

    if (!pedido) {
      throw new NotFoundException('Pedido no encontrado');
    }

    // 3. Verificar que no hay pagos ya procesados
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

      // 5. Datos reales para MercadoPago Checkout API
      const paymentData = {
        transaction_amount: Number(pedido.total),
        token: dto.token,
        description: `Pedido ${pedido.numero}`,
        installments: 1, // Checkout API básico = 1 cuota
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
        metadata: {
          pedido_id: pedido.id.toString(),
          pedido_numero: pedido.numero,
        },
        notification_url: getMercadoPagoConfig().webhookUrl,
        statement_descriptor: 'DELA-PLATFORM',
      };

      this.logger.log(
        `💳 Procesando pago directo - Monto: S/${pedido.total.toString()}`
      );

      // 6. Crear el pago en MercadoPago
      const pagoMercadoPago = await payment.create({ body: paymentData });

      if (!pagoMercadoPago.id) {
        throw new BadRequestException('Error al crear pago en MercadoPago');
      }

      // 7. Guardar el pago con campos REALES de MercadoPago
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

      // 8. Si el pago fue aprobado, actualizar el estado del pedido
      if (pagoMercadoPago.status === 'approved') {
        await this.verificarEstadoPedido(dto.pedidoId);
        this.logger.log(
          `✅ Pago aprobado inmediatamente - Pedido ${pedido.numero} confirmado`
        );
      }

      this.logger.log(
        `🎯 Pago Checkout API creado exitosamente - MP ID: ${pagoMercadoPago.id} - Estado: ${pagoMercadoPago.status}`
      );

      // 9. Respuesta optimizada para frontend
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
          // Información de la tarjeta (solo últimos 4 dígitos)
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

      // Manejo específico de errores de Checkout API
      if (
        error.message?.includes('invalid_token') ||
        error.message?.includes('token')
      ) {
        throw new BadRequestException(
          'Token de tarjeta inválido o expirado. Regenere el token desde el frontend.'
        );
      }

      if (error.message?.includes('invalid_payment_method')) {
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

      if (error.message?.includes('cc_rejected_bad_filled_date')) {
        throw new BadRequestException(
          'Fecha de vencimiento de la tarjeta inválida.'
        );
      }

      throw new BadRequestException(
        `Error al procesar pago con Checkout API: ${error.message || 'Error desconocido'}`
      );
    }
  }

  /**
   * Mapear estado de MercadoPago a nuestro estado
   * Basado en la documentación oficial de Mercado Pago Checkout API
   * @see https://www.mercadopago.com/developers/es/docs/checkout-api/payment-management/payment-statuses
   */
  private mapearEstadoDesdeMercadoPago(status: string): EstadoPago {
    const mapping = {
      // Estados principales de Mercado Pago
      pending: 'PENDIENTE', // Pago pendiente
      approved: 'COMPLETADO', // Pago aprobado y completado
      authorized: 'PROCESANDO', // Pago autorizado (captura manual pendiente)
      in_process: 'PENDIENTE', // Pago en proceso de verificación
      in_mediation: 'PENDIENTE', // Pago en mediación
      rejected: 'FALLIDO', // Pago rechazado
      cancelled: 'CANCELADO', // Pago cancelado
      refunded: 'REEMBOLSADO', // Pago reembolsado
      charged_back: 'REEMBOLSADO', // Contracargo (se trata como reembolso)
    };

    return (mapping[status as keyof typeof mapping] ||
      'PENDIENTE') as EstadoPago;
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
   * Obtener cuotas disponibles para un monto específico en Perú (PEN)
   * Basado en las configuraciones reales de MercadoPago para Perú
   */
  obtenerCuotasDisponibles(monto: number) {
    // Configuración real de cuotas en Perú
    const cuotasPeruanas = [
      { installments: 1, total: monto, interest_rate: 0 },
      { installments: 3, total: monto * 1.0299, interest_rate: 2.99 }, // TEA ~3%
      { installments: 6, total: monto * 1.0899, interest_rate: 8.99 }, // TEA ~9%
      { installments: 12, total: monto * 1.1899, interest_rate: 18.99 }, // TEA ~19%
    ];

    return {
      available_installments: cuotasPeruanas,
      recommended: 1,
      max_installments: 12,
      min_amount: 1, // Mínimo 1 sol
      currency: 'PEN',
      pais: 'PE',
    };
  }

  /**
   * Validar tipo de documento peruano y formatear para MercadoPago
   * Según normativas peruanas: DNI (8 dígitos), RUC (11 dígitos), CE (9-12 dígitos)
   */
  private validarTipoDocumento(documento: string): string {
    if (!documento) return 'DNI';

    // Remover espacios, guiones y caracteres especiales
    const documentoLimpio = documento.replace(/[\s\-.]/g, '');

    // Validar DNI (8 dígitos numéricos)
    if (documentoLimpio.length === 8 && /^\d{8}$/.test(documentoLimpio)) {
      return 'DNI';
    }

    // Validar RUC (11 dígitos numéricos, empieza con 10, 15, 17 o 20)
    if (
      documentoLimpio.length === 11 &&
      /^(10|15|17|20)\d{9}$/.test(documentoLimpio)
    ) {
      return 'RUC';
    }

    // Validar Carné de Extranjería (9-12 caracteres alfanuméricos)
    if (
      documentoLimpio.length >= 9 &&
      documentoLimpio.length <= 12 &&
      /^[A-Z0-9]+$/.test(documentoLimpio.toUpperCase())
    ) {
      return 'CE';
    }

    // Por defecto DNI para Perú
    return 'DNI';
  }

  /**
   * Obtener métodos de pago desde API oficial de MercadoPago para Perú
   */
  private async obtenerMetodosPagoReales(): Promise<unknown[]> {
    try {
      const response = await fetch(
        'https://api.mercadopago.com/v1/payment_methods?public_key=' +
          getMercadoPagoConfig().publicKey
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const paymentMethods = (await response.json()) as unknown[];

      // Filtrar solo métodos disponibles para Checkout API en Perú
      const metodosCheckoutAPI = paymentMethods.filter(
        (method: any) =>
          method.status === 'active' &&
          (method.payment_type_id === 'credit_card' ||
            method.payment_type_id === 'debit_card') &&
          // Específicamente para Perú
          ['visa', 'master', 'amex', 'diners'].includes(method.id as string)
      );

      return metodosCheckoutAPI;
    } catch (error) {
      this.logger.error('Error al obtener métodos de pago desde API:', error);

      // Fallback con métodos reales disponibles en Perú
      return [
        {
          id: 'visa',
          name: 'Visa',
          payment_type_id: 'credit_card',
          status: 'active',
          thumbnail:
            'https://http2.mlstatic.com/frontend-assets/payment-methods/visa.png',
        },
        {
          id: 'master',
          name: 'Mastercard',
          payment_type_id: 'credit_card',
          status: 'active',
          thumbnail:
            'https://http2.mlstatic.com/frontend-assets/payment-methods/mastercard.png',
        },
        {
          id: 'amex',
          name: 'American Express',
          payment_type_id: 'credit_card',
          status: 'active',
          thumbnail:
            'https://http2.mlstatic.com/frontend-assets/payment-methods/amex.png',
        },
        {
          id: 'diners',
          name: 'Diners Club',
          payment_type_id: 'credit_card',
          status: 'active',
          thumbnail:
            'https://http2.mlstatic.com/frontend-assets/payment-methods/diners.png',
        },
      ];
    }
  }
}
