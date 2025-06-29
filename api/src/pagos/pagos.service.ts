import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PagoConTarjetaDto } from './dto/pago-con-tarjeta.dto';
import { WebhookMercadoPagoDto } from './dto/webhook-mercadopago.dto';
import { FiltrosPagosDto } from './dto/filtros-pagos.dto';
import { Prisma } from '@prisma/client';

// Servicios especializados
import { PaymentService } from './services/payment.service';
import { RefundService } from './services/refund.service';
import { CustomerService } from './services/customer.service';
import { MetaService } from './services/meta.service';
import { WebhookService } from './services/webhook.service';

/**
 * Servicio principal de pagos - Coordinador y delegador
 * Orquesta los servicios especializados de MercadoPago
 */
@Injectable()
export class PagosService {
  private readonly logger = new Logger(PagosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
    private readonly refundService: RefundService,
    private readonly customerService: CustomerService,
    private readonly metaService: MetaService,
    private readonly webhookService: WebhookService
  ) {}

  // ===============================================
  // MÉTODOS DE COORDINACIÓN Y CONSULTA LOCAL
  // ===============================================

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

  // ===============================================
  // DELEGACIÓN A SERVICIOS ESPECIALIZADOS
  // ===============================================

  // --- PAYMENT SERVICE ---
  async crearPagoDirectoMercadoPago(dto: PagoConTarjetaDto) {
    return this.paymentService.crearPagoDirectoMercadoPago(dto);
  }

  async obtenerPago(pagoId: string) {
    return this.paymentService.obtenerPago(pagoId);
  }

  async buscarPagos(filtros: {
    external_reference?: string;
    status?: string;
    date_created_from?: string;
    date_created_to?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.paymentService.buscarPagos(filtros);
  }

  async cancelarPago(pagoId: string) {
    return this.paymentService.cancelarPago(pagoId);
  }

  async capturarPago(pagoId: string, monto?: number) {
    return this.paymentService.capturarPago(pagoId, monto);
  }

  // --- REFUND SERVICE ---
  async crearReembolso(pagoId: string, monto?: number, razon?: string) {
    return this.refundService.crearReembolso(pagoId, monto, razon);
  }

  async crearReembolsoTotal(pagoId: string, razon?: string) {
    return this.refundService.crearReembolsoTotal(pagoId, razon);
  }

  async obtenerReembolsos(pagoId: string) {
    return this.refundService.obtenerReembolsos(pagoId);
  }

  async obtenerReembolso(pagoId: string, reembolsoId: string) {
    return this.refundService.obtenerReembolso(pagoId, reembolsoId);
  }

  // --- CUSTOMER SERVICE ---
  async crearCliente(datos: {
    email: string;
    first_name?: string;
    last_name?: string;
    phone?: {
      area_code?: string;
      number?: string;
    };
    identification?: {
      type?: string;
      number?: string;
    };
    description?: string;
  }) {
    return this.customerService.crearCliente(datos);
  }

  async obtenerCliente(clienteId: string) {
    return this.customerService.obtenerCliente(clienteId);
  }

  async buscarClientes(filtros: {
    email?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.customerService.buscarClientes(filtros);
  }

  async actualizarCliente(
    clienteId: string,
    datos: {
      email?: string;
      first_name?: string;
      last_name?: string;
      phone?: {
        area_code?: string;
        number?: string;
      };
      identification?: {
        type?: string;
        number?: string;
      };
      description?: string;
    }
  ) {
    return this.customerService.actualizarCliente(clienteId, datos);
  }

  async crearTokenTarjeta(datosTarjeta: {
    card_number: string;
    security_code: string;
    expiration_month: string;
    expiration_year: string;
    cardholder: {
      name: string;
      identification?: {
        type: string;
        number: string;
      };
    };
  }) {
    return this.customerService.crearTokenTarjeta(datosTarjeta);
  }

  // --- META SERVICE ---
  async obtenerMetodosPagoRealesAPI() {
    return this.metaService.obtenerMetodosPagoRealesAPI();
  }

  async obtenerTiposIdentificacion() {
    return this.metaService.obtenerTiposIdentificacion();
  }

  obtenerMetodosPagoDisponibles() {
    return this.metaService.obtenerMetodosPagoDisponibles();
  }

  validarConfiguracionMercadoPago() {
    return this.metaService.validarConfiguracionMercadoPago();
  }

  // --- WEBHOOK SERVICE ---
  async procesarWebhook(webhookData: WebhookMercadoPagoDto) {
    return this.webhookService.procesarWebhook(webhookData);
  }
}
