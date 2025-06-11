import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';

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
