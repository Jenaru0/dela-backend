// src/catalogo/catalogo.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FiltrosCatalogoDto } from './dto/FiltrosCatalogoDto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CatalogoService {
  constructor(private readonly prisma: PrismaService) {}

  async obtenerProductos(filtros: FiltrosCatalogoDto) {
    const { busqueda, categoriaId } = filtros;
    const where: Prisma.ProductoWhereInput = {
      estado: 'ACTIVO',
      stock: { gt: 10 }, // Solo productos con stock mayor a 10
    };
    if (busqueda) {
      where.OR = [
        {
          nombre: {
            contains: busqueda,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          descripcion: {
            contains: busqueda,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      ];
    }
    if (categoriaId) {
      where.categoriaId = categoriaId;
    }

    return this.prisma.producto.findMany({
      where,
      include: { imagenes: true, categoria: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async obtenerProductoPorId(id: number) {
    // Busca el producto por ID, incluye imágenes y categoría
    return this.prisma.producto.findUnique({
      where: { id },
      include: { imagenes: true, categoria: true },
    });
  }

  async obtenerEstadisticas() {
    const [totalProductos, totalCategorias] = await Promise.all([
      this.prisma.producto.count({
        where: {
          estado: 'ACTIVO',
          stock: { gt: 10 }, // Solo productos con stock mayor a 10
        },
      }),
      this.prisma.categoriaProducto.count({
        where: {
          activo: true,
        },
      }),
    ]);

    return {
      totalProductos,
      totalCategorias,
    };
  }
}
