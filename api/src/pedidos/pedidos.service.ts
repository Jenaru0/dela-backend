/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePedidoDto } from './dto/crear-pedido.dto';
import { UpdatePedidoDto } from './dto/update-pedido.dto';
import { FiltrosPedidosDto } from './dto/filtros-pedidos.dto';
import { EstadoPedido, Prisma } from '@prisma/client';

@Injectable()
export class PedidosService {
  constructor(private readonly prisma: PrismaService) {}

  // Helper para convertir Decimals a numbers

  private convertDecimalFields(pedido: any): any {
    try {
      return {
        ...pedido,
        subtotal: parseFloat(String(pedido.subtotal || '0')),
        impuestos: parseFloat(String(pedido.impuestos || '0')),
        costoEnvio: parseFloat(String(pedido.envioMonto || '0')),
        descuento: parseFloat(String(pedido.descuentoMonto || '0')),
        total: parseFloat(String(pedido.total || '0')),
        detallePedidos:
          pedido.detallePedidos?.map((detalle: any) => {
            try {
              const producto = detalle.producto || {};

              const imagen = producto?.imagenes?.[0]?.url || null;

              return {
                ...detalle,
                precio: parseFloat(String(detalle.precioUnitario || '0')),
                subtotal: parseFloat(String(detalle.subtotal || '0')),
                producto: {
                  ...producto,

                  imagen,
                  precio: parseFloat(String(producto?.precioUnitario || '0')),
                },
              };
            } catch (detalleError) {
              console.error('❌ Error al convertir detalle:', detalleError);
              return detalle; // Devolver original si hay error
            }
          }) || [],
      };
    } catch (error) {
      console.error('❌ Error al convertir campos decimales:', error);
      return pedido; // Devolver original si hay error
    }
  }

