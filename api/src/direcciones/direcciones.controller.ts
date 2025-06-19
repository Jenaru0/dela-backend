import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseIntPipe,
  ForbiddenException,
  Query,
} from '@nestjs/common';
import { DireccionesService } from './direcciones.service';
import { CreateDireccionDto } from './dto/create-direccion.dto';
import { UpdateDireccionDto } from './dto/update-direccion.dto';
import { JwtAutenticacionGuard } from '../autenticacion/guards/jwt-autenticacion.guard';

interface PeticionAutenticada extends Request {
  user: {
    id: number;
    sub: number;
    email: string;
    tipoUsuario: string;
  };
}

@Controller('direcciones')
@UseGuards(JwtAutenticacionGuard)
export class DireccionesController {
  constructor(private readonly direccionesService: DireccionesService) {}

  @Get()
  async findAll(@Request() req: PeticionAutenticada) {
    const direcciones = await this.direccionesService.findAllByUser(
      req.user.id
    );
    return {
      mensaje: 'Direcciones obtenidas correctamente.',
      data: direcciones,
    };
  }

  @Post()
  async create(
    @Body() createDireccionDto: CreateDireccionDto,
    @Request() req: PeticionAutenticada
  ) {
    const direccion = await this.direccionesService.create(
      req.user.id,
      createDireccionDto
    );
    return {
      mensaje: 'Dirección creada correctamente.',
      data: direccion,
    };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: PeticionAutenticada
  ) {
    const direccion = await this.direccionesService.findOne(id, req.user.id);
    return {
      mensaje: 'Dirección obtenida correctamente.',
      data: direccion,
    };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDireccionDto: UpdateDireccionDto,
    @Request() req: PeticionAutenticada
  ) {
    const direccion = await this.direccionesService.update(
      id,
      req.user.id,
      updateDireccionDto
    );
    return {
      mensaje: 'Dirección actualizada correctamente.',
      data: direccion,
    };
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: PeticionAutenticada
  ) {
    await this.direccionesService.remove(id, req.user.id);
    return {
      mensaje: 'Dirección eliminada correctamente.',
    };
  }

  @Patch(':id/predeterminada')
  async setDefault(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: PeticionAutenticada
  ) {
    const direccion = await this.direccionesService.setDefault(id, req.user.id);
    return {
      mensaje: 'Dirección predeterminada establecida correctamente.',
      data: direccion,
    };
  }

  @Get('admin/todas')
  async findAllForAdmin(@Request() req: PeticionAutenticada) {
    // Solo admin puede acceder
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo administradores pueden acceder a todas las direcciones.'
      );
    }

    const direcciones = await this.direccionesService.findAllForAdmin();
    return {
      mensaje: 'Direcciones obtenidas correctamente.',
      data: direcciones,
    };
  }

  @Get('admin/paginacion')
  async findAllForAdminWithPagination(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Request() req?: PeticionAutenticada
  ) {
    // Solo admin puede acceder
    if (req?.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo administradores pueden acceder a todas las direcciones.'
      );
    }

    const pageNumber = parseInt(page || '1', 10) || 1;
    const limitNumber = parseInt(limit || '10', 10) || 10;

    const result = await this.direccionesService.findAllForAdminWithPagination(
      pageNumber,
      limitNumber,
      { search }
    );

    return {
      mensaje: 'Direcciones obtenidas correctamente.',
      data: result.data,
      total: result.total,
      page: pageNumber,
      totalPages: Math.ceil(result.total / limitNumber),
    };
  }

  @Get('admin/estadisticas')
  async getStatisticsForAdmin(@Request() req: PeticionAutenticada) {
    // Solo admin puede acceder
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo administradores pueden acceder a las estadísticas.'
      );
    }

    const estadisticas = await this.direccionesService.getStatisticsForAdmin();
    return {
      mensaje: 'Estadísticas obtenidas correctamente.',
      data: estadisticas,
    };
  }
}
