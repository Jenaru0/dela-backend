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
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { CategoriaService } from './categoria.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { JwtAutenticacionGuard } from '../autenticacion/guards/jwt-autenticacion.guard';

@Controller('categorias')
export class CategoriaController {
  constructor(private readonly categoriaService: CategoriaService) {}

  @Post()
  @UseGuards(JwtAutenticacionGuard)
  async create(@Body() dto: CreateCategoriaDto, @Request() req) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo administradores pueden crear categorías.'
      );
    }
    return this.categoriaService.create(dto);
  }

  // GET sin guard: público
  @Get()
  findAll(@Query('nombre') nombre?: string) {
    if (nombre) {
      return this.categoriaService.findByNombre(nombre);
    }
    return this.categoriaService.findAll();
  }

  @Get('admin/paginacion')
  @UseGuards(JwtAutenticacionGuard)
  async findAllForAdminWithPagination(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string
  ) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo administradores pueden acceder a esta información.'
      );
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    return this.categoriaService.findAllForAdminWithPagination(
      pageNum,
      limitNum,
      search
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriaService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAutenticacionGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoriaDto,
    @Request() req
  ) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo administradores pueden editar categorías.'
      );
    }
    return this.categoriaService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAutenticacionGuard)
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo administradores pueden eliminar categorías.'
      );
    }
    return this.categoriaService.remove(id);
  }
}
