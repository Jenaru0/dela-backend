import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
  ForbiddenException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PagosService } from './pagos.service';
import { PagoConRedireccionDto } from './dto/pago-con-redireccion.dto';
import { PagoConTarjetaDto } from './dto/pago-con-tarjeta.dto';
import { WebhookMercadoPagoDto } from './dto/webhook-mercadopago.dto';
import { FiltrosPagosDto } from './dto/filtros-pagos.dto';
import { JwtAutenticacionGuard } from '../autenticacion/guards/jwt-autenticacion.guard';

@Controller('pagos')
export class PagosController {
  private readonly logger = new Logger(PagosController.name);

  constructor(private readonly pagosService: PagosService) {}

  /**
   * Crear un pago con redirección a MercadoPago
   */
  @Post('con-redireccion')
  @UseGuards(JwtAutenticacionGuard)
  async crearPagoConRedireccion(@Body() dto: PagoConRedireccionDto) {
    // Verificar que el usuario puede crear pagos para este pedido
    // Por ahora permitimos que cualquier usuario autenticado pueda crear pagos
    // En producción, deberías verificar que el pedido pertenece al usuario

    this.logger.log(`Creando pago con redirección para pedido ${dto.pedidoId}`);

    return this.pagosService.crearPagoMercadoPago(dto);
  }

  /**
   * Webhook de MercadoPago para notificaciones de pago
   * Este endpoint NO requiere autenticación ya que es llamado por MercadoPago
   */
  @Post('webhook')
  async webhookMercadoPago(@Body() webhookData: WebhookMercadoPagoDto) {
    this.logger.log(`Webhook MercadoPago recibido: ${webhookData.type}`);

    return this.pagosService.procesarWebhook(webhookData);
  }

  /**
   * Obtener todos los pagos (solo admin)
   */
  @Get()
  @UseGuards(JwtAutenticacionGuard)
  async findAll(@Query() filtros: FiltrosPagosDto, @Request() req) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden ver todos los pagos'
      );
    }

    return this.pagosService.findAll(filtros);
  }

  /**
   * Obtener estadísticas de pagos (solo admin)
   */
  @Get('estadisticas')
  @UseGuards(JwtAutenticacionGuard)
  async obtenerEstadisticas(@Request() req) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden ver estadísticas'
      );
    }

    return this.pagosService.obtenerEstadisticasPagos();
  }

  /**
   * Obtener métodos de pago disponibles
   */
  @Get('metodos-pago')
  @UseGuards(JwtAutenticacionGuard)
  obtenerMetodosPago() {
    return this.pagosService.obtenerMetodosPagoDisponibles();
  }

  /**
   * Obtener estado de pago desde MercadoPago
   */
  @Get(':id/estado-mercadopago')
  @UseGuards(JwtAutenticacionGuard)
  async obtenerEstadoMercadoPago(
    @Param('id', ParseIntPipe) id: number,
    @Request() req
  ) {
    const pago = await this.pagosService.findOne(id);

    // Verificar permisos
    if (
      req.user.tipoUsuario !== 'ADMIN' &&
      pago.pedido.usuario.id !== req.user.id
    ) {
      throw new ForbiddenException('No tienes acceso a este pago');
    }

    return this.pagosService.obtenerEstadoPagoMercadoPago(id);
  }

  /**
   * Obtener pagos por pedido
   */
  @Get('pedido/:pedidoId')
  @UseGuards(JwtAutenticacionGuard)
  async findByPedido(
    @Param('pedidoId', ParseIntPipe) pedidoId: number,
    @Request() req
  ) {
    // Verificar permisos
    if (req.user.tipoUsuario !== 'ADMIN') {
      // Aquí deberías verificar que el pedido pertenece al usuario
      // Por simplicidad, solo permitimos admin por ahora
      throw new ForbiddenException(
        'Solo los administradores pueden ver pagos de pedidos'
      );
    }

    return this.pagosService.findByPedido(pedidoId);
  }

  /**
   * Obtener un pago específico
   */
  @Get(':id')
  @UseGuards(JwtAutenticacionGuard)
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const pago = await this.pagosService.findOne(id);

    // Verificar permisos
    if (
      req.user.tipoUsuario !== 'ADMIN' &&
      pago.pedido.usuario.id !== req.user.id
    ) {
      throw new ForbiddenException('No tienes acceso a este pago');
    }

    return pago;
  }

  /**
   * Reembolsar un pago (solo admin)
   */
  @Post(':id/reembolsar')
  @UseGuards(JwtAutenticacionGuard)
  async reembolsarPago(
    @Param('id', ParseIntPipe) id: number,
    @Body('motivo') motivo?: string,
    @Request() req?
  ) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden procesar reembolsos'
      );
    }

    return this.pagosService.reembolsarPago(id, motivo);
  }

  /**
   * Obtener métodos de pago disponibles (público para desarrollo)
   */
  @Get('metodos-disponibles')
  obtenerMetodosPagoDisponibles() {
    return this.pagosService.obtenerMetodosPagoDisponibles();
  }

  /**
   * Crear pago directo con tarjeta (Checkout API)
   */
  @Post('con-tarjeta')
  @UseGuards(JwtAutenticacionGuard)
  async crearPagoConTarjeta(@Body() dto: PagoConTarjetaDto) {
    this.logger.log(
      `Creando pago directo con tarjeta para pedido ${dto.pedidoId}`
    );
    return this.pagosService.crearPagoDirectoMercadoPago(dto);
  }

  /**
   * Validar configuración de MercadoPago
   */
  @Get('configuracion/validar')
  @UseGuards(JwtAutenticacionGuard)
  async validarConfiguracion(@Request() req) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden validar la configuración'
      );
    }

    return this.pagosService.validarConfiguracionMercadoPago();
  }

  /**
   * Obtener estadísticas detalladas de MercadoPago
   */
  @Get('mercadopago/estadisticas')
  @UseGuards(JwtAutenticacionGuard)
  async obtenerEstadisticasMercadoPago(@Request() req) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden ver estadísticas de MercadoPago'
      );
    }

    return this.pagosService.obtenerEstadisticasMercadoPago();
  }

  /**
   * 🎯 CHECKOUT API - Obtener cuotas disponibles para un monto
   */
  @Get('checkout-api/cuotas/:monto')
  @UseGuards(JwtAutenticacionGuard)
  obtenerCuotasDisponibles(
    @Param('monto') monto: string,
    @Query('metodoPago') metodoPago?: string
  ) {
    const montoNumerico = parseFloat(monto);
    if (isNaN(montoNumerico) || montoNumerico <= 0) {
      throw new BadRequestException('Monto inválido');
    }

    return this.pagosService.obtenerCuotasDisponibles(
      montoNumerico,
      metodoPago
    );
  }

  /**
   * 🎯 CHECKOUT API - Validar token de tarjeta
   */
  @Post('checkout-api/validar-token')
  @UseGuards(JwtAutenticacionGuard)
  validarTokenTarjeta(@Body('token') token: string) {
    if (!token) {
      throw new BadRequestException('Token es requerido');
    }

    const valido = this.pagosService.validarTokenTarjeta(token);
    return {
      valido,
      mensaje: valido ? 'Token válido' : 'Token inválido',
    };
  }
}
