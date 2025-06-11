import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePagoDto } from './dto/crear-pago.dto';
import { UpdatePagoDto } from './dto/update-pago.dto';
import { FiltrosPagosDto } from './dto/filtros-pagos.dto';
import { Prisma, EstadoPago } from '@prisma/client';

@Injectable()
export class PagosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePagoDto) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: dto.pedidoId },
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

    const totalPagado = pagosExistentes.reduce(
      (total, pago) => total + Number(pago.monto),
      0,
    );

    const totalPedido = Number(pedido.total);
    const nuevoMonto = Number(dto.monto);

    if (totalPagado + nuevoMonto > totalPedido) {
      throw new BadRequestException(
        `El monto del pago excede el total pendiente. Pendiente: S/${totalPedido - totalPagado}`,
      );
    }

    return this.prisma.pago.create({
      data: dto,
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
  }

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

  async findByPedido(pedidoId: number) {
    return this.prisma.pago.findMany({
      where: { pedidoId },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async update(id: number, dto: UpdatePagoDto) {
    const pago = await this.prisma.pago.findUnique({
      where: { id },
    });

    if (!pago) {
      throw new NotFoundException('Pago no encontrado');
    }

    const updateData: {
      estado?: EstadoPago;
      fechaPago?: Date;
      referencia?: string;
    } = {};

    if (dto.estado) updateData.estado = dto.estado;
    if (dto.referencia) updateData.referencia = dto.referencia;
    if (dto.fechaPago) {
      updateData.fechaPago = new Date(dto.fechaPago);
    }

    return this.prisma.pago.update({
      where: { id },
      data: updateData,
      include: {
        pedido: {
          select: {
            id: true,
            numero: true,
            total: true,
          },
        },
      },
    });
  }

  async confirmarPago(id: number, referencia?: string) {
    const pago = await this.findOne(id);

    if (pago.estado === 'COMPLETADO') {
      throw new BadRequestException('Este pago ya está confirmado');
    }

    const pagoActualizado = await this.prisma.pago.update({
      where: { id },
      data: {
        estado: 'COMPLETADO',
        fechaPago: new Date(),
        ...(referencia && { referencia }),
      },
    });

    await this.verificarEstadoPedido(pago.pedidoId);

    return pagoActualizado;
  }

  async rechazarPago(id: number, motivo?: string) {
    const pago = await this.findOne(id);

    if (pago.estado === 'COMPLETADO') {
      throw new BadRequestException('No se puede rechazar un pago completado');
    }

    return this.prisma.pago.update({
      where: { id },
      data: {
        estado: 'FALLIDO',
        referencia: motivo || 'Pago rechazado',
      },
    });
  }

  async procesarReembolso(id: number, motivo?: string) {
    const pago = await this.findOne(id);

    if (pago.estado !== 'COMPLETADO') {
      throw new BadRequestException(
        'Solo se pueden reembolsar pagos completados',
      );
    }

    return this.prisma.pago.update({
      where: { id },
      data: {
        estado: 'REEMBOLSADO',
        referencia: `REEMBOLSO: ${motivo || 'Reembolso procesado'}`,
      },
    });
  }

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
      0,
    );

    const totalPedido = Number(pedido.total);

    if (totalPagado >= totalPedido && pedido.estado === 'PENDIENTE') {
      await this.prisma.pedido.update({
        where: { id: pedidoId },
        data: { estado: 'CONFIRMADO' },
      });
    }
  }

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
}
