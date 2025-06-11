import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductoDto } from './dto/crear-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { FiltrosProductosDto } from './dto/filtros-producto.dto';
import { CreateImagenProductoDto } from './dto/crear-imagen-producto.dto';
import { UpdateImagenProductoDto } from './dto/update-imagen-producto.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductoDto) {
    return this.prisma.producto.create({ data: dto });
  }

  async findAllWithFilters(filtros: FiltrosProductosDto) {
    const {
      busqueda,
      categoriaId,
      precioMin,
      precioMax,
      destacado,
      disponible,
      orderBy = 'nombre',
      sortOrder = 'asc',
      page = 1,
      limit = 12,
    } = filtros;

    const where: Prisma.ProductoWhereInput = {
      estado: 'ACTIVO',
      ...(categoriaId && { categoriaId }),
      ...(destacado !== undefined && { destacado }),
    };

    if (busqueda) {
      where.OR = [
        { nombre: { contains: busqueda, mode: 'insensitive' } },
        { descripcion: { contains: busqueda, mode: 'insensitive' } },
        { sku: { contains: busqueda, mode: 'insensitive' } },
      ];
    }
    if (precioMin !== undefined || precioMax !== undefined) {
      where.precioUnitario = {};
      if (precioMin !== undefined) where.precioUnitario.gte = precioMin;
      if (precioMax !== undefined) where.precioUnitario.lte = precioMax;
    }
    if (disponible !== undefined && disponible) {
      where.stock = { gt: 0 };
    }

    const orderByClause: Prisma.ProductoOrderByWithRelationInput = {};
    orderByClause[orderBy] = sortOrder;

    const skip = (page - 1) * limit;

    const [productos, total] = await Promise.all([
      this.prisma.producto.findMany({
        where,
        include: { categoria: true, imagenes: true },
        orderBy: orderByClause,
        skip,
        take: limit,
      }),
      this.prisma.producto.count({ where }),
    ]);

    return {
      data: productos,
      page,
      limit,
      total,
    };
  }

  async findOne(id: number) {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: { imagenes: true, categoria: true },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado');
    return producto;
  }

  async update(id: number, dto: UpdateProductoDto) {
    return this.prisma.producto.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    return this.prisma.producto.update({
      where: { id },
      data: { estado: 'INACTIVO' },
    });
  }

  // IMAGENES (CRUD desde el mismo service)

  async addImagen(dto: CreateImagenProductoDto) {
    // Si principal: true, poner las demás en principal: false
    if (dto.principal) {
      await this.prisma.imagenProducto.updateMany({
        where: { productoId: dto.productoId },
        data: { principal: false },
      });
    }
    return this.prisma.imagenProducto.create({ data: dto });
  }

  async updateImagen(id: number, dto: UpdateImagenProductoDto) {
    // Si quiere poner esta imagen como principal, poner las demás en principal: false
    if (dto.principal) {
      const imagen = await this.prisma.imagenProducto.findFirst({
        where: { id },
      });
      if (!imagen) {
        throw new NotFoundException('Imagen no encontrada');
      }
      await this.prisma.imagenProducto.updateMany({
        where: { productoId: imagen.productoId },
        data: { principal: false },
      });
    }

    return this.prisma.imagenProducto.update({
      where: { id },
      data: dto,
    });
  }

  async removeImagen(id: number) {
    return this.prisma.imagenProducto.delete({ where: { id } });
  }
}
