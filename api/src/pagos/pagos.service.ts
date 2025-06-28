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
import { Prisma, EstadoPago, MetodoPago } from '@prisma/client';

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
   * Obtener todos los pagos con filtros
   */
  async findAll(filtros: FiltrosPagosDto) {
    const {
      pedidoId,
      estado,
      metodoPago,
      fechaInicio,
      fechaFin,
      page = 1,
      limit = 10,
    } = filtros;

    const where: Prisma.PagoWhereInput = {};

    if (pedidoId) where.pedidoId = pedidoId;
    if (estado) where.estado = estado;
    if (metodoPago) where.metodoPago = metodoPago;

    if (fechaInicio || fechaFin) {
      where.creadoEn = {};
      if (fechaInicio) where.creadoEn.gte = new Date(fechaInicio);
      if (fechaFin) where.creadoEn.lte = new Date(fechaFin);
    }

    const skip = (page - 1) * limit;

    const [pagos, total] = await Promise.all([
      this.prisma.pago.findMany({
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
        skip,
        take: limit,
      }),
      this.prisma.pago.count({ where }),
    ]);

    return {
      data: pagos,
      page,
      limit,
      total,
    };
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
    const [totalPagos, pagosPorEstado, pagosPorMetodo, montoTotal] =
      await Promise.all([
        this.prisma.pago.count(),
        this.prisma.pago.groupBy({
          by: ['estado'],
          _count: { id: true },
          _sum: { monto: true },
        }),
        this.prisma.pago.groupBy({
          by: ['metodoPago'],
          _count: { id: true },
          _sum: { monto: true },
          where: { estado: 'COMPLETADO' },
        }),
        this.prisma.pago.aggregate({
          _sum: { monto: true },
          where: { estado: 'COMPLETADO' },
        }),
      ]);

    return {
      totalPagos,
      pagosPorEstado,
      pagosPorMetodo,
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
          pais: 'PE',
          moneda: 'PEN',
          modoTest: config.accessToken.startsWith('TEST-'),
        },
      };
    } catch (error) {
      this.logger.error('Error al obtener métodos de pago:', error);
      throw new BadRequestException(
        'Error al consultar métodos de pago disponibles'
      );
    }
  }

  private mapearMetodoPago(metodoPago: MetodoPago): string {
    const mapping = {
      MERCADOPAGO_CREDIT_CARD: 'visa', // Se detectará automáticamente por BIN
      MERCADOPAGO_DEBIT_CARD: 'visa', // Se detectará automáticamente por BIN
    };

    const mappedMethod = mapping[metodoPago as keyof typeof mapping];

    if (!mappedMethod) {
      throw new BadRequestException(
        `Método de pago no soportado: ${metodoPago}`
      );
    }

    return mappedMethod;
  }

  /**
   * Crear pago directo con Checkout API
   */
  async crearPagoDirectoMercadoPago(dto: PagoConTarjetaDto) {
    this.logger.log(`Iniciando pago Checkout API para pedido ${dto.pedidoId}`);

    // Validar token de tarjeta
    const tokenValido = this.validarTokenTarjeta(dto.token);
    if (!tokenValido) {
      throw new BadRequestException(
        'Token de tarjeta inválido. Regenere el token desde el frontend.'
      );
    }

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

    // 4. Validar cuotas si se especifican
    if (dto.cuotas && dto.cuotas > 12) {
      throw new BadRequestException(
        'Máximo 12 cuotas permitidas en MercadoPago Perú'
      );
    }

    try {
      const payment = new Payment(this.mercadopago);

      // 5. Preparar datos del pago optimizados para Checkout API
      const paymentData = {
        transaction_amount: Number(pedido.total),
        token: dto.token,
        description: `Pago directo pedido ${pedido.numero} - Checkout API`,
        installments: dto.cuotas || 1,
        payment_method_id: this.mapearMetodoPago(dto.metodoPago),
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
          tipo_checkout: 'API', // Marcar como Checkout API
          frontend_origin: 'CHECKOUT_API',
        },
        // Configuraciones específicas para Checkout API
        notification_url: getMercadoPagoConfig().webhookUrl,
        statement_descriptor: 'DELA-PLATFORM',
      };

      this.logger.log(
        `💳 Procesando pago directo - Monto: S/${pedido.total.toString()} - Cuotas: ${dto.cuotas || 1}`
      );

      // 6. Crear el pago en MercadoPago
      const pagoMercadoPago = await payment.create({ body: paymentData });

      if (!pagoMercadoPago.id) {
        throw new BadRequestException('Error al crear pago en MercadoPago');
      }

      // 7. Guardar el pago en la base de datos con información completa
      const pago = await this.prisma.pago.create({
        data: {
          pedidoId: dto.pedidoId,
          metodoPago: dto.metodoPago,
          monto: Number(pedido.total),
          estado: this.mapearEstadoDesdeMercadoPago(
            pagoMercadoPago.status || 'pending'
          ),
          cuotas: dto.cuotas || 1,
          tipoCheckout: 'CHECKOUT_API',
          referencia: dto.referencia || `CHECKOUT-API-${pagoMercadoPago.id}`,
          fechaPago: pagoMercadoPago.date_approved
            ? new Date(pagoMercadoPago.date_approved)
            : null,
          // 🔑 CRÍTICO: Guardar el ID de MercadoPago para webhooks
          mercadopagoId: pagoMercadoPago.id?.toString(),
          // Información adicional para Checkout API
          tokenTarjeta: dto.token.substring(0, 10) + '...', // Solo para logs
          ultimosCuatroDigitos: pagoMercadoPago.card?.last_four_digits,
          tipoTarjeta: pagoMercadoPago.payment_method_id,
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

  obtenerCuotasDisponibles(monto: number) {
    const cuotasSimuladas = [
      { installments: 1, total: monto, interest_rate: 0 },
      { installments: 3, total: monto * 1.05, interest_rate: 5 },
      { installments: 6, total: monto * 1.12, interest_rate: 12 },
      { installments: 12, total: monto * 1.25, interest_rate: 25 },
    ];

    return {
      available_installments: cuotasSimuladas,
      recommended: 1,
      max_installments: 12,
      min_amount: 1,
      currency: 'PEN',
    };
  }

  private validarTipoDocumento(documento: string): string {
    if (documento.length === 8) {
      return 'DNI';
    } else if (documento.length === 11) {
      return 'RUC';
    } else if (documento.length >= 9 && documento.length <= 12) {
      return 'CE';
    }

    return 'DNI';
  }

  /**
   * Obtener métodos de pago desde API oficial de MercadoPago
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

      const metodosCheckoutAPI = paymentMethods.filter(
        (method: any) =>
          method.status === 'active' &&
          (method.payment_type_id === 'credit_card' ||
            method.payment_type_id === 'debit_card')
      );

      return metodosCheckoutAPI;
    } catch (error) {
      this.logger.error('Error al obtener métodos de pago desde API:', error);

      // Fallback básico
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
      ];
    }
  }

  /**
   * Validar token de tarjeta
   */
  validarTokenTarjeta(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    const tokenLimpio = token.trim();

    if (tokenLimpio.length < 20) {
      return false;
    }

    const formatoValido = /^[a-zA-Z0-9_-]+$/.test(tokenLimpio);
    return formatoValido;
  }

  /**
   * Obtener cuotas disponibles para un monto
   */
  private obtenerCuotasDisponiblesInterno(monto: number) {
    const cuotasSimuladas = [
      { installments: 1, total: monto, interest_rate: 0 },
      { installments: 3, total: monto * 1.05, interest_rate: 5 },
      { installments: 6, total: monto * 1.12, interest_rate: 12 },
      { installments: 12, total: monto * 1.25, interest_rate: 25 },
    ];

    return {
      available_installments: cuotasSimuladas,
      recommended: 1,
      max_installments: 12,
      min_amount: 1,
      currency: 'PEN',
    };
  }

  /**
   * Identificar payment_method_id por BIN
   */
  private async identificarMetodoPagoPorBIN(bin: string): Promise<string> {
    try {
      if (!bin || bin.length < 6) {
        throw new BadRequestException('BIN debe tener al menos 6 dígitos');
      }

      const response = await fetch(
        `https://api.mercadopago.com/v1/payment_methods/search?public_key=${
          getMercadoPagoConfig().publicKey
        }&bin=${bin.substring(0, 8)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const binInfo: unknown = await response.json();

      if (binInfo && typeof binInfo === 'object' && 'results' in binInfo) {
        const results = (binInfo as { results: any[] }).results;
        if (results && results.length > 0) {
          const paymentMethod = results[0] as { id: string };
          return paymentMethod.id;
        }
      }

      return 'visa'; // Default
    } catch (error) {
      this.logger.error('Error al identificar payment method por BIN:', error);
      return 'visa'; // Default
    }
  }
}
