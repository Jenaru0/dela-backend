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
import { PagosService } from './pagos.service';
import { CreatePagoDto } from './dto/crear-pago.dto';
import { UpdatePagoDto } from './dto/update-pago.dto';
import { FiltrosPagosDto } from './dto/filtros-pagos.dto';
import { JwtAutenticacionGuard } from '../autenticacion/guards/jwt-autenticacion.guard';

@Controller('pagos')
@UseGuards(JwtAutenticacionGuard)
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Post()
  async create(@Body() dto: CreatePagoDto, @Request() req) {
    // Solo admin puede registrar pagos directamente
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden registrar pagos',
      );
    }

    return this.pagosService.create(dto);
  }

  @Get()
  async findAll(@Query() filtros: FiltrosPagosDto, @Request() req) {
    // Solo admin puede ver todos los pagos
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden ver todos los pagos',
      );
    }

    return this.pagosService.findAll(filtros);
  }

  @Get('estadisticas')
  async obtenerEstadisticas(@Request() req) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden ver estadísticas',
      );
    }

    return this.pagosService.obtenerEstadisticasPagos();
  }

  @Get('pedido/:pedidoId')
  async findByPedido(
    @Param('pedidoId', ParseIntPipe) pedidoId: number,
    @Request() req,
  ) {
    // Verificar que el usuario puede acceder a este pedido
    if (req.user.tipoUsuario !== 'ADMIN') {
      // Aquí deberíamos verificar que el pedido pertenece al usuario
      // Por simplicidad, asumimos que solo admin puede ver pagos por ahora
      throw new ForbiddenException(
        'Solo los administradores pueden ver pagos de pedidos',
      );
    }

    return this.pagosService.findByPedido(pedidoId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const pago = await this.pagosService.findOne(id);

    // Solo admin o el dueño del pedido pueden ver el pago
    if (
      req.user.tipoUsuario !== 'ADMIN' &&
      pago.pedido.usuario.id !== req.user.id
    ) {
      throw new ForbiddenException('No tienes acceso a este pago');
    }

    return pago;
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePagoDto,
    @Request() req,
  ) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden actualizar pagos',
      );
    }

    return this.pagosService.update(id, dto);
  }
  @Post(':id/confirmar')
  async confirmarPago(
    @Param('id', ParseIntPipe) id: number,
    @Body('referencia') referencia?: string,
    @Request() req?,
  ) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden confirmar pagos',
      );
    }

    return this.pagosService.confirmarPago(id, referencia);
  }

  @Post(':id/rechazar')
  async rechazarPago(
    @Param('id', ParseIntPipe) id: number,
    @Body('motivo') motivo?: string,
    @Request() req?,
  ) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden rechazar pagos',
      );
    }

    return this.pagosService.rechazarPago(id, motivo);
  }

  @Post(':id/reembolsar')
  async procesarReembolso(
    @Param('id', ParseIntPipe) id: number,
    @Body('motivo') motivo?: string,
    @Request() req?,
  ) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden procesar reembolsos',
      );
    }

    return this.pagosService.procesarReembolso(id, motivo);
  }
}
