import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PagoConRedireccionDto } from './dto/pago-con-redireccion.dto';
import { WebhookMercadoPagoDto } from './dto/webhook-mercadopago.dto';
import { FiltrosPagosDto } from './dto/filtros-pagos.dto';
import { Prisma, EstadoPago, MetodoPago } from '@prisma/client';

// IMPORTACIONES REALES DEL SDK DE MERCADOPAGO v2.8.0
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

import {
  getMercadoPagoConfig,
  createMercadoPagoConfig,
  MERCADOPAGO_STATUS_MAPPING,
  MERCADOPAGO_PAYMENT_METHODS,
} from './mercadopago.config';

// Interfaz para el pedido con los datos necesarios para MercadoPago
interface PedidoMercadoPago {
  id: number;
  numero: string;
  envioMonto: number | string;
  total: number | string;
  detallePedidos: Array<{
    cantidad: number;
    precioUnitario: number | string;
    producto: {
      id: number;
      sku: string;
      nombre: string;
    };
  }>;
}

@Injectable()
export class PagosService {
  private readonly logger = new Logger(PagosService.name);
  private mercadopago: MercadoPagoConfig;

  constructor(private readonly prisma: PrismaService) {
    // 🔒 VALIDACIÓN CRÍTICA: Solo permitir credenciales TEST
    const config = getMercadoPagoConfig();
    this.mercadopago = createMercadoPagoConfig(config);

    // Log de seguridad para verificar que estamos en modo test
    this.logger.log('🔒 MercadoPago inicializado en MODO SANDBOX');
    this.logger.log(
      `✅ Access Token: ${config.accessToken.substring(0, 20)}...`
    );
    this.logger.log(`✅ Public Key: ${config.publicKey.substring(0, 20)}...`);
    this.logger.warn(
      '⚠️  RECORDATORIO: Solo procesa pagos de prueba - NO dinero real'
    );
  }

