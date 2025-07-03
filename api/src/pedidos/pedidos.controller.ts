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
import { ProcesarPedidoDto } from './dto/procesar-pedido.dto';
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
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo administradores pueden acceder a esta información.'
      );
    }

    return this.pedidosService.findAllForAdmin();
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

    return this.pedidosService.findAll(filtros);
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

    return {
      mensaje: 'Pedido obtenido exitosamente',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: pedido,
    };
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

  /**
   * NUEVO ENDPOINT: Procesar pedido con pago integrado
   * Este endpoint implementa el flujo correcto:
   * 1. Valida stock y datos
   * 2. Procesa el pago
   * 3. Solo si el pago es exitoso, crea el pedido y descuenta stock
   */
  @Post('procesar-con-pago')
  async procesarPedidoConPago(
    @Body() dto: ProcesarPedidoDto,
    @Request() req: AuthenticatedRequest
  ) {
    // Solo el usuario puede crear su propio pedido o un admin
    if (req.user.tipoUsuario !== 'ADMIN' && req.user.id !== dto.usuarioId) {
      throw new ForbiddenException('Solo puedes crear tus propios pedidos');
    }

    const resultado = await this.pedidosService.procesarPedidoConPago(dto);
    return {
      mensaje: resultado.mensaje,
      data: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        pedido: resultado.pedido,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        pago: resultado.pago,
      },
    };
  }
}
