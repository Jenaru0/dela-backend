import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResenaDto, UpdateResenaDto } from './dto';
import { EstadoResena, TipoUsuario } from '@prisma/client';

@Injectable()
export class ResenasService {
  constructor(private prisma: PrismaService) {}

  async create(usuarioId: number, createResenaDto: CreateResenaDto) {
    const { productoId } = createResenaDto;

    // Verificar que el producto existe
    const producto = await this.prisma.producto.findUnique({
      where: { id: productoId },
    });

    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }

    // Verificar que el usuario no haya dejado ya una reseña para este producto
    const existingResena = await this.prisma.resena.findUnique({
      where: {
        usuarioId_productoId: {
          usuarioId,
          productoId,
        },
      },
    });

    if (existingResena) {
      throw new ConflictException(
        'Ya has dejado una reseña para este producto'
      );
    }

    // Verificar que el usuario haya comprado el producto
    const hasComprado = await this.prisma.detallePedido.findFirst({
      where: {
        productoId,
        pedido: {
          usuarioId,
          estado: 'ENTREGADO',
        },
      },
    });

    if (!hasComprado) {
      throw new ForbiddenException(
        'Solo puedes reseñar productos que hayas comprado'
      );
    }

    const nuevaResena = await this.prisma.resena.create({
      data: {
        ...createResenaDto,
        usuarioId,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
          },
        },
        producto: {
          select: {
            id: true,
            nombre: true,
            slug: true,
          },
        },
      },
    });
    
    return nuevaResena;
  }

  async findAll(page: number = 1, limit: number = 10, estado?: EstadoResena) {
    const skip = (page - 1) * limit;

    const where = estado ? { estado } : {};

    const [resenas, total] = await Promise.all([
      this.prisma.resena.findMany({
        where,
        skip,
        take: limit,
        include: {
          usuario: {
            select: {
              id: true,
              nombres: true,
              apellidos: true,
            },
          },
          producto: {
            select: {
              id: true,
              nombre: true,
              slug: true,
            },
          },
        },
        orderBy: {
          creadoEn: 'desc',
        },
      }),
      this.prisma.resena.count({ where }),
    ]);

    return {
      resenas,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByUser(usuarioId: number, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [resenas, total] = await Promise.all([
      this.prisma.resena.findMany({
        where: { usuarioId },
        include: {
          producto: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
        orderBy: { creadoEn: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.resena.count({ where: { usuarioId } }),
    ]);

    return {
      mensaje: 'Reseñas obtenidas correctamente',
      data: resenas,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByProduct(
    productoId: number,
    page: number = 1,
    limit: number = 10,
    estado: EstadoResena = EstadoResena.APROBADO
  ) {
    const skip = (page - 1) * limit;

    const [resenas, total, promedio] = await Promise.all([
      this.prisma.resena.findMany({
        where: {
          productoId,
          estado,
        },
        skip,
        take: limit,
        include: {
          usuario: {
            select: {
              id: true,
              nombres: true,
              apellidos: true,
            },
          },
        },
        orderBy: {
          creadoEn: 'desc',
        },
      }),
      this.prisma.resena.count({
        where: {
          productoId,
          estado,
        },
      }),
      this.prisma.resena.aggregate({
        where: {
          productoId,
          estado,
        },
        _avg: {
          calificacion: true,
        },
      }),
    ]);

    return {
      resenas,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      promedioCalificacion: promedio._avg.calificacion || 0,
    };
  }

  async findOne(id: number) {
    const resena = await this.prisma.resena.findUnique({
      where: { id },
      include: {
        usuario: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
          },
        },
        producto: {
          select: {
            id: true,
            nombre: true,
            slug: true,
          },
        },
      },
    });

    if (!resena) {
      throw new NotFoundException('Reseña no encontrada');
    }

    return resena;
  }

  async update(
    id: number,
    updateResenaDto: UpdateResenaDto,
    usuarioId?: number,
    tipoUsuario?: TipoUsuario
  ) {
    const resena = await this.findOne(id);

    // Solo el autor o admin pueden editar
    if (tipoUsuario !== TipoUsuario.ADMIN && resena.usuarioId !== usuarioId) {
      throw new ForbiddenException(
        'No tienes permisos para editar esta reseña'
      );
    }

    // Solo admin puede cambiar el estado
    if (tipoUsuario !== TipoUsuario.ADMIN && updateResenaDto.estado) {
      delete updateResenaDto.estado;
    }

    return this.prisma.resena.update({
      where: { id },
      data: updateResenaDto,
      include: {
        usuario: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
          },
        },
        producto: {
          select: {
            id: true,
            nombre: true,
            slug: true,
          },
        },
      },
    });
  }

  async remove(id: number, usuarioId?: number, tipoUsuario?: TipoUsuario) {
    const resena = await this.findOne(id);

    // Solo el autor o admin pueden eliminar
    if (tipoUsuario !== TipoUsuario.ADMIN && resena.usuarioId !== usuarioId) {
      throw new ForbiddenException(
        'No tienes permisos para eliminar esta reseña'
      );
    }

    return this.prisma.resena.delete({
      where: { id },
    });
  }

  async getProductRatingStats(productoId: number) {
    const stats = await this.prisma.resena.groupBy({
      by: ['calificacion'],
      where: {
        productoId,
        estado: EstadoResena.APROBADO,
      },
      _count: {
        id: true,
      },
    });

    const total = await this.prisma.resena.count({
      where: {
        productoId,
        estado: EstadoResena.APROBADO,
      },
    });

    const promedio = await this.prisma.resena.aggregate({
      where: {
        productoId,
        estado: EstadoResena.APROBADO,
      },
      _avg: {
        calificacion: true,
      },
    });

    return {
      total,
      promedio: promedio._avg.calificacion || 0,
      distribucion: stats,
    };
  }

  async getStatistics() {
    const stats = await this.prisma.resena.groupBy({
      by: ['estado'],
      _count: {
        id: true,
      },
    });

    const total = await this.prisma.resena.count();

    const promedioGeneral = await this.prisma.resena.aggregate({
      where: { estado: EstadoResena.APROBADO },
      _avg: {
        calificacion: true,
      },
    });

    return {
      total,
      promedioGeneral: promedioGeneral._avg.calificacion || 0,
      porEstado: stats,
    };
  }
}
