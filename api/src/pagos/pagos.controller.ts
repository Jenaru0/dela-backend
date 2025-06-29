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
} from '@nestjs/common';
import { PagosService } from './pagos.service';
import { PagoConTarjetaDto } from './dto/pago-con-tarjeta.dto';
import { WebhookMercadoPagoDto } from './dto/webhook-mercadopago.dto';
import { FiltrosPagosDto } from './dto/filtros-pagos.dto';
import { CapturarPagoDto } from './dto/capturar-pago.dto';
import { BusquedaAvanzadaDto } from './dto/busqueda-avanzada.dto';
import { JwtAutenticacionGuard } from '../autenticacion/guards/jwt-autenticacion.guard';

@Controller('pagos')
export class PagosController {
  private readonly logger = new Logger(PagosController.name);

  constructor(private readonly pagosService: PagosService) {}

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
  validarConfiguracion(@Request() req) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden validar la configuración'
      );
    }

    return this.pagosService.validarConfiguracionMercadoPago();
  }

  /**
   * Obtener configuración específica para Perú
   */
  @Get('configuracion/peru')
  @UseGuards(JwtAutenticacionGuard)
  obtenerConfiguracionPeru() {
    return {
      pais: 'PE',
      moneda: 'PEN',
      simbolo_moneda: 'S/',
      tipos_documento: [
        {
          codigo: 'DNI',
          nombre: 'Documento Nacional de Identidad',
          longitud: 8,
        },
        {
          codigo: 'RUC',
          nombre: 'Registro Único de Contribuyentes',
          longitud: 11,
        },
        {
          codigo: 'CE',
          nombre: 'Carné de Extranjería',
          longitud_min: 9,
          longitud_max: 12,
        },
      ],
      metodos_pago_disponibles: ['visa', 'master', 'amex', 'diners'],
      checkout_api: {
        descripcion: 'MercadoPago Checkout API para Perú',
        requiere_token: true,
        requiere_identificacion: true,
      },
    };
  }

  /**
   * Crear reembolso total o parcial
   */
  @Post('/:pagoId/reembolsos')
  @UseGuards(JwtAutenticacionGuard)
  async crearReembolso(
    @Param('pagoId') pagoId: string,
    @Body() { amount, reason }: { amount?: number; reason?: string },
    @Request() req
  ) {
    // Solo admin puede crear reembolsos
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden crear reembolsos'
      );
    }

    this.logger.log(
      `Admin ${req.user.userId} creando reembolso para pago ${pagoId}`
    );

    return this.pagosService.crearReembolso(pagoId, amount, reason);
  }

  /**
   * Obtener lista de reembolsos de un pago
   */
  @Get('/:pagoId/reembolsos')
  @UseGuards(JwtAutenticacionGuard)
  async obtenerReembolsos(@Param('pagoId') pagoId: string, @Request() req) {
    // Solo admin puede ver reembolsos
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden ver reembolsos'
      );
    }

    return this.pagosService.obtenerReembolsos(pagoId);
  }

  /**
   * Obtener reembolso específico
   */
  @Get('/:pagoId/reembolsos/:reembolsoId')
  @UseGuards(JwtAutenticacionGuard)
  async obtenerReembolso(
    @Param('pagoId') pagoId: string,
    @Param('reembolsoId') reembolsoId: string,
    @Request() req
  ) {
    // Solo admin puede ver reembolsos
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden ver reembolsos'
      );
    }

    return this.pagosService.obtenerReembolso(pagoId, reembolsoId);
  }

  /**
   * Cancelar pago
   */
  @Post('/:pagoId/cancelar')
  @UseGuards(JwtAutenticacionGuard)
  async cancelarPago(@Param('pagoId') pagoId: string, @Request() req) {
    // Solo admin puede cancelar pagos
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden cancelar pagos'
      );
    }

    this.logger.log(`Admin ${req.user.userId} cancelando pago ${pagoId}`);

    return this.pagosService.cancelarPago(pagoId);
  }

  /**
   * Capturar pago autorizado
   * Endpoint oficial: PUT /v1/payments/{payment_id}
   */
  @Post(':pagoId/capturar')
  @UseGuards(JwtAutenticacionGuard)
  async capturarPago(
    @Param('pagoId') pagoId: string,
    @Body() dto: CapturarPagoDto,
    @Request() req?: any
  ) {
    // Solo admin puede capturar pagos
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden capturar pagos'
      );
    }

    this.logger.log(`Capturando pago ${pagoId}`);
    return this.pagosService.capturarPago(pagoId, dto.monto);
  }

  /**
   * Crear reembolso total
   */
  @Post('/:pagoId/reembolso-total')
  @UseGuards(JwtAutenticacionGuard)
  async crearReembolsoTotal(
    @Param('pagoId') pagoId: string,
    @Body() { reason }: { reason?: string },
    @Request() req
  ) {
    // Solo admin puede crear reembolsos totales
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden crear reembolsos totales'
      );
    }

    this.logger.log(
      `Admin ${req.user.userId} creando reembolso total para pago ${pagoId}`
    );

    return this.pagosService.crearReembolsoTotal(pagoId, reason);
  }

  /**
   * Buscar pagos con filtros avanzados
   */
  @Get('buscar/avanzado')
  @UseGuards(JwtAutenticacionGuard)
  async buscarPagos(@Query() dto: BusquedaAvanzadaDto, @Request() req?: any) {
    // Solo admin puede buscar pagos
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden buscar pagos'
      );
    }

    return this.pagosService.buscarPagos(dto);
  }

  /**
   * Obtener métodos de pago desde API oficial
   */
  @Get('metodos-pago/api-oficial')
  @UseGuards(JwtAutenticacionGuard)
  async obtenerMetodosPagoAPI() {
    return this.pagosService.obtenerMetodosPagoRealesAPI();
  }

  /**
   * Obtener tipos de identificación desde API oficial
   */
  @Get('tipos-identificacion/api-oficial')
  @UseGuards(JwtAutenticacionGuard)
  async obtenerTiposIdentificacion() {
    return this.pagosService.obtenerTiposIdentificacion();
  }

  /**
   * ==========================================
   * ENDPOINTS PARA NUEVAS FUNCIONALIDADES - EN DESARROLLO
   * ==========================================
   */

  /*
  // MERCHANT ORDER ENDPOINTS - COMENTADOS TEMPORALMENTE
  @Post('merchant-order')
  @UseGuards(JwtAutenticacionGuard)
  async crearOrdenComercio(@Body() datos: any, @Request() req) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException('Solo los administradores pueden crear órdenes de comercio');
    }
    return this.pagosService.crearOrdenComercio(datos);
  }
  */
}
