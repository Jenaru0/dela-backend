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
    try {
      const producto = await this.prisma.producto.create({
        data: dto,
        include: {
          categoria: true,
          imagenes: {
            orderBy: [
              { principal: 'desc' },
              { orden: 'asc' },
              { creadoEn: 'asc' },
            ],
          },
          _count: {
            select: {
              favoritos: true,
              reviews: true,
            },
          },
        },
      });

      console.log('✅ Producto creado en DB:', {
        id: producto.id,
        nombre: producto.nombre,
      });
      return producto;
    } catch (error) {
      console.error('Error al crear producto:', error);
      throw error;
    }
  }
  async findAllWithFilters(
    filtros: FiltrosProductosDto,
    includeInactive = false
  ) {
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
      // Solo filtrar por estado ACTIVO si no se incluyen inactivos
      ...(includeInactive ? {} : { estado: 'ACTIVO' }),
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
        include: {
          categoria: true,
          imagenes: {
            orderBy: [
              { principal: 'desc' },
              { orden: 'asc' },
              { creadoEn: 'asc' },
            ],
          },
          // Agregar conteos para el admin
          _count: {
            select: {
              favoritos: true,
              reviews: true,
            },
          },
        },
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
      include: {
        categoria: true,
        imagenes: {
          orderBy: [
            { principal: 'desc' }, // Principal primero
            { orden: 'asc' }, // Luego por orden
            { creadoEn: 'asc' }, // Finalmente por fecha de creación
          ],
        },
        // Agregar conteos
        _count: {
          select: {
            favoritos: true,
            reviews: true,
          },
        },
        // También incluir los datos completos para más info
        favoritos: {
          select: {
            usuarioId: true,
          },
        },
        reviews: {
          select: {
            id: true,
            calificacion: true,
            comentario: true,
            usuario: {
              select: {
                nombres: true,
                apellidos: true,
              },
            },
          },
          orderBy: {
            creadoEn: 'desc',
          },
          take: 5, // Solo las 5 más recientes
        },
      },
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
    try {
      console.log('📸 [Service] Agregando imagen:', dto);

      // Si principal: true, poner las demás en principal: false
      if (dto.principal) {
        await this.prisma.imagenProducto.updateMany({
          where: { productoId: dto.productoId },
          data: { principal: false },
        });
      }

      // Siempre calcular un orden seguro (no confiar en el frontend)
      const maxOrden = await this.prisma.imagenProducto.aggregate({
        where: { productoId: dto.productoId },
        _max: { orden: true },
      });
      const nuevoOrden = (maxOrden._max.orden || 0) + 1;

      // Crear DTO final con orden calculado de manera segura
      const dtoFinal = {
        ...dto,
        orden: nuevoOrden, // Siempre usar el orden calculado
      };

      console.log('📋 [Service] Datos finales para crear imagen:', dtoFinal);

      const imagen = await this.prisma.imagenProducto.create({
        data: dtoFinal,
      });

      console.log('✅ [Service] Imagen creada exitosamente:', imagen);

      return {
        mensaje: 'Imagen agregada exitosamente',
        data: imagen,
      };
    } catch (error) {
      console.error('❌ [Service] Error al agregar imagen:', error);
      // Si es un error de unique constraint, proporcionar un mensaje más claro
      if (error.code === 'P2002') {
        throw new Error(
          'Ya existe una imagen con este orden para este producto'
        );
      }
      throw error;
    }
  }
  async updateImagen(id: number, dto: UpdateImagenProductoDto) {
    try {
      console.log('🔄 [Service] Actualizando imagen:', { id, dto });

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

      const imagenActualizada = await this.prisma.imagenProducto.update({
        where: { id },
        data: dto,
      });

      console.log(
        '✅ [Service] Imagen actualizada exitosamente:',
        imagenActualizada
      );

      return {
        mensaje: 'Imagen actualizada exitosamente',
        data: imagenActualizada,
      };
    } catch (error) {
      console.error('❌ [Service] Error al actualizar imagen:', error);
      throw error;
    }
  }
  async removeImagen(id: number) {
    try {
      console.log('🗑️ [Service] Eliminando imagen con ID:', id);

      // Verificar si la imagen existe
      const imagen = await this.prisma.imagenProducto.findUnique({
        where: { id },
      });

      if (!imagen) {
        console.error('❌ [Service] Imagen no encontrada:', id);
        throw new NotFoundException(`Imagen con ID ${id} no encontrada`);
      }

      console.log('✅ [Service] Imagen encontrada:', {
        id: imagen.id,
        productoId: imagen.productoId,
      });

      // Eliminar la imagen
      const result = await this.prisma.imagenProducto.delete({ where: { id } });
      console.log('✅ [Service] Imagen eliminada exitosamente:', id);

      return result;
    } catch (error) {
      console.error('❌ [Service] Error al eliminar imagen:', {
        imagenId: id,
        error: error.message,
      });
      throw error;
    }
  }
}
