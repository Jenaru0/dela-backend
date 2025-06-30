import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { CreatePedidoDto } from './dto/crear-pedido.dto';
import { UpdatePedidoDto } from './dto/update-pedido.dto';
import { FiltrosPedidosDto } from './dto/filtros-pedidos.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { JwtAutenticacionGuard } from '../autenticacion/guards/jwt-autenticacion.guard';
import { EstadoPedido } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    tipoUsuario: string;
  };
}

@Controller('pedidos')
@UseGuards(JwtAutenticacionGuard)
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Post()
  async create(
    @Body() dto: CreatePedidoDto,
    @Request() req: AuthenticatedRequest
  ) {
    // Solo el usuario puede crear su propio pedido o un admin
    if (req.user.tipoUsuario !== 'ADMIN' && req.user.id !== dto.usuarioId) {
      throw new ForbiddenException('Solo puedes crear tus propios pedidos');
    }

    const pedido = await this.pedidosService.create(dto);
    return {
      mensaje: 'Pedido creado exitosamente',
      data: pedido,
    };
  }

  @Get('mis-pedidos')
  async findMyOrders(@Request() req: AuthenticatedRequest) {
    const pedidos: any[] = await this.pedidosService.findByUser(req.user.id);
    return {
      mensaje: 'Pedidos obtenidos correctamente',
      data: pedidos,
    };
  }

  // Endpoints específicos deben ir ANTES que los endpoints con parámetros dinámicos
  @Get('admin/paginacion')
  async findAllForAdminWithPagination(
    @Request() req: AuthenticatedRequest,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
    @Query('estado') estado?: EstadoPedido,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string
  ) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo administradores pueden acceder a esta información.'
      );
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    return this.pedidosService.findAllForAdminWithPagination(
      pageNum,
      limitNum,
      search,
      estado,
      fechaInicio,
      fechaFin
    );
  }

  @Get('admin/todos')
  async findAllForAdmin(@Request() req: AuthenticatedRequest) {
    console.log('🔍 Backend Controller: Iniciando findAllForAdmin');
    console.log('🔍 Backend Controller: Usuario:', req.user);

    if (req.user.tipoUsuario !== 'ADMIN') {
      console.error(
        '❌ Backend Controller: Usuario no es ADMIN:',
        req.user.tipoUsuario
      );
      throw new ForbiddenException(
        'Solo administradores pueden acceder a esta información.'
      );
    }

    try {
      console.log('🔍 Backend Controller: Llamando al servicio...');
      const result = await this.pedidosService.findAllForAdmin();
      console.log('✅ Backend Controller: Resultado del servicio:', result);

      const response = {
        mensaje: 'Pedidos obtenidos correctamente',
        data: result.data,
      };
      console.log('✅ Backend Controller: Respuesta final:', response);

      return response;
    } catch (error) {
      console.error('❌ Backend Controller: Error:', error);
      throw error;
    }
  }

  @Get()
  async findAll(
    @Query() filtros: FiltrosPedidosDto,
    @Request() req: AuthenticatedRequest
  ) {
    // Si no es admin, solo puede ver sus propios pedidos
    if (req.user.tipoUsuario !== 'ADMIN') {
      filtros.usuarioId = req.user.id;
    }

    // Para el dashboard que no necesita paginación, simplificar
    if (!filtros.page && !filtros.limit) {
      // Sin paginación - devolver todos los pedidos
      const result = await this.pedidosService.findAllSimple(filtros);
      return {
        mensaje: 'Pedidos obtenidos correctamente',
        data: result,
      };
    }

    // Con paginación - devolver formato completo
    const result = await this.pedidosService.findAll(filtros);
    return {
      mensaje: 'Pedidos obtenidos correctamente',
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const pedido = await this.pedidosService.findOne(id);

    // Solo el dueño del pedido o un admin pueden verlo
    if (req.user.tipoUsuario !== 'ADMIN' && pedido.usuarioId !== req.user.id) {
      throw new ForbiddenException('No tienes acceso a este pedido');
    }

    return pedido;
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePedidoDto,
    @Request() req: AuthenticatedRequest
  ) {
    // Solo admin puede actualizar pedidos
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden actualizar pedidos'
      );
    }

    return this.pedidosService.update(id, dto);
  }

  @Patch(':id/estado')
  async cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoDto,
    @Request() req: AuthenticatedRequest
  ) {
    // Solo admin puede cambiar estado
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden cambiar el estado'
      );
    }

    return this.pedidosService.cambiarEstado(id, dto.estado, dto.notasInternas);
  }
}
