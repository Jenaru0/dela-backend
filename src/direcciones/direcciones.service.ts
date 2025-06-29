import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDireccionDto } from './dto/create-direccion.dto';
import { UpdateDireccionDto } from './dto/update-direccion.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class DireccionesService {
  constructor(private prisma: PrismaService) {}

  async findAllByUser(usuarioId: number) {
    return await this.prisma.direccionCliente.findMany({
      where: {
        usuarioId,
        activa: true,
      },
      orderBy: [{ predeterminada: 'desc' }, { creadoEn: 'desc' }],
    });
  }

  async create(usuarioId: number, createDireccionDto: CreateDireccionDto) {
    const { predeterminada = false, ...direccionData } = createDireccionDto;

    if (predeterminada) {
      await this.prisma.direccionCliente.updateMany({
        where: {
          usuarioId,
          predeterminada: true,
        },
        data: {
          predeterminada: false,
        },
      });
    }

    return await this.prisma.direccionCliente.create({
      data: {
        ...direccionData,
        usuarioId,
        predeterminada,
      },
    });
  }

  async findOne(id: number, usuarioId: number) {
    const direccion = await this.prisma.direccionCliente.findFirst({
      where: {
        id,
        usuarioId,
        activa: true,
      },
    });

    if (!direccion) {
      throw new NotFoundException('Dirección no encontrada');
    }

    return direccion;
  }

  async update(
    id: number,
    usuarioId: number,
    updateDireccionDto: UpdateDireccionDto
  ) {
    await this.findOne(id, usuarioId);

    const { predeterminada, ...direccionData } = updateDireccionDto;

    if (predeterminada) {
      await this.prisma.direccionCliente.updateMany({
        where: {
          usuarioId,
          predeterminada: true,
          id: {
            not: id,
          },
        },
        data: {
          predeterminada: false,
        },
      });
    }

    return await this.prisma.direccionCliente.update({
      where: { id },
      data: {
        ...direccionData,
        ...(predeterminada !== undefined && { predeterminada }),
      },
    });
  }

  async remove(id: number, usuarioId: number) {
    const direccion = await this.findOne(id, usuarioId);

    if (direccion.predeterminada) {
      const otrasActivas = await this.prisma.direccionCliente.count({
        where: {
          usuarioId,
          activa: true,
          id: {
            not: id,
          },
        },
      });

      if (otrasActivas === 0) {
        throw new ForbiddenException(
          'No puedes eliminar tu única dirección activa'
        );
      }
    }

    return await this.prisma.direccionCliente.update({
      where: { id },
      data: {
        activa: false,
      },
    });
  }

  async setDefault(id: number, usuarioId: number) {
    await this.findOne(id, usuarioId);

    await this.prisma.direccionCliente.updateMany({
      where: {
        usuarioId,
        predeterminada: true,
      },
      data: {
        predeterminada: false,
      },
    });

    return await this.prisma.direccionCliente.update({
      where: { id },
      data: {
        predeterminada: true,
      },
    });
  }

  // Método para admin: obtener todas las direcciones de todos los usuarios
  async findAllForAdmin() {
    return await this.prisma.direccionCliente.findMany({
      include: {
        usuario: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            email: true,
          },
        },
      },
      orderBy: [{ id: 'asc' }], // Ordenamiento ascendente por ID
    });
  }

  // Método para admin: obtener direcciones con paginación
  async findAllForAdminWithPagination(
    page: number,
    limit: number,
    filters: { search?: string } = {}
  ) {
    const skip = (page - 1) * limit;
    const { search } = filters;

    // Construir condiciones de búsqueda
    const whereConditions: Prisma.DireccionClienteWhereInput = {};

    if (search) {
      whereConditions.OR = [
        {
          direccion: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          distrito: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          provincia: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          alias: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          usuario: {
            OR: [
              {
                nombres: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                apellidos: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          },
        },
      ];
    }

    // Obtener direcciones paginadas
    const direcciones = await this.prisma.direccionCliente.findMany({
      where: whereConditions,
      include: {
        usuario: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            email: true,
          },
        },
      },
      orderBy: [{ id: 'asc' }], // Ordenamiento ascendente por ID
      skip,
      take: limit,
    });

    // Contar total de direcciones
    const total = await this.prisma.direccionCliente.count({
      where: whereConditions,
    });

    return {
      data: direcciones,
      total,
    };
  }

  // Método para admin: obtener estadísticas de direcciones
  async getStatisticsForAdmin() {
    const total = await this.prisma.direccionCliente.count();
    const activas = await this.prisma.direccionCliente.count({
      where: { activa: true },
    });
    const inactivas = await this.prisma.direccionCliente.count({
      where: { activa: false },
    });
    const predeterminadas = await this.prisma.direccionCliente.count({
      where: { predeterminada: true },
    });

    // Obtener distribución por provincia
    const direccionesPorProvincia = await this.prisma.direccionCliente.groupBy({
      by: ['provincia'],
      _count: {
        id: true,
      },
      where: {
        activa: true,
        provincia: {
          not: null,
        },
      },
    });

    const porDepartamento: { [key: string]: number } = {};
    direccionesPorProvincia.forEach((item) => {
      if (item.provincia) {
        porDepartamento[item.provincia] = item._count.id;
      }
    });

    return {
      total,
      activas,
      inactivas,
      predeterminadas,
      porDepartamento,
    };
  }
}
