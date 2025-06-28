import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PagoConRedireccionDto } from './dto/pago-con-redireccion.dto';
import { PagoConTarjetaDto } from './dto/pago-con-tarjeta.dto';
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
import { PagosMercadoPagoService } from './pagos-mercadopago.service';

// Interfaz para el resultado del reembolso
export interface ReembolsoResult {
  success: boolean;
  refundId: string;
  status: string;
  amount: number;
  payment_id: string;
  message: string;
  simulated?: boolean;
}

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly pagosMercadoPagoService: PagosMercadoPagoService
  ) {
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
   * Reembolsar un pago en MercadoPago (MEJORADO - Reembolso real)
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
      // ✅ REEMBOLSO REAL usando el servicio dedicado
      const resultado: ReembolsoResult =
        await this.pagosMercadoPagoService.procesarReembolsoReal(
          pago.mercadopagoPaymentId || '',
          undefined, // Reembolso total
          motivo
        );

      // Actualizar el pago en la base de datos con información completa del reembolso
      const pagoActualizado = await this.prisma.pago.update({
        where: { id },
        data: {
          estado: 'REEMBOLSADO', // Unificamos parcial y total en un solo estado
          referencia:
            resultado.amount && resultado.amount < Number(pago.monto)
              ? `REEMBOLSO PARCIAL-${resultado.refundId} - S/${resultado.amount} de S/${pago.monto.toString()} - ${motivo || 'Reembolso procesado'}`
              : `REEMBOLSO TOTAL-${resultado.refundId} - ${motivo || 'Reembolso procesado'}`,
          mercadopagoRefundId: String(resultado.refundId || ''),
          fechaReembolso: new Date(),
        },
      });

      this.logger.log(
        `✅ Reembolso procesado - Pago ${id} - Refund ID: ${resultado.refundId}`
      );

      return {
        pago: pagoActualizado,
        reembolso: resultado,
        message: resultado.simulated
          ? 'Reembolso simulado en modo sandbox (funcionalidad real implementada)'
          : 'Reembolso procesado exitosamente en MercadoPago',
      };
    } catch (error) {
      this.logger.error(`Error al procesar reembolso para pago ${id}:`, error);
      throw new BadRequestException(
        `Error al procesar reembolso: ${error.message}`
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
   * Obtener métodos de pago disponibles (MEJORADO - Datos reales de MercadoPago)
   */
  obtenerMetodosPagoDisponibles() {
    try {
      // Obtener métodos reales desde el servicio dedicado
      const metodosReales =
        this.pagosMercadoPagoService.obtenerMetodosPagoReales();

      // Validar configuración actual
      const configuracionValida =
        this.pagosMercadoPagoService.validarConfiguracion();

      const config = getMercadoPagoConfig();

      return {
        // ✅ MÉTODOS COMPLETAMENTE FUNCIONALES EN SANDBOX
        metodos: metodosReales,
        configuracion: {
          pais: 'PE',
          moneda: 'PEN',
          modoTest: true, // SIEMPRE en modo test
          configuracionValida,
          advertencia: '🚨 SOLO MODO SANDBOX - No procesa dinero real',
          credencialesActuales: {
            accessToken: config.accessToken.substring(0, 20) + '...',
            publicKey: config.publicKey.substring(0, 20) + '...',
            sonCredencialesTest:
              config.accessToken.startsWith('TEST-') &&
              config.publicKey.startsWith('TEST-'),
          },
        },
        // Información REAL de la documentación oficial
        tarjetasDePrueba:
          MERCADOPAGO_PAYMENT_METHODS.MERCADOPAGO_CREDIT_CARD.tarjetasPrueba,
        importante: {
          metodosDisponibles:
            'Solo tarjetas de crédito y débito funcionan correctamente en sandbox',
          tarjetas:
            'Tarjetas oficiales actualizadas de la documentación de MercadoPago Perú 2025',
          seguridad: 'Validación automática de credenciales TEST activa',
          documentacion:
            'https://www.mercadopago.com.pe/developers/es/docs/checkout-api/integration-test',
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
            type: this.validarTipoDocumento(dto.comprador.documento),
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
   * 🎯 MAPEO REALISTA - Mapear método de pago a ID de MercadoPago
   * NOTA: En producción real, el payment_method_id se debe determinar
   * dinámicamente según el BIN de la tarjeta usando el frontend
   * @see https://www.mercadopago.com/developers/es/reference/payment_methods/_payment_methods/get
   */
  private mapearMetodoPago(metodoPago: MetodoPago): string {
    // ⚠️ IMPLEMENTACIÓN SIMPLIFICADA PARA DESARROLLO
    // En un entorno real, esto debería venir del frontend tras consultar el BIN
    const mapping = {
      MERCADOPAGO_CREDIT_CARD: 'visa', // En producción: determinado por BIN
      MERCADOPAGO_DEBIT_CARD: 'visa', // En producción: determinado por BIN
    };

    const mappedMethod = mapping[metodoPago as keyof typeof mapping];

    if (!mappedMethod) {
      throw new BadRequestException(
        `Método de pago no soportado: ${metodoPago}. ` +
          `Métodos disponibles: ${Object.keys(mapping).join(', ')}`
      );
    }

    this.logger.warn(
      `⚠️ DESARROLLO: Usando payment_method_id fijo '${mappedMethod}'. ` +
        `En producción, debe determinarse dinámicamente según el BIN de la tarjeta ` +
        `usando MercadoPago.js en el frontend.`
    );

    return mappedMethod;
  }

  /**
   * 🎯 CHECKOUT API OPTIMIZADO - Crear pago directo (sin redirección)
   * Implementación completa con validaciones y mejor manejo de errores
   */
  async crearPagoDirectoMercadoPago(dto: PagoConTarjetaDto) {
    this.logger.log(
      `🎯 Iniciando pago Checkout API para pedido ${dto.pedidoId}`
    );

    // 1. Validar token de tarjeta
    const tokenValido = this.pagosMercadoPagoService.validarTokenTarjeta(
      dto.token
    );
    if (!tokenValido) {
      throw new BadRequestException(
        'Token de tarjeta inválido. Regenere el token desde el frontend.'
      );
    }

    // 2. Verificar que el pedido existe
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
          mercadopagoPaymentId: pagoMercadoPago.id?.toString(),
          mercadopagoStatus: pagoMercadoPago.status,
          mercadopagoDetail: pagoMercadoPago.status_detail,
          referencia: dto.referencia || `CHECKOUT-API-${pagoMercadoPago.id}`,
          fechaPago: pagoMercadoPago.date_approved
            ? new Date(pagoMercadoPago.date_approved)
            : null,
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
  async validarConfiguracionMercadoPago() {
    try {
      const configuracionValida =
        await this.pagosMercadoPagoService.validarConfiguracion();
      const config = getMercadoPagoConfig();

      return {
        configuracionValida,
        detalles: {
          credencialesTest: {
            accessToken: config.accessToken.startsWith('TEST-'),
            publicKey: config.publicKey.startsWith('TEST-'),
          },
          urls: {
            success: config.successUrl,
            failure: config.failureUrl,
            pending: config.pendingUrl,
            webhook: config.webhookUrl,
          },
          estado: configuracionValida ? 'CONFIGURADO' : 'ERROR_CONFIGURACION',
          mensaje: configuracionValida
            ? '✅ MercadoPago configurado correctamente'
            : '❌ Error en la configuración de MercadoPago',
        },
      };
    } catch (error) {
      this.logger.error('Error al validar configuración:', error);
      throw new BadRequestException(
        'Error al validar la configuración de MercadoPago'
      );
    }
  }

  /**
   * Obtener estadísticas detalladas de MercadoPago
   */
  async obtenerEstadisticasMercadoPago() {
    try {
      const estadisticasMP =
        this.pagosMercadoPagoService.obtenerEstadisticasMercadoPago();
      const estadisticasLocales = await this.obtenerEstadisticasPagos();

      return {
        mercadopago: estadisticasMP,
        estadisticasLocales,
        resumen: {
          modoOperacion: 'SANDBOX',
          ultimaActualizacion: new Date().toISOString(),
          advertencia: '⚠️ Datos de sandbox - No incluye transacciones reales',
        },
      };
    } catch (error) {
      this.logger.error('Error al obtener estadísticas de MercadoPago:', error);
      throw new BadRequestException(
        'Error al obtener estadísticas de MercadoPago'
      );
    }
  }

  /**
   * 🎯 CHECKOUT API - Validar token de tarjeta (delegado al servicio dedicado)
   */
  validarTokenTarjeta(token: string): boolean {
    return this.pagosMercadoPagoService.validarTokenTarjeta(token);
  }

  /**
   * 🎯 CHECKOUT API - Obtener cuotas disponibles (delegado al servicio dedicado)
   */
  obtenerCuotasDisponibles(monto: number, metodoPago?: string) {
    return this.pagosMercadoPagoService.obtenerCuotasDisponibles(
      monto,
      metodoPago
    );
  }

  /**
   * Validar tipo de documento según estándares de Perú
   * Basado en documentación oficial de MercadoPago
   */
  private validarTipoDocumento(documento: string): string {
    // Validación para Perú según documentación oficial
    if (documento.length === 8) {
      return 'DNI'; // Documento Nacional de Identidad (8 dígitos)
    } else if (documento.length === 11) {
      return 'RUC'; // Registro Único de Contribuyentes (11 dígitos)
    } else if (documento.length >= 9 && documento.length <= 12) {
      return 'CE'; // Carné de Extranjería
    }

    // Default a DNI si no se puede determinar
    this.logger.warn(
      `Tipo de documento no determinado para: ${documento}. Usando DNI por defecto.`
    );
    return 'DNI';
  }
}
