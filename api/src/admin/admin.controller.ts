import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';
import { AdminGuard } from '../autenticacion/guards/admin.guard';
import { UsuariosService } from '../usuarios/usuarios.service';
import { DireccionesService } from '../direcciones/direcciones.service';
import { ReclamosService } from '../reclamos/reclamos.service';
import { ResenasService } from '../resenas/resenas.service';
import { FavoritosService } from '../favorito/favoritos.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly direccionesService: DireccionesService,
    private readonly reclamosService: ReclamosService,
    private readonly resenasService: ResenasService,
    private readonly favoritosService: FavoritosService,
    private readonly prisma: PrismaService
  ) {}

  // Obtener actividad completa de un usuario
  @Get('usuarios/:id/actividad')
  async obtenerActividadUsuario(@Param('id', ParseIntPipe) id: number) {
    try {
      const [direcciones, pedidos, reclamos, reviews, favoritos] =
        await Promise.all([
          this.obtenerDireccionesUsuario(id),
          this.obtenerPedidosUsuario(id),
          this.obtenerReclamosUsuario(id),
          this.obtenerReviewsUsuario(id),
          this.obtenerFavoritosUsuario(id),
        ]);

      return {
        mensaje: 'Actividad del usuario obtenida correctamente',
        data: {
          direcciones: direcciones.data,
          pedidos: pedidos.data,
          reclamos: reclamos.data,
          reviews: reviews.data,
          favoritos: favoritos.data,
        },
      };
    } catch (error) {
      console.error('Error al obtener actividad del usuario:', error);
      throw error;
    }
  }

  // Obtener direcciones de un usuario
  @Get('usuarios/:id/direcciones')
  async obtenerDireccionesUsuario(@Param('id', ParseIntPipe) id: number) {
    const direcciones = await this.prisma.direccionCliente.findMany({
      where: { usuarioId: id },
      orderBy: { creadoEn: 'desc' },
    });

    return {
      mensaje: 'Direcciones del usuario obtenidas correctamente',
      data: direcciones,
    };
  }

  // Obtener pedidos de un usuario
  @Get('usuarios/:id/pedidos')
  async obtenerPedidosUsuario(@Param('id', ParseIntPipe) id: number) {
    const pedidos = await this.prisma.pedido.findMany({
      where: { usuarioId: id },
      include: {
        detallePedidos: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                sku: true,
              },
            },
          },
        },
        direccion: {
          select: {
            id: true,
            alias: true,
            direccion: true,
            distrito: true,
            provincia: true,
          },
        },
      },
      orderBy: { fechaPedido: 'desc' },
    });

    return {
      mensaje: 'Pedidos del usuario obtenidos correctamente',
      data: pedidos,
    };
  }

  // Obtener reclamos de un usuario
  @Get('usuarios/:id/reclamos')
  async obtenerReclamosUsuario(@Param('id', ParseIntPipe) id: number) {
    const reclamos = await this.prisma.reclamo.findMany({
      where: { usuarioId: id },
      include: {
        pedido: {
          select: {
            id: true,
            numero: true,
          },
        },
        _count: {
          select: {
            comentarios: true,
          },
        },
      },
      orderBy: { creadoEn: 'desc' },
    });

    return {
      mensaje: 'Reclamos del usuario obtenidos correctamente',
      data: reclamos,
    };
  }

  // Obtener reseñas de un usuario
  @Get('usuarios/:id/reviews')
  async obtenerReviewsUsuario(@Param('id', ParseIntPipe) id: number) {
    const reviews = await this.prisma.resena.findMany({
      where: { usuarioId: id },
      include: {
        producto: {
          select: {
            id: true,
            nombre: true,
            slug: true,
            precioUnitario: true,
            imagenes: {
              where: { principal: true },
              select: {
                url: true,
                altText: true,
              },
            },
          },
        },
      },
      orderBy: { creadoEn: 'desc' },
    });

    return {
      mensaje: 'Reseñas del usuario obtenidas correctamente',
      data: reviews,
    };
  }

  // Obtener favoritos de un usuario
  @Get('usuarios/:id/favoritos')
  async obtenerFavoritosUsuario(@Param('id', ParseIntPipe) id: number) {
    const favoritos = await this.prisma.favorito.findMany({
      where: { usuarioId: id },
      include: {
        producto: {
          select: {
            id: true,
            nombre: true,
            slug: true,
            precioUnitario: true,
            imagenes: {
              where: { principal: true },
              select: {
                url: true,
                altText: true,
              },
            },
          },
        },
      },
      orderBy: { creadoEn: 'desc' },
    });

    return {
      mensaje: 'Favoritos del usuario obtenidos correctamente',
      data: favoritos,
    };
  }

  // Estadísticas generales del admin
  @Get('estadisticas')
  async obtenerEstadisticas() {
    const [
      totalUsuarios,
      totalPedidos,
      totalReclamos,
      totalReviews,
      usuariosPorTipo,
      pedidosPorEstado,
      reclamosPorEstado,
      reviewsPorEstado,
    ] = await Promise.all([
      this.prisma.usuario.count({ where: { activo: true } }),
      this.prisma.pedido.count(),
      this.prisma.reclamo.count(),
      this.prisma.resena.count(),
      this.prisma.usuario.groupBy({
        by: ['tipoUsuario'],
        _count: { id: true },
        where: { activo: true },
      }),
      this.prisma.pedido.groupBy({
        by: ['estado'],
        _count: { id: true },
      }),
      this.prisma.reclamo.groupBy({
        by: ['estado'],
        _count: { id: true },
      }),
      this.prisma.resena.groupBy({
        by: ['estado'],
        _count: { id: true },
      }),
    ]);

    return {
      mensaje: 'Estadísticas obtenidas correctamente',
      data: {
        usuarios: {
          total: totalUsuarios,
          porTipo: usuariosPorTipo,
        },
        pedidos: {
          total: totalPedidos,
          porEstado: pedidosPorEstado,
        },
        reclamos: {
          total: totalReclamos,
          porEstado: reclamosPorEstado,
        },
        reviews: {
          total: totalReviews,
          porEstado: reviewsPorEstado,
        },
      },
    };
  }
}