  async create(dto: CreatePedidoDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: dto.usuarioId },
    });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const direccion = await this.prisma.direccionCliente.findFirst({
      where: { id: dto.direccionId, usuarioId: dto.usuarioId },
    });
    if (!direccion) {
      throw new NotFoundException('Dirección no encontrada');
    }

    let subtotal = 0;
    const detallesConPrecios: any[] = [];

    for (const detalle of dto.detalles) {
      const producto = await this.prisma.producto.findUnique({
        where: { id: detalle.productoId },
      });

      if (!producto) {
        throw new NotFoundException(
          `Producto con ID ${detalle.productoId} no encontrado`
        );
      }

      if (producto.stock < detalle.cantidad) {
        throw new BadRequestException(
          `Stock insuficiente para el producto ${producto.nombre}`
        );
      }

      const subtotalDetalle =
        Number(producto.precioUnitario) * detalle.cantidad;
      subtotal += subtotalDetalle;

      detallesConPrecios.push({
        productoId: detalle.productoId,
        cantidad: detalle.cantidad,
        precioUnitario: producto.precioUnitario,
        subtotal: subtotalDetalle,
      });
    }

    const envioMonto = dto.metodoEnvio === 'DELIVERY' ? 10.0 : 0.0;

    let descuentoMonto = 0;
    if (dto.promocionCodigo) {
      const promocion = await this.prisma.promocion.findUnique({
        where: { codigo: dto.promocionCodigo },
      });

      if (promocion && promocion.activo) {
        if (promocion.tipo === 'PORCENTAJE') {
          descuentoMonto = (subtotal * Number(promocion.valor)) / 100;
        } else if (promocion.tipo === 'MONTO_FIJO') {
          descuentoMonto = Number(promocion.valor);
        }
      }
    }

    const total = subtotal + envioMonto - descuentoMonto;

    const year = new Date().getFullYear();
    const ultimoPedido = await this.prisma.pedido.findFirst({
      where: { numero: { startsWith: `PED-${year}-` } },
      orderBy: { numero: 'desc' },
    });

    let siguienteNumero = 1;
    if (ultimoPedido) {
      const numeroActual = parseInt(ultimoPedido.numero.split('-')[2]);
      siguienteNumero = numeroActual + 1;
    }

    const numeroPedido = `PED-${year}-${siguienteNumero
      .toString()
      .padStart(6, '0')}`;

    return this.prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.create({
        data: {
          numero: numeroPedido,
          usuarioId: dto.usuarioId,
          direccionId: dto.direccionId,
          subtotal,
          envioMonto,
          descuentoMonto,
          total,
          promocionCodigo: dto.promocionCodigo,
          metodoPago: dto.metodoPago,
          metodoEnvio: dto.metodoEnvio,
          notasCliente: dto.notasCliente,
          notasInternas: dto.notasInternas,
          detallePedidos: {
            create: detallesConPrecios,
          },
        },
        include: {
          detallePedidos: {
            include: {
              producto: true,
            },
          },
          direccion: true,
        },
      });

      for (const detalle of dto.detalles) {
        await tx.producto.update({
          where: { id: detalle.productoId },
          data: {
            stock: {
              decrement: detalle.cantidad,
            },
          },
        });
      }

      return pedido;
    });
  }

  async findAll(filtros: FiltrosPedidosDto) {
    const {
      usuarioId,
      estado,
      fechaInicio,
      fechaFin,
      page = 1,
      limit = 10,
    } = filtros;

    const where: Prisma.PedidoWhereInput = {};

    if (usuarioId) where.usuarioId = usuarioId;
    if (estado) where.estado = estado;

    if (fechaInicio || fechaFin) {
      where.fechaPedido = {};
      if (fechaInicio) where.fechaPedido.gte = new Date(fechaInicio);
      if (fechaFin) where.fechaPedido.lte = new Date(fechaFin);
    }

    const skip = (page - 1) * limit;

    const [pedidos, total] = await Promise.all([
      this.prisma.pedido.findMany({
        where,
        include: {
          usuario: {
            select: { id: true, nombres: true, apellidos: true, email: true },
          },
          direccion: true,
          detallePedidos: {
            include: {
              producto: {
                select: {
                  id: true,
                  nombre: true,
                  sku: true,
                  precioUnitario: true,
                  imagenes: {
                    where: { principal: true },
                    select: { url: true, altText: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { fechaPedido: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.pedido.count({ where }),
    ]);

    // Convertir campos decimales
    const pedidosConvertidos = pedidos.map((pedido) =>
      this.convertDecimalFields(pedido)
    );

    return {
      data: pedidosConvertidos,
      page,
      limit,
      total,
    };
  }

  async findAllForAdminWithPagination(
    page: number = 1,
    limit: number = 10,
    search?: string,
    estado?: EstadoPedido,
    fechaInicio?: string,
    fechaFin?: string
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.PedidoWhereInput = {};

    if (search) {
      where.OR = [
        { numero: { contains: search, mode: 'insensitive' } },
        { usuario: { nombres: { contains: search, mode: 'insensitive' } } },
        { usuario: { apellidos: { contains: search, mode: 'insensitive' } } },
        { usuario: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (estado) {
      where.estado = estado;
    }

    if (fechaInicio || fechaFin) {
      where.fechaPedido = {};
      if (fechaInicio) {
        where.fechaPedido.gte = new Date(fechaInicio);
      }
      if (fechaFin) {
        where.fechaPedido.lte = new Date(fechaFin);
      }
    }

    const [pedidos, total] = await Promise.all([
      this.prisma.pedido.findMany({
        where,
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
                select: {
                  id: true,
                  nombre: true,
                  sku: true,
                  imagenes: {
                    where: { principal: true },
                    select: { url: true, altText: true },
                  },
                },
              },
            },
          },
          pagos: true,
        },
        orderBy: { id: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.pedido.count({ where }),
    ]);

    return {
      data: pedidos.map((pedido) => this.convertDecimalFields(pedido)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } // Obtener todas las órdenes para admin (sin paginación, para estadísticas)
  async findAllForAdmin() {
    try {
      console.log('🔍 Backend Service: Iniciando findAllForAdmin');

      const pedidos = await this.prisma.pedido.findMany({
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
                select: {
                  id: true,
                  nombre: true,
                  sku: true,
                  precioUnitario: true,
                  imagenes: {
                    where: { principal: true },
                    select: { url: true, altText: true },
                  },
                },
              },
            },
          },
          pagos: true,
        },
        orderBy: { fechaPedido: 'desc' },
      });

      console.log(
        `✅ Backend Service: ${pedidos.length} pedidos obtenidos de la BD`
      );

      // Convertir campos decimales
      const pedidosConvertidos = pedidos.map((pedido) =>
        this.convertDecimalFields(pedido)
      );

      const result = {
        data: pedidosConvertidos,
        total: pedidos.length,
      };

      console.log('✅ Backend Service: Resultado preparado correctamente');
      return result;
    } catch (error) {
      console.error('❌ Backend Service: Error en findAllForAdmin:', error);
      console.error('❌ Backend Service: Error message:', error.message);
      console.error('❌ Backend Service: Error stack:', error.stack);

      // Lanzar el error para que se vea en los logs
      throw error;
    }
  }

  async findOne(id: number) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id },
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
              select: {
                id: true,
                nombre: true,
                sku: true,
                precioUnitario: true,
                imagenes: {
                  where: { principal: true },
                  select: { url: true, altText: true },
                },
              },
            },
          },
        },
        pagos: true,
      },
    });

    if (!pedido) {
      throw new NotFoundException('Pedido no encontrado');
    }

    return this.convertDecimalFields(pedido);
  }

  async update(id: number, dto: UpdatePedidoDto) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id },
    });

    if (!pedido) {
      throw new NotFoundException('Pedido no encontrado');
    }

    return this.prisma.pedido.update({
      where: { id },
      data: dto,
    });
  }

  async findByUsuario(usuarioId: number) {
    return this.prisma.pedido.findMany({
      where: { usuarioId },
      include: {
        detallePedidos: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                sku: true,
                imagenes: {
                  where: { principal: true },
                  select: { url: true, altText: true },
                },
              },
            },
          },
        },
        direccion: true,
      },
      orderBy: { fechaPedido: 'desc' },
    });
  }

  async cambiarEstado(
    id: number,
    estado: EstadoPedido,
    notasInternas?: string
  ) {
    const updateData: UpdatePedidoDto = { estado };

    // Si se proporcionan notas internas, incluirlas en la actualización
    if (notasInternas !== undefined) {
      updateData.notasInternas = notasInternas;
    }

    return this.update(id, updateData);
  }
  async findByUser(usuarioId: number): Promise<any[]> {
    try {
      console.log(
        '🔍 Backend Service: findByUser - iniciando para usuario:',
        usuarioId
      );

      // Verificar que el usuarioId es válido
      if (!usuarioId || usuarioId <= 0) {
        console.error('❌ UsuarioId inválido:', usuarioId);
        throw new Error('ID de usuario inválido');
      }

      // Consulta simple sin relaciones primero
      console.log('🔍 Verificando si existen pedidos para el usuario...');
      const pedidosCount = await this.prisma.pedido.count({
        where: { usuarioId: usuarioId },
      });
      console.log(
        `✅ Pedidos encontrados para usuario ${usuarioId}: ${pedidosCount}`
      );

      if (pedidosCount === 0) {
        console.log('ℹ️  No hay pedidos para este usuario');
        return [];
      }

      // Consulta básica sin relaciones complejas
      console.log('🔍 Obteniendo pedidos básicos del usuario...');
      const pedidos = await this.prisma.pedido.findMany({
        where: {
          usuarioId: usuarioId,
        },
        orderBy: {
          creadoEn: 'desc',
        },
      });

      console.log(`✅ Pedidos básicos obtenidos: ${pedidos.length}`);
      return pedidos;
    } catch (error) {
      console.error('❌ Backend Service: Error en findByUser:', error);
      console.error('❌ Backend Service: Error stack:', error.stack);
      throw error;
    }
  }

  // Obtener todos los pedidos sin paginación (para dashboard)
  async findAllSimple(filtros: FiltrosPedidosDto) {
    const { usuarioId, estado, fechaInicio, fechaFin } = filtros;

    const where: Prisma.PedidoWhereInput = {};

    if (usuarioId) where.usuarioId = usuarioId;
    if (estado) where.estado = estado;

    if (fechaInicio || fechaFin) {
      where.fechaPedido = {};
      if (fechaInicio) where.fechaPedido.gte = new Date(fechaInicio);
      if (fechaFin) where.fechaPedido.lte = new Date(fechaFin);
    }

    const pedidos = await this.prisma.pedido.findMany({
      where,
      include: {
        usuario: {
          select: { id: true, nombres: true, apellidos: true, email: true },
        },
        direccion: true,
        detallePedidos: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                sku: true,
                precioUnitario: true,
                imagenes: {
                  where: { principal: true },
                  select: { url: true, altText: true },
                },
              },
            },
          },
        },
      },
      orderBy: { fechaPedido: 'desc' },
    });

    // Convertir campos decimales
    return pedidos.map((pedido) => this.convertDecimalFields(pedido));
  }

  // Método simple para verificar la conexión a BD
  async verificarConexion() {
    try {
      console.log('🔍 Verificando conexión a base de datos...');
      const count = await this.prisma.pedido.count();
      console.log(`✅ Conexión exitosa. Total pedidos en BD: ${count}`);
      return { success: true, count };
    } catch (error) {
      console.error('❌ Error de conexión a BD:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error desconocido de conexión',
      };
    }
  }
}
