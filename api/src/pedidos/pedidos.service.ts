/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePedidoDto } from './dto/crear-pedido.dto';
import { UpdatePedidoDto } from './dto/update-pedido.dto';
import { FiltrosPedidosDto } from './dto/filtros-pedidos.dto';
import { EstadoPedido, Prisma } from '@prisma/client';
import { PagosService } from '../pagos/pagos.service';
import { ProcesarPedidoDto } from './dto/procesar-pedido.dto';

@Injectable()
export class PedidosService {
  private readonly logger = new Logger(PedidosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pagosService: PagosService
  ) {}

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

    // Solo validar dirección si no es recojo en tienda
    if (dto.direccionId) {
      const direccion = await this.prisma.direccionCliente.findFirst({
        where: { id: dto.direccionId, usuarioId: dto.usuarioId },
      });
      if (!direccion) {
        throw new NotFoundException('Dirección no encontrada');
      }
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

    const envioMonto = dto.metodoEnvio === 'DELIVERY' ? 15.0 : 0.0;
    const impuestos = subtotal * 0.18; // 18% IGV (Impuesto General a las Ventas - Perú)

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

    const total = subtotal + envioMonto + impuestos - descuentoMonto;

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
      const pedidoData: any = {
        numero: numeroPedido,
        usuarioId: dto.usuarioId,
        subtotal,
        impuestos,
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
      };

      // Solo agregar direccionId si no es null
      if (dto.direccionId) {
        pedidoData.direccionId = dto.direccionId;
      }

      const pedido = await tx.pedido.create({
        data: pedidoData,
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

  /**
   * NUEVO MÉTODO: Procesar pedido con pago integrado
   * Este es el flujo CORRECTO:
   * 1. Validar stock y datos
   * 2. Procesar pago
   * 3. Solo si pago es exitoso: crear pedido + descontar stock
   */
  async procesarPedidoConPago(dto: ProcesarPedidoDto) {
    this.logger.log('🔄 Iniciando procesamiento de pedido con pago integrado');

    // 1. VALIDAR USUARIO
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: dto.usuarioId },
    });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // 2. VALIDAR PRODUCTOS Y CALCULAR TOTALES
    let subtotal = 0;
    const detallesConPrecios: Array<{
      productoId: number;
      cantidad: number;
      precioUnitario: number;
      subtotal: number;
    }> = [];

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
          `Stock insuficiente para el producto ${producto.nombre}. Stock disponible: ${producto.stock}, solicitado: ${detalle.cantidad}`
        );
      }

      const subtotalDetalle =
        Number(producto.precioUnitario) * detalle.cantidad;
      subtotal += subtotalDetalle;

      detallesConPrecios.push({
        productoId: detalle.productoId,
        cantidad: detalle.cantidad,
        precioUnitario: Number(producto.precioUnitario),
        subtotal: subtotalDetalle,
      });
    }

    // 3. CALCULAR TOTALES FINALES
    const envioMonto = dto.metodoEnvio === 'DELIVERY' ? 15.0 : 0.0;
    const impuestos = subtotal * 0.18; // IGV Perú

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

    const total = subtotal + envioMonto + impuestos - descuentoMonto;

    this.logger.log(`💰 Total calculado: S/ ${total.toFixed(2)}`);

    // 4. PROCESAR PAGO PRIMERO
    let pagoRespuesta;
    try {
      if (
        dto.metodoPago === 'visa' ||
        dto.metodoPago === 'master' ||
        dto.metodoPago === 'amex'
      ) {
        this.logger.log('💳 Procesando pago con tarjeta...');

        // Mapear los campos para que coincidan con el DTO de pagos
        const datosTarjetaConvertidos = dto.datosTarjeta
          ? {
              ...dto.datosTarjeta,
              email: dto.datosTarjeta.email || usuario.email,
            }
          : undefined;

        pagoRespuesta = await this.pagosService.crearPagoDirectoMercadoPago({
          pedidoId: 0, // Temporal, se actualizará después
          monto: Math.round(total * 100), // Convertir a centavos
          metodoPago: dto.metodoPago,
          token: dto.token,
          datosTarjeta: datosTarjetaConvertidos,
          issuerId: dto.issuerId,
        });

        this.logger.log('✅ Pago procesado exitosamente:', {
          id: pagoRespuesta.id,
          estado: pagoRespuesta.status,
          monto: pagoRespuesta.transaction_amount,
        });

        // Verificar que el pago fue aprobado
        if (pagoRespuesta.status !== 'approved') {
          throw new BadRequestException(
            `Pago rechazado: ${
              pagoRespuesta.status_detail || 'Error en el procesamiento'
            }`
          );
        }
      } else {
        // Para otros métodos de pago que no requieren procesamiento inmediato
        pagoRespuesta = {
          id: `PENDING-${Date.now()}`,
          status: 'pending',
          transaction_amount: total,
          status_detail: 'Pago pendiente de confirmación',
        };
      }
    } catch (error) {
      this.logger.error('❌ Error al procesar pago:', error.message);
      throw new BadRequestException(`Error al procesar pago: ${error.message}`);
    }

    // 5. SOLO SI EL PAGO FUE EXITOSO: CREAR PEDIDO Y DESCONTAR STOCK
    return this.prisma.$transaction(async (tx) => {
      // Generar número de pedido definitivo
      const year = new Date().getFullYear();
      const ultimoPedido = await tx.pedido.findFirst({
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

      // Crear pedido
      const pedidoData: any = {
        numero: numeroPedido,
        usuarioId: dto.usuarioId,
        subtotal,
        impuestos,
        envioMonto,
        descuentoMonto,
        total,
        promocionCodigo: dto.promocionCodigo,
        metodoPago: dto.metodoPago,
        metodoEnvio: dto.metodoEnvio,
        notasCliente: dto.notasCliente,
        notasInternas: dto.notasInternas,
        detallePedidos: {
          create: detallesConPrecios.map((detalle) => ({
            productoId: detalle.productoId,
            cantidad: detalle.cantidad,
            precioUnitario: detalle.precioUnitario,
            subtotal: detalle.subtotal,
          })),
        },
      };

      if (dto.direccionId) {
        pedidoData.direccionId = dto.direccionId;
      }

      const pedido = await tx.pedido.create({
        data: pedidoData,
        include: {
          detallePedidos: {
            include: {
              producto: true,
            },
          },
          direccion: true,
          usuario: true,
        },
      });

      // Descontar stock SOLO después de crear el pedido exitosamente
      for (const detalle of detallesConPrecios) {
        await tx.producto.update({
          where: { id: detalle.productoId },
          data: {
            stock: {
              decrement: detalle.cantidad,
            },
          },
        });
      }

      // Crear registro de pago en la base de datos
      if (pagoRespuesta.status === 'approved') {
        await tx.pago.create({
          data: {
            pedidoId: pedido.id,
            monto: total,
            estado: 'COMPLETADO',
            mercadopagoId: pagoRespuesta.id.toString(),
            paymentMethodId: dto.metodoPago,
            ultimosCuatroDigitos: dto.datosTarjeta?.numeroTarjeta?.slice(-4),
            cuotas: 1,
            fechaPago: new Date(),
          },
        });

        // Actualizar estado del pedido a CONFIRMADO
        await tx.pedido.update({
          where: { id: pedido.id },
          data: { estado: 'CONFIRMADO' },
        });
      } else {
        // Para pagos pendientes
        await tx.pago.create({
          data: {
            pedidoId: pedido.id,
            monto: total,
            estado: 'PENDIENTE',
            mercadopagoId: pagoRespuesta.id.toString(),
            paymentMethodId: dto.metodoPago,
          },
        });
      }

      this.logger.log(
        `✅ Pedido ${numeroPedido} creado exitosamente con pago procesado`
      );

      return {
        pedido: this.convertDecimalFields(pedido),
        pago: pagoRespuesta,
        mensaje:
          pagoRespuesta.status === 'approved'
            ? 'Pedido creado y pago procesado exitosamente'
            : 'Pedido creado, pago pendiente de confirmación',
      };
    });
  }
}