  /**
   * Crear un nuevo pago con redirección a MercadoPago
   */
  async crearPagoMercadoPago(dto: PagoConRedireccionDto) {
    // Verificar que el pedido existe
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: dto.pedidoId },
      include: {
        usuario: true,
        direccion: true,
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

    // Verificar que no hay pagos completados para este pedido
    const pagosExistentes = await this.prisma.pago.findMany({
      where: {
        pedidoId: dto.pedidoId,
        estado: { in: ['COMPLETADO', 'PROCESANDO'] },
      },
    });

    const totalPagado = pagosExistentes.reduce(
      (total, pago) => total + Number(pago.monto),
      0
    );

    const totalPedido = Number(pedido.total);
    const nuevoMonto = Number(dto.monto);

    if (totalPagado + nuevoMonto > totalPedido) {
      throw new BadRequestException(
        `El monto del pago excede el total pendiente. Pendiente: S/${totalPedido - totalPagado}`
      );
    }

    try {
      // Crear preferencia en MercadoPago
      const preferenceData = this.construirPreferenciaMercadoPago(dto, {
        id: pedido.id,
        numero: pedido.numero,
        envioMonto: Number(pedido.envioMonto),
        total: Number(pedido.total),
        detallePedidos: pedido.detallePedidos.map((detalle) => ({
          cantidad: detalle.cantidad,
          precioUnitario: Number(detalle.precioUnitario),
          producto: {
            id: detalle.producto.id,
            sku: detalle.producto.sku,
            nombre: detalle.producto.nombre,
          },
        })),
      });

      const preference = new Preference(this.mercadopago);
      const preferenciaCreada = await preference.create({
        body: preferenceData,
      });

      if (!preferenciaCreada.id) {
        throw new BadRequestException(
          'Error al crear preferencia en MercadoPago'
        );
      }

      // Guardar el pago en la base de datos
      const pago = await this.prisma.pago.create({
        data: {
          pedidoId: dto.pedidoId,
          metodoPago: dto.metodoPago,
          monto: dto.monto,
          estado: 'PENDIENTE' as EstadoPago,
          mercadopagoId: preferenciaCreada.id,
          initPoint: preferenciaCreada.init_point,
          sandboxInitPoint: preferenciaCreada.sandbox_init_point,
          referencia: dto.referencia,
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

      this.logger.log(
        `Pago creado con MercadoPago ID: ${preferenciaCreada.id}`
      );

      return {
        ...pago,
        mercadopago: {
          id: preferenciaCreada.id,
          initPoint: preferenciaCreada.init_point,
          sandboxInitPoint: preferenciaCreada.sandbox_init_point,
        },
      };
    } catch (error) {
      this.logger.error('Error al crear pago con MercadoPago:', error);

      // Capturar errores específicos de MercadoPago
      if (error.message && error.message.includes('invalid access token')) {
        this.logger.error(
          '❌ CREDENCIALES INVÁLIDAS: El access token de MercadoPago no es válido'
        );
        throw new BadRequestException(
          'Configuración de MercadoPago inválida. Contacte al administrador.'
        );
      }

      if (error.message && error.message.includes('401')) {
        this.logger.error(
          '❌ ACCESO NO AUTORIZADO: Verificar credenciales de MercadoPago'
        );
        throw new BadRequestException(
          'Error de autenticación con MercadoPago. Contacte al administrador.'
        );
      }

      if (error.message && error.message.includes('403')) {
        this.logger.error(
          '❌ ACCESO DENEGADO: Permisos insuficientes en MercadoPago'
        );
        throw new BadRequestException(
          'Permisos insuficientes en MercadoPago. Contacte al administrador.'
        );
      }

      // Error genérico
      throw new BadRequestException(
        'Error al procesar el pago con MercadoPago. Intente nuevamente.'
      );
    }
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

      if (!pagoMercadoPago.metadata?.preference_id) {
        this.logger.warn(
          `No se encontró preference_id para el pago ${paymentId}`
        );
        return;
      }

      const preferenceId = pagoMercadoPago.metadata.preference_id as string;

      // Buscar el pago en nuestra base de datos
      const pago = await this.prisma.pago.findUnique({
        where: { mercadopagoId: preferenceId },
      });

      if (!pago) {
        this.logger.warn(
          `No se encontró pago con mercadopagoId: ${preferenceId}`
        );
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
          mercadopagoPaymentId: paymentId,
          mercadopagoStatus: pagoMercadoPago.status,
          mercadopagoDetail: pagoMercadoPago.status_detail,
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
      mercadopagoId,
      mercadopagoPaymentId,
      mercadopagoStatus,
      page = 1,
      limit = 10,
    } = filtros;

    const where: Prisma.PagoWhereInput = {};

    if (pedidoId) where.pedidoId = pedidoId;
    if (estado) where.estado = estado;
    if (metodoPago) where.metodoPago = metodoPago;
    if (mercadopagoId) (where as any).mercadopagoId = mercadopagoId;
    if (mercadopagoPaymentId)
      (where as any).mercadopagoPaymentId = mercadopagoPaymentId;
    if (mercadopagoStatus) (where as any).mercadopagoStatus = mercadopagoStatus;

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
   * Obtener estado de pago desde MercadoPago
   */
  async obtenerEstadoPagoMercadoPago(id: number) {
    const pago = await this.findOne(id);

    if (!(pago as any).mercadopagoPaymentId) {
      throw new BadRequestException(
        'Este pago no tiene un ID de pago de MercadoPago'
      );
    }

    try {
      const payment = new Payment(this.mercadopago);
      const pagoMercadoPago = await payment.get({
        id: (pago as any).mercadopagoPaymentId as string,
      });

      return {
        pago,
        mercadoPago: {
          id: pagoMercadoPago.id,
          status: pagoMercadoPago.status,
          status_detail: pagoMercadoPago.status_detail,
          date_created: pagoMercadoPago.date_created,
          date_approved: pagoMercadoPago.date_approved,
          transaction_amount: pagoMercadoPago.transaction_amount,
          payment_method_id: pagoMercadoPago.payment_method_id,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener pago de MercadoPago ${(pago as any).mercadopagoPaymentId}:`,
        error
      );
      throw new BadRequestException('Error al consultar estado en MercadoPago');
    }
  }

  /**
   * Reembolsar un pago en MercadoPago
   */
  async reembolsarPago(id: number, motivo?: string) {
    const pago = await this.findOne(id);

    if (pago.estado !== 'COMPLETADO') {
      throw new BadRequestException(
        'Solo se pueden reembolsar pagos completados'
      );
    }

    if (!(pago as any).mercadopagoPaymentId) {
      throw new BadRequestException(
        'Este pago no tiene un ID de pago de MercadoPago'
      );
    }

    try {
      // En MercadoPago SDK v2.8.0, los reembolsos se hacen a través de la API REST
      // Por ahora, marcaremos el pago como reembolsado en nuestra base de datos
      // En producción, deberías usar la API REST de MercadoPago para procesar el reembolso real

      const pagoActualizado = await this.prisma.pago.update({
        where: { id },
        data: {
          estado: 'REEMBOLSADO',
          referencia: `REEMBOLSO SOLICITADO - ${motivo || 'Reembolso procesado'}`,
        },
      });

      this.logger.log(
        `Reembolso marcado para pago ${id} - PaymentID: ${(pago as any).mercadopagoPaymentId}`
      );
      this.logger.warn(
        'NOTA: Para reembolsos reales, implementar llamada a API REST de MercadoPago'
      );

      return {
        pago: pagoActualizado,
        message:
          'Reembolso marcado en el sistema. En producción se procesará con MercadoPago.',
        mercadopagoPaymentId: (pago as any).mercadopagoPaymentId as string,
      };
    } catch (error) {
      this.logger.error(`Error al procesar reembolso para pago ${id}:`, error);
      throw new BadRequestException(
        'Error al procesar reembolso en MercadoPago'
      );
    }
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
   * Obtener métodos de pago disponibles (SOLO SANDBOX)
   */
  obtenerMetodosPagoDisponibles() {
    // 🔒 Verificar que estamos usando credenciales TEST
    const config = getMercadoPagoConfig();

    return {
      // ⚠️ SOLO MÉTODOS COMPLETAMENTE FUNCIONALES EN SANDBOX
      metodos: {
        MERCADOPAGO_CREDIT_CARD:
          MERCADOPAGO_PAYMENT_METHODS.MERCADOPAGO_CREDIT_CARD,
        MERCADOPAGO_DEBIT_CARD:
          MERCADOPAGO_PAYMENT_METHODS.MERCADOPAGO_DEBIT_CARD,
      },
      configuracion: {
        pais: 'PE',
        moneda: 'PEN',
        modoTest: true, // SIEMPRE en modo test
        advertencia: '🚨 SOLO MODO SANDBOX - No procesa dinero real',
        credencialesActuales: {
          accessToken: config.accessToken.substring(0, 20) + '...', // Mostrar solo parte por seguridad
          publicKey: config.publicKey.substring(0, 20) + '...',
          sonCredencialesTest:
            config.accessToken.startsWith('TEST-') &&
            config.publicKey.startsWith('TEST-'),
        },
      },
      // Información importante para desarrolladores
      importante: {
        metodosDisponibles:
          'Solo tarjetas de crédito y débito funcionan correctamente',
        metodosEliminados:
          'Yape y PagoEfectivo removidos (no funcionales en sandbox)',
        tarjetas:
          'Solo las tarjetas oficiales de la documentación de MercadoPago Perú',
        seguridad: 'Validación automática de credenciales TEST activa',
        documentacion:
          'https://www.mercadopago.com.pe/developers/es/docs/checkout-api/integration-test',
      },
    };
  }

  /**
   * Construir preferencia de MercadoPago
   */
  private construirPreferenciaMercadoPago(
    dto: PagoConRedireccionDto,
    pedido: PedidoMercadoPago
  ) {
    const config = getMercadoPagoConfig();

    const items = pedido.detallePedidos.map((detalle) => ({
      id: detalle.producto.sku,
      title: detalle.producto.nombre,
      quantity: detalle.cantidad,
      unit_price: Number(detalle.precioUnitario),
      currency_id: 'PEN',
    }));

    const payer = {
      name: dto.comprador.nombres,
      surname: dto.comprador.apellidos,
      email: dto.comprador.email,
      phone: dto.comprador.celular
        ? { number: dto.comprador.celular }
        : undefined,
      identification: dto.comprador.documento
        ? {
            type: 'DNI',
            number: dto.comprador.documento,
          }
        : undefined,
      address: dto.direccion
        ? {
            street_name: dto.direccion.direccion,
            street_number: '',
            zip_code: dto.direccion.codigoPostal || '',
          }
        : undefined,
    };

    const preference = {
      items,
      payer,
      back_urls: {
        success: config.successUrl,
        failure: config.failureUrl,
        pending: config.pendingUrl,
      },
      auto_return: 'approved' as const,
      notification_url: config.webhookUrl,
      external_reference: pedido.numero,
      statement_descriptor: 'DELA-PLATFORM',
      payment_methods: {
        default_payment_method_id: this.mapearMetodoPago(dto.metodoPago),
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 12, // Máximo 12 cuotas
      },
      shipments: {
        cost: Number(pedido.envioMonto),
        mode: 'not_specified' as const,
      },
      metadata: {
        pedido_id: pedido.id.toString(),
        pedido_numero: pedido.numero,
      },
    };

    return preference;
  }

  /**
   * Mapear método de pago a ID de MercadoPago (SOLO MÉTODOS SANDBOX)
   * Solo acepta métodos que funcionan correctamente en sandbox
   */
  private mapearMetodoPago(metodoPago: MetodoPago): string {
    const mapping = {
      MERCADOPAGO_CREDIT_CARD: 'credit_card',
      MERCADOPAGO_DEBIT_CARD: 'debit_card',
    };

    const mappedMethod = mapping[metodoPago as keyof typeof mapping];

    if (!mappedMethod) {
      throw new BadRequestException(
        `Método de pago no soportado en sandbox: ${metodoPago}. ` +
          `Métodos disponibles: ${Object.keys(mapping).join(', ')}`
      );
    }

    return mappedMethod;
  }

  /**
   * Crear un pago directo con MercadoPago CheckoutAPI (sin redirección)
   * Ideal para tarjetas de prueba y modo sandbox
   */
  async crearPagoDirectoMercadoPago(dto: {
    pedidoId: number;
    token: string; // Token de la tarjeta generado por MercadoPago.js
    metodoPago: MetodoPago;
    cuotas?: number;
    email: string;
    documento?: string;
  }) {
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

    try {
      const payment = new Payment(this.mercadopago);

      // Crear el pago directo con CheckoutAPI
      const paymentData = {
        transaction_amount: Number(pedido.total),
        token: dto.token,
        description: `Pago pedido ${pedido.numero}`,
        installments: dto.cuotas || 1,
        payment_method_id: this.mapearMetodoPago(dto.metodoPago),
        payer: {
          email: dto.email,
          identification: dto.documento
            ? {
                type: 'DNI',
                number: dto.documento,
              }
            : undefined,
        },
        external_reference: pedido.numero,
        metadata: {
          pedido_id: pedido.id.toString(),
          pedido_numero: pedido.numero,
        },
      };

      const pagoMercadoPago = await payment.create({ body: paymentData });

      // Guardar el pago en la base de datos
      const pago = await this.prisma.pago.create({
        data: {
          pedidoId: dto.pedidoId,
          metodoPago: dto.metodoPago,
          monto: Number(pedido.total),
          estado: this.mapearEstadoDesdeMercadoPago(
            pagoMercadoPago.status || 'pending'
          ),
          mercadopagoPaymentId: pagoMercadoPago.id?.toString(),
          mercadopagoStatus: pagoMercadoPago.status,
          mercadopagoDetail: pagoMercadoPago.status_detail,
          referencia: `MP-DIRECT-${pagoMercadoPago.id}`,
          fechaPago: pagoMercadoPago.date_approved
            ? new Date(pagoMercadoPago.date_approved)
            : null,
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

      // Si el pago fue aprobado, actualizar el estado del pedido
      if (pagoMercadoPago.status === 'approved') {
        await this.verificarEstadoPedido(dto.pedidoId);
      }

      this.logger.log(
        `Pago directo creado - MP ID: ${pagoMercadoPago.id} - Estado: ${pagoMercadoPago.status}`
      );

      return {
        pago,
        mercadopago: {
          id: pagoMercadoPago.id,
          status: pagoMercadoPago.status,
          status_detail: pagoMercadoPago.status_detail,
          date_approved: pagoMercadoPago.date_approved,
          transaction_amount: pagoMercadoPago.transaction_amount,
        },
      };
    } catch (error) {
      this.logger.error('Error al crear pago directo con MercadoPago:', error);
      throw new BadRequestException(
        `Error al procesar el pago directo: ${error.message || 'Error desconocido'}`
      );
    }
  }

  /**
   * Mapear estado de MercadoPago a nuestro estado
   */
  private mapearEstadoDesdeMercadoPago(status: string): EstadoPago {
    const mapping = {
      pending: 'PENDIENTE',
      approved: 'COMPLETADO',
      authorized: 'PROCESANDO',
      in_process: 'PROCESANDO',
      in_mediation: 'PROCESANDO',
      rejected: 'FALLIDO',
      cancelled: 'CANCELADO',
      refunded: 'REEMBOLSADO',
      charged_back: 'REEMBOLSADO',
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
}
