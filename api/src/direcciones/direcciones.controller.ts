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
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { DireccionesService } from './direcciones.service';
import { CreateDireccionDto } from './dto/create-direccion.dto';
import { UpdateDireccionDto } from './dto/update-direccion.dto';
import { JwtAutenticacionGuard } from '../autenticacion/guards/jwt-autenticacion.guard';
import { CreateDireccionSimpleDto } from './dto/create-direccion-simple.dto';

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
  private readonly logger = new Logger(DireccionesController.name);

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
    try {
      this.logger.log(`Usuario ${req.user.id} creando dirección`);
      this.logger.debug(
        'Datos recibidos:',
        JSON.stringify(createDireccionDto, null, 2)
      );

      const direccion = await this.direccionesService.create(
        req.user.id,
        createDireccionDto
      );

      this.logger.log(`Dirección creada exitosamente con ID: ${direccion.id}`);

      return {
        mensaje: 'Dirección creada correctamente.',
        data: direccion,
      };
    } catch (error) {
      this.logger.error('Error al crear dirección:', error.message);
      this.logger.error('Stack trace:', error.stack);
      this.logger.error(
        'Datos que causaron el error:',
        JSON.stringify(createDireccionDto, null, 2)
      );

      if (error.code === 'P2002') {
        throw new HttpException(
          'Ya existe una dirección con estos datos.',
          HttpStatus.CONFLICT
        );
      }

      if (error.code && error.code.startsWith('P')) {
        throw new HttpException(
          'Error de base de datos: ' + error.message,
          HttpStatus.BAD_REQUEST
        );
      }

      throw new HttpException(
        'Error interno del servidor al crear la dirección.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
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

  @Post('simple')
  async createSimple(
    @Body() createDireccionDto: CreateDireccionSimpleDto,
    @Request() req: PeticionAutenticada
  ) {
    try {
      this.logger.log(`Usuario ${req.user.id} creando dirección SIMPLE`);
      this.logger.debug(
        'Datos recibidos SIMPLE:',
        JSON.stringify(createDireccionDto, null, 2)
      );

      // Convertir datos de forma segura
      const datosLimpios = {
        alias: createDireccionDto.alias || null,
        direccion: createDireccionDto.direccion,
        departamento: createDireccionDto.departamento || 'Lima',
        provincia: createDireccionDto.provincia || 'Lima',
        distrito: createDireccionDto.distrito || 'Lima',
        referencia: createDireccionDto.referencia || null,
        predeterminada: createDireccionDto.predeterminada || false,
        codigoPostal: createDireccionDto.codigoPostal || null,
        latitud: this.convertToDecimal(createDireccionDto.latitud),
        longitud: this.convertToDecimal(createDireccionDto.longitud),
        validadaGps: createDireccionDto.validadaGps || false,
        mapTilerPlaceId: createDireccionDto.mapTilerPlaceId || null,
      };

      this.logger.debug('Datos convertidos:', JSON.stringify(datosLimpios, null, 2));

      const direccion = await this.direccionesService.createSimple(
        req.user.id,
        datosLimpios
      );

      this.logger.log(`Dirección SIMPLE creada exitosamente con ID: ${direccion.id}`);

      return {
        mensaje: 'Dirección creada correctamente (modo simple).',
        data: direccion,
      };
    } catch (error) {
      this.logger.error('Error al crear dirección SIMPLE:', error.message);
      this.logger.error('Stack trace:', error.stack);
      this.logger.error('Error completo:', JSON.stringify(error, null, 2));

      throw new HttpException(
        `Error específico: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private convertToDecimal(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    return isNaN(num) || !isFinite(num) ? null : num;
  }
}
