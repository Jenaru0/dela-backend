import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/crear-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { FiltrosProductosDto } from './dto/filtros-producto.dto';
import { CreateImagenProductoDto } from './dto/crear-imagen-producto.dto';
import { UpdateImagenProductoDto } from './dto/update-imagen-producto.dto';
import { UseGuards, ForbiddenException, Request } from '@nestjs/common';
import { JwtAutenticacionGuard } from '../autenticacion/guards/jwt-autenticacion.guard';

@Controller('productos')
@UseGuards(JwtAutenticacionGuard)
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}
  @Post()
  async create(@Body() dto: CreateProductoDto, @Request() req) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden crear productos'
      );
    }

    try {
      const producto = await this.productosService.create(dto);
      return {
        mensaje: 'Producto creado exitosamente',
        data: producto,
      };
    } catch (error) {
      console.error('Error al crear producto:', error);
      throw error;
    }
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductoDto,
    @Request() req
  ) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden editar productos'
      );
    }
    return this.productosService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden eliminar productos'
      );
    }
    return this.productosService.remove(id);
  }
  // Rutas de imágenes protegidas igual
  @Post(':id/imagenes')
  async addImagen(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateImagenProductoDto,
    @Request() req
  ) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden añadir imágenes'
      );
    }

    try {
      const imagen = await this.productosService.addImagen({
        ...dto,
        productoId: id,
      });
      return {
        mensaje: 'Imagen agregada exitosamente',
        data: imagen,
      };
    } catch (error) {
      console.error('Error al agregar imagen:', error);
      throw error;
    }
  }
  @Patch('imagenes/:imagenId')
  async updateImagen(
    @Param('imagenId', ParseIntPipe) imagenId: number,
    @Body() dto: UpdateImagenProductoDto,
    @Request() req
  ) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden actualizar imágenes'
      );
    }

    try {
      const imagen = await this.productosService.updateImagen(imagenId, dto);
      return {
        mensaje: 'Imagen actualizada exitosamente',
        data: imagen,
      };
    } catch (error) {
      console.error('Error al actualizar imagen:', error);
      throw error;
    }
  }
  @Delete('imagenes/:imagenId')
  async removeImagen(
    @Param('imagenId', ParseIntPipe) imagenId: number,
    @Request() req
  ) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden eliminar imágenes'
      );
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const userId: string | number =
        req.user && typeof req.user === 'object' && 'id' in req.user
          ? req.user.id
          : 'unknown';
      console.log('🗑️ [Controller] Eliminando imagen:', {
        imagenId,
        userId: String(userId),
      });

      await this.productosService.removeImagen(imagenId);
      console.log('✅ [Controller] Imagen eliminada exitosamente:', imagenId);

      return {
        mensaje: 'Imagen eliminada exitosamente',
        data: null,
      };
    } catch (error) {
      console.error('❌ [Controller] Error al eliminar imagen:', {
        imagenId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  @Get()
  async findAll(@Query() filtros: FiltrosProductosDto, @Request() req) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden listar productos'
      );
    }
    // Para admin: incluir productos inactivos
    return this.productosService.findAllWithFilters(filtros, true);
  }
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden ver productos'
      );
    }

    try {
      const producto = await this.productosService.findOne(id);
      return {
        mensaje: 'Producto obtenido exitosamente',
        data: producto,
      };
    } catch (error) {
      console.error('Error al obtener producto:', error);
      throw error;
    }
  }
}
