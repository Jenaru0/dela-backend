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
    @Request() req: AuthenticatedRequest,
  ) {
    // Solo el usuario puede crear su propio pedido o un admin
    if (req.user.tipoUsuario !== 'ADMIN' && req.user.id !== dto.usuarioId) {
      throw new ForbiddenException('Solo puedes crear tus propios pedidos');
    }

    return this.pedidosService.create(dto);
  }

  @Get()
  async findAll(
    @Query() filtros: FiltrosPedidosDto,
    @Request() req: AuthenticatedRequest,
  ) {
    // Si no es admin, solo puede ver sus propios pedidos
    if (req.user.tipoUsuario !== 'ADMIN') {
      filtros.usuarioId = req.user.id;
    }

    return this.pedidosService.findAll(filtros);
  }

  @Get('mis-pedidos')
  async misPedidos(@Request() req: AuthenticatedRequest) {
    return this.pedidosService.findByUsuario(req.user.id);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
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
    @Request() req: AuthenticatedRequest,
  ) {
    // Solo admin puede actualizar pedidos
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden actualizar pedidos',
      );
    }

    return this.pedidosService.update(id, dto);
  }

  @Patch(':id/estado')
  async cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body('estado') estado: EstadoPedido,
    @Request() req: AuthenticatedRequest,
  ) {
    // Solo admin puede cambiar estado
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden cambiar el estado',
      );
    }

    return this.pedidosService.cambiarEstado(id, estado);
  }
}
