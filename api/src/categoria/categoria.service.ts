import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CategoriaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCategoriaDto) {
    return this.prisma.categoriaProducto.create({ data });
  }

  async findAll() {
    return this.prisma.categoriaProducto.findMany({
      include: {
        _count: {
          select: {
            productos: true,
          },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findAllForAdminWithPagination(
    page: number = 1,
    limit: number = 10,
    search?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.CategoriaProductoWhereInput = {};

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [categorias, total] = await Promise.all([
      this.prisma.categoriaProducto.findMany({
        where,
        include: {
          _count: {
            select: {
              productos: true,
            },
          },
        },
        orderBy: { id: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.categoriaProducto.count({ where }),
    ]);

    return {
      data: categorias,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number) {
    const categoria = await this.prisma.categoriaProducto.findUnique({
      where: { id },
    });
    if (!categoria) throw new NotFoundException('Categoría no encontrada');
    return categoria;
  }

  async update(id: number, data: UpdateCategoriaDto) {
    return this.prisma.categoriaProducto.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    return this.prisma.categoriaProducto.delete({ where: { id } });
  }

  async findByNombre(nombre: string) {
    return this.prisma.categoriaProducto.findMany({
      where: { nombre: { contains: nombre, mode: 'insensitive' } },
    });
  }
}
