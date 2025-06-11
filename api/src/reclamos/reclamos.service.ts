import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateReclamoDto,
  UpdateReclamoDto,
  CreateComentarioReclamoDto,
} from './dto';
import {
  EstadoReclamo,
  TipoUsuario,
  TipoReclamo,
  PrioridadReclamo,
} from '@prisma/client';

@Injectable()
export class ReclamosService {
  constructor(private prisma: PrismaService) {}

  async create(usuarioId: number, createReclamoDto: CreateReclamoDto) {
    const { pedidoId, ...reclamoData } = createReclamoDto;

    // Verificar que el pedido pertenece al usuario si se proporciona
    if (pedidoId) {
      const pedido = await this.prisma.pedido.findFirst({
        where: {
          id: pedidoId,
          usuarioId,
        },
      });

      if (!pedido) {
        throw new NotFoundException('Pedido no encontrado');
      }
    }

    return this.prisma.reclamo.create({
      data: {
        ...reclamoData,
        usuarioId,
        pedidoId,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            email: true,
          },
        },
        pedido: {
          select: {
            id: true,
            numero: true,
          },
        },
        comentarios: {
          include: {
            usuario: {
              select: {
                id: true,
                nombres: true,
                apellidos: true,
                tipoUsuario: true,
              },
            },
          },
          orderBy: {
            creadoEn: 'asc',
          },
        },
      },
    });
  }

  async findAll(page: number = 1, limit: number = 10, estado?: EstadoReclamo) {
    const skip = (page - 1) * limit;

    const where = estado ? { estado } : {};

    const [reclamos, total] = await Promise.all([
      this.prisma.reclamo.findMany({
        where,
        skip,
        take: limit,
        include: {
          usuario: {
            select: {
              id: true,
              nombres: true,
              apellidos: true,
              email: true,
            },
          },
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
        orderBy: {
          creadoEn: 'desc',
        },
      }),
      this.prisma.reclamo.count({ where }),
    ]);

    return {
      reclamos,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number, usuarioId?: number, tipoUsuario?: TipoUsuario) {
    const where: {
      id: number;
      usuarioId?: number;
    } = { id };

    // Si no es admin, solo puede ver sus propios reclamos
    if (tipoUsuario !== TipoUsuario.ADMIN && usuarioId) {
      where.usuarioId = usuarioId;
    }

    const reclamo = await this.prisma.reclamo.findFirst({
      where,
      include: {
        usuario: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            email: true,
          },
        },
        pedido: {
          select: {
            id: true,
            numero: true,
          },
        },
        comentarios: {
          include: {
            usuario: {
              select: {
                id: true,
                nombres: true,
                apellidos: true,
                tipoUsuario: true,
              },
            },
          },
          orderBy: {
            creadoEn: 'asc',
          },
        },
      },
    });

    if (!reclamo) {
      throw new NotFoundException('Reclamo no encontrado');
    }

    return reclamo;
  }

  async findByUser(usuarioId: number, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [reclamos, total] = await Promise.all([
      this.prisma.reclamo.findMany({
        where: { usuarioId },
        skip,
        take: limit,
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
        orderBy: {
          creadoEn: 'desc',
        },
      }),
      this.prisma.reclamo.count({ where: { usuarioId } }),
    ]);

    return {
      reclamos,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(
    id: number,
    updateReclamoDto: UpdateReclamoDto,
    usuarioId?: number,
    tipoUsuario?: TipoUsuario,
  ) {
    // Verificar que el reclamo existe y pertenece al usuario o es admin
    await this.findOne(id, usuarioId, tipoUsuario);

    // Solo admin puede cambiar estado y prioridad
    if (tipoUsuario !== TipoUsuario.ADMIN) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { estado, prioridad, ...allowedUpdates } = updateReclamoDto;

      return this.prisma.reclamo.update({
        where: { id },
        data: allowedUpdates,
        include: {
          usuario: {
            select: {
              id: true,
              nombres: true,
              apellidos: true,
              email: true,
            },
          },
          pedido: {
            select: {
              id: true,
              numero: true,
            },
          },
        },
      });
    }

    const updateData: {
      asunto?: string;
      descripcion?: string;
      estado?: EstadoReclamo;
      tipoReclamo?: TipoReclamo;
      prioridad?: PrioridadReclamo;
      fechaCierre?: Date;
    } = {};

    if (updateReclamoDto.asunto) updateData.asunto = updateReclamoDto.asunto;
    if (updateReclamoDto.descripcion)
      updateData.descripcion = updateReclamoDto.descripcion;
    if (updateReclamoDto.estado) updateData.estado = updateReclamoDto.estado;
    if (updateReclamoDto.tipoReclamo)
      updateData.tipoReclamo = updateReclamoDto.tipoReclamo;
    if (updateReclamoDto.prioridad)
      updateData.prioridad = updateReclamoDto.prioridad;

    // Si se está cerrando el reclamo, establecer fecha de cierre
    if (
      updateReclamoDto.estado === EstadoReclamo.RESUELTO ||
      updateReclamoDto.estado === EstadoReclamo.RECHAZADO
    ) {
      updateData.fechaCierre = new Date();
    }

    return this.prisma.reclamo.update({
      where: { id },
      data: updateData,
      include: {
        usuario: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            email: true,
          },
        },
        pedido: {
          select: {
            id: true,
            numero: true,
          },
        },
      },
    });
  }

  async addComment(
    reclamoId: number,
    usuarioId: number,
    createComentarioDto: CreateComentarioReclamoDto,
    tipoUsuario?: TipoUsuario,
  ) {
    // Verificar que el reclamo existe
    await this.findOne(reclamoId, usuarioId, tipoUsuario);

    // Solo admin puede hacer comentarios internos
    const esInterno =
      tipoUsuario === TipoUsuario.ADMIN ? createComentarioDto.esInterno : false;

    return this.prisma.comentarioReclamo.create({
      data: {
        reclamoId,
        usuarioId,
        comentario: createComentarioDto.comentario,
        esInterno,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            tipoUsuario: true,
          },
        },
      },
    });
  }

  async remove(id: number, usuarioId?: number, tipoUsuario?: TipoUsuario) {
    // Solo admin puede eliminar reclamos
    if (tipoUsuario !== TipoUsuario.ADMIN) {
      throw new ForbiddenException('No tienes permisos para eliminar reclamos');
    }

    await this.findOne(id, usuarioId, tipoUsuario);

    return this.prisma.reclamo.delete({
      where: { id },
    });
  }

  async getStatistics() {
    const stats = await this.prisma.reclamo.groupBy({
      by: ['estado'],
      _count: {
        id: true,
      },
    });

    const totalReclamos = await this.prisma.reclamo.count();

    const reclamosPorTipo = await this.prisma.reclamo.groupBy({
      by: ['tipoReclamo'],
      _count: {
        id: true,
      },
    });

    const reclamosPorPrioridad = await this.prisma.reclamo.groupBy({
      by: ['prioridad'],
      _count: {
        id: true,
      },
    });

    return {
      total: totalReclamos,
      porEstado: stats,
      porTipo: reclamosPorTipo,
      porPrioridad: reclamosPorPrioridad,
    };
  }
}
