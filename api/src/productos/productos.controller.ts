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
        'Solo los administradores pueden crear productos',
      );
    }

    return this.productosService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductoDto,
    @Request() req,
  ) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden editar productos',
      );
    }
    return this.productosService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden eliminar productos',
      );
    }
    return this.productosService.remove(id);
  }

  // Rutas de imágenes protegidas igual
  @Post(':id/imagenes')
  async addImagen(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateImagenProductoDto,
    @Request() req,
  ) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden añadir imágenes',
      );
    }
    return this.productosService.addImagen({ ...dto, productoId: id });
  }

  @Patch('imagenes/:imagenId')
  async updateImagen(
    @Param('imagenId', ParseIntPipe) imagenId: number,
    @Body() dto: UpdateImagenProductoDto,
    @Request() req,
  ) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden actualizar imágenes',
      );
    }
    return this.productosService.updateImagen(imagenId, dto);
  }

  @Delete('imagenes/:imagenId')
  async removeImagen(
    @Param('imagenId', ParseIntPipe) imagenId: number,
    @Request() req,
  ) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden eliminar imágenes',
      );
    }
    return this.productosService.removeImagen(imagenId);
  }

  @Get()
  async findAll(@Query() filtros: FiltrosProductosDto, @Request() req) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden listar productos',
      );
    }
    return this.productosService.findAllWithFilters(filtros);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden ver productos',
      );
    }
    return this.productosService.findOne(id);
  }
}
