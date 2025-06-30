import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EstadoPago } from '@prisma/client';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import {
  getMercadoPagoConfig,
  createMercadoPagoConfig,
  MERCADOPAGO_STATUS_MAPPING,
} from '../mercadopago.config';
import { PagoConTarjetaDto } from '../dto/pago-con-tarjeta.dto';
import {
  MercadoPagoPaymentResponse,
  MercadoPagoTokenResponse,
} from '../types/mercadopago.types';

/**
 * Servicio dedicado exclusivamente a Payment API de MercadoPago
 * Maneja: crear pagos, obtener pagos, buscar pagos, capturar pagos, cancelar pagos
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private mercadopago: MercadoPagoConfig;

  constructor(private readonly prisma: PrismaService) {
    const config = getMercadoPagoConfig();
    this.mercadopago = createMercadoPagoConfig(config);
  }

  /**
   * Crear pago directo con Checkout API
   */
  async crearPagoDirectoMercadoPago(dto: PagoConTarjetaDto) {
    this.logger.log(`Iniciando pago Checkout API para pedido ${dto.pedidoId}`);

    const pedido = await this.prisma.pedido.findUnique({
      where: { id: dto.pedidoId },
      include: { usuario: true },
    });

    if (!pedido) {
      throw new NotFoundException('Pedido no encontrado');
    }

    const pagosExistentes = await this.prisma.pago.findMany({
      where: {
        pedidoId: dto.pedidoId,
        estado: { in: ['COMPLETADO', 'PROCESANDO'] },
      },
    });

    if (pagosExistentes.length > 0) {
      throw new BadRequestException(
        'Este pedido ya tiene pagos procesados o en proceso'
      );
    }

    try {
      const payment = new Payment(this.mercadopago);

      let paymentData: Record<string, unknown>;

      if (dto.token) {
        // Caso 1: Token ya generado (método preferido para producción)
        paymentData = {
          transaction_amount: Number(dto.monto) / 100, // Convertir de centavos a soles
          token: dto.token,
          description: `Pedido ${pedido.numero}`,
          installments: 1,
          payment_method_id: dto.metodoPago.toLowerCase(),
          payer: {
            email: dto.datosTarjeta?.email || pedido.usuario.email,
            identification: dto.datosTarjeta?.numeroDocumento
              ? {
                  type: this.validarTipoDocumento(
                    dto.datosTarjeta.numeroDocumento
                  ),
                  number: dto.datosTarjeta.numeroDocumento,
                }
              : undefined,
          },
          external_reference: pedido.numero,
          statement_descriptor: 'DELA-PLATFORM',
          binary_mode: false,
        };

        // Solo agregar issuer_id si está disponible
        if (dto.issuerId) {
          paymentData.issuer_id = dto.issuerId;
        }
      } else if (dto.datosTarjeta) {
        // Caso 2: Datos de tarjeta directos - Necesitamos crear token primero
        this.logger.warn(
          '⚠️  Creando token desde datos de tarjeta - Solo para desarrollo'
        );

        // Formatear número de tarjeta (remover espacios)
        const numeroTarjeta = dto.datosTarjeta.numeroTarjeta.replace(/\s/g, '');

        // Validar que sea una tarjeta de prueba oficial en modo test
        const firstSixDigits = numeroTarjeta.slice(0, 6);

        // LOG DETALLADO PARA DEBUG
        this.logger.log(
          `🔍 DEBUG - Número recibido: "${dto.datosTarjeta.numeroTarjeta}"`
        );
        this.logger.log(`🔍 DEBUG - Número limpio: "${numeroTarjeta}"`);
        this.logger.log(`🔍 DEBUG - Longitud: ${numeroTarjeta.length}`);
        this.logger.log(`🔍 DEBUG - Primeros 6 dígitos: "${firstSixDigits}"`);
        this.logger.log(
          `🔍 DEBUG - Es tarjeta oficial: ${this.esTargetapruebaOficial(firstSixDigits)}`
        );

        if (!this.esTargetapruebaOficial(firstSixDigits)) {
          this.logger.error(
            `❌ Tarjeta ${firstSixDigits}... NO es de prueba oficial de MercadoPago Perú`
          );
          throw new BadRequestException(
            'En modo test, solo se aceptan tarjetas de prueba oficiales de MercadoPago Perú. ' +
              'Use: 5031 7557 3453 0604 (MC), 4009 1753 3280 6176 (Visa), ' +
              '3711 803032 57522 (Amex) o 5178 7816 2220 2455 (MC Débito)'
          );
        }

        // Convertir fecha MM/YY a MM/YYYY
        const [mes, ano] = dto.datosTarjeta.fechaExpiracion.split('/');
        const anoCompleto = `20${ano}`;

        try {
          // Log de datos que se van a tokenizar (sin mostrar datos sensibles completos)
          this.logger.log('🔍 Creando token con datos:', {
            card_number_length: numeroTarjeta.length,
            first_six: numeroTarjeta.slice(0, 6),
            expiration_month: parseInt(mes),
            expiration_year: parseInt(anoCompleto),
            security_code_length: dto.datosTarjeta.codigoSeguridad.length,
            cardholder_name: dto.datosTarjeta.nombreTitular,
            identification_type: dto.datosTarjeta.tipoDocumento.toUpperCase(),
            identification_number_length:
              dto.datosTarjeta.numeroDocumento.length,
          });

          // Crear token usando Card Token API
          const tokenPayload = {
            card_number: numeroTarjeta,
            expiration_month: parseInt(mes),
            expiration_year: parseInt(anoCompleto),
            security_code: dto.datosTarjeta.codigoSeguridad,
            cardholder: {
              name: dto.datosTarjeta.nombreTitular,
              identification: {
                type: dto.datosTarjeta.tipoDocumento.toUpperCase(),
                number: dto.datosTarjeta.numeroDocumento,
              },
            },
          };

          this.logger.log(
            '📤 Payload de tokenización:',
            JSON.stringify(tokenPayload, null, 2)
          );

          const tokenResponse = await fetch(
            'https://api.mercadopago.com/v1/card_tokens',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${getMercadoPagoConfig().accessToken}`,
              },
              body: JSON.stringify(tokenPayload),
            }
          );

          this.logger.log(
            `📥 Token response status: ${tokenResponse.status} ${tokenResponse.statusText}`
          );

          if (!tokenResponse.ok) {
            const tokenError = (await tokenResponse.json()) as Record<
              string,
              unknown
            >;
            this.logger.error(
              '❌ Error detallado al crear token:',
              JSON.stringify(tokenError, null, 2)
            );

            // Manejo específico de errores de tokenización
            if (tokenError.cause && Array.isArray(tokenError.cause)) {
              const causesMessages = tokenError.cause
                .map(
                  (cause: any) =>
                    `${cause.code}: ${cause.description || cause.message}`
                )
                .join(', ');
              throw new BadRequestException(
                `Error en datos de tarjeta: ${causesMessages}`
              );
            }
            const errorMsg = String(tokenError.message || tokenError.error);
            throw new BadRequestException(
              `Error al procesar tarjeta: ${errorMsg || 'Token inválido'}`
            );
          }

          const tokenData =
            (await tokenResponse.json()) as MercadoPagoTokenResponse;
          this.logger.log('✅ Token creado exitosamente:', {
            id: tokenData.id,
            first_six_digits: tokenData.first_six_digits,
            last_four_digits: tokenData.last_four_digits,
          });

          // Usar el token generado para el pago
          paymentData = {
            transaction_amount: Number(dto.monto) / 100,
            token: tokenData.id,
            description: `Pedido ${pedido.numero}`,
            installments: 1,
            payment_method_id: dto.metodoPago.toLowerCase(),
            payer: {
              email: dto.datosTarjeta.email,
              identification: {
                type: dto.datosTarjeta.tipoDocumento.toUpperCase(),
                number: dto.datosTarjeta.numeroDocumento,
              },
            },
            external_reference: pedido.numero,
            statement_descriptor: 'DELA-PLATFORM',
            binary_mode: false,
          };

          // Para desarrollo: detectar issuer_id basado en los primeros 6 dígitos de tarjetas de prueba de Perú
          const firstSixDigits = tokenData.first_six_digits;
          if (firstSixDigits) {
            const issuerId = this.detectarIssuerIdPeru(firstSixDigits);
            if (issuerId) {
              paymentData.issuer_id = issuerId;
              this.logger.log(
                `Issuer ID detectado: ${issuerId} para ${firstSixDigits}`
              );
            } else {
              this.logger.log(
                `🚫 No se enviará issuer_id para tarjeta de prueba ${firstSixDigits} (recomendado)`
              );
            }
          }
        } catch (error) {
          this.logger.error('Error en tokenización:', error);
          throw new BadRequestException('Error al procesar datos de tarjeta');
        }
      } else {
        throw new BadRequestException(
          'Debe proporcionar token o datos de tarjeta'
        );
      }

      this.logger.log(
        `💳 Procesando pago - Monto: S/${Number(dto.monto || pedido.total)}`
      );

      // Log del payload que se va a enviar
      this.logger.log('🔍 Payload que se enviará a MercadoPago:');
      this.logger.log(JSON.stringify(paymentData, null, 2));

      const pagoMercadoPago = (await payment.create({
        body: paymentData,
      })) as MercadoPagoPaymentResponse;

      if (!pagoMercadoPago.id) {
        throw new BadRequestException('Error al crear pago en MercadoPago');
      }

      const pago = await this.prisma.pago.create({
        data: {
          pedidoId: dto.pedidoId,
          monto: Number(pedido.total),
          estado: this.mapearEstadoDesdeMercadoPago(
            pagoMercadoPago.status || 'pending'
          ),
          fechaPago: pagoMercadoPago.date_approved
            ? new Date(pagoMercadoPago.date_approved)
            : null,
          mercadopagoId: pagoMercadoPago.id?.toString(),
          paymentMethodId: pagoMercadoPago.payment_method_id || null,
          cuotas: pagoMercadoPago.installments || 1,
          ultimosCuatroDigitos: pagoMercadoPago.card?.last_four_digits || null,
        },
        include: {
          pedido: {
            select: {
              id: true,
              numero: true,
              total: true,
              usuario: {
                select: {
                  id: true,
                  nombres: true,
                  apellidos: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (pagoMercadoPago.status === 'approved') {
        await this.verificarEstadoPedido(dto.pedidoId);
        this.logger.log(
          `✅ Pago aprobado - Pedido ${pedido.numero} confirmado`
        );
      }

      this.logger.log(
        `🎯 Pago creado - MP ID: ${pagoMercadoPago.id} - Estado: ${pagoMercadoPago.status}`
      );

      return {
        data: {
          id: pago.id,
          estado: pago.estado,
          monto: pago.monto,
          fechaPago: pago.fechaPago,
          mercadopagoId: pago.mercadopagoId,
          paymentMethodId: pago.paymentMethodId,
          cuotas: pago.cuotas,
          ultimosCuatroDigitos: pago.ultimosCuatroDigitos,
          pedido: pago.pedido,
        },
        mercadopago: {
          id: pagoMercadoPago.id || null,
          status: pagoMercadoPago.status || null,
          status_detail: pagoMercadoPago.status_detail || null,
          date_approved: pagoMercadoPago.date_approved || null,
          transaction_amount: pagoMercadoPago.transaction_amount || null,
          installments: pagoMercadoPago.installments || null,
          payment_method_id: pagoMercadoPago.payment_method_id || null,
          card: pagoMercadoPago.card
            ? {
                first_six_digits: pagoMercadoPago.card.first_six_digits || null,
                last_four_digits: pagoMercadoPago.card.last_four_digits || null,
              }
            : null,
        },
        checkout_info: {
          tipo: 'CHECKOUT_API',
          procesado_directamente: true,
          requiere_redireccion: false,
          estado_pedido:
            pagoMercadoPago.status === 'approved' ? 'CONFIRMADO' : 'PENDIENTE',
        },
      };
    } catch (error) {
      this.logger.error('❌ Error en Checkout API:', error);
      return this.manejarErroresPago(error);
    }
  }

  /**
   * Obtener pago por ID de MercadoPago
   */
  async obtenerPago(pagoId: string) {
    try {
      const payment = new Payment(this.mercadopago);
      const pago = await payment.get({ id: pagoId });

      return {
        id: pago.id,
        status: pago.status,
        status_detail: pago.status_detail,
        date_created: pago.date_created,
        date_approved: pago.date_approved,
        transaction_amount: pago.transaction_amount,
        installments: pago.installments,
        payment_method_id: pago.payment_method_id,
        card: pago.card,
        payer: pago.payer,
      };
    } catch (error) {
      this.logger.error(`Error al obtener pago ${pagoId}:`, error);
      throw new NotFoundException('Pago no encontrado en MercadoPago');
    }
  }

  /**
   * Buscar pagos con filtros avanzados usando la API oficial
   */
  async buscarPagos(filtros: {
    external_reference?: string;
    status?: string;
    date_created_from?: string;
    date_created_to?: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      this.logger.log('Buscando pagos en MercadoPago');

      const payment = new Payment(this.mercadopago);

      const searchOptions: Record<string, string | number> = {
        limit: filtros.limit || 50,
        offset: filtros.offset || 0,
      };

      if (filtros.external_reference) {
        searchOptions.external_reference = filtros.external_reference;
      }
      if (filtros.status) {
        searchOptions.status = filtros.status;
      }
      if (filtros.date_created_from) {
        searchOptions['date_created.from'] = filtros.date_created_from;
      }
      if (filtros.date_created_to) {
        searchOptions['date_created.to'] = filtros.date_created_to;
      }

      const searchResult = await payment.search({
        options: searchOptions,
      });

      return searchResult;
    } catch (error) {
      this.logger.error(`Error al buscar pagos: ${error.message}`);
      throw new BadRequestException(`Error al buscar pagos: ${error.message}`);
    }
  }

  /**
   * Cancelar pago
   */
  async cancelarPago(pagoId: string) {
    try {
      this.logger.log(`Cancelando pago ${pagoId}`);

      const pagoExistente = await this.prisma.pago.findFirst({
        where: { mercadopagoId: pagoId },
      });

      if (!pagoExistente) {
        throw new NotFoundException('Pago no encontrado');
      }

      if (
        !['PENDIENTE', 'PROCESANDO', 'AUTORIZADO'].includes(
          pagoExistente.estado
        )
      ) {
        throw new BadRequestException(
          'El pago no puede ser cancelado en su estado actual'
        );
      }

      const payment = new Payment(this.mercadopago);
      const cancelledPayment = await payment.cancel({ id: pagoId });

      this.logger.log(`Pago cancelado: ${pagoId}`);

      if (cancelledPayment.status === 'cancelled') {
        await this.prisma.pago.updateMany({
          where: { mercadopagoId: pagoId },
          data: {
            estado: 'CANCELADO',
            actualizadoEn: new Date(),
          },
        });
      }

      return {
        id: cancelledPayment.id,
        status: cancelledPayment.status,
        status_detail: cancelledPayment.status_detail,
        date_last_updated: cancelledPayment.date_last_updated,
      };
    } catch (error) {
      this.logger.error(`Error al cancelar pago: ${error.message}`);
      return this.manejarErroresCancelacion(error);
    }
  }

  /**
   * Capturar pago autorizado
   */
  async capturarPago(pagoId: string, monto?: number) {
    try {
      this.logger.log(`Capturando pago ${pagoId}`);

      const pagoExistente = await this.prisma.pago.findFirst({
        where: { mercadopagoId: pagoId },
      });

      if (!pagoExistente) {
        throw new NotFoundException('Pago no encontrado');
      }

      if (pagoExistente.estado !== 'AUTORIZADO') {
        throw new BadRequestException(
          'El pago debe estar en estado autorizado para ser capturado'
        );
      }

      const payment = new Payment(this.mercadopago);
      const capturedPayment = await payment.capture({
        id: pagoId,
        transaction_amount: monto,
        requestOptions: {
          idempotencyKey: `capture-${pagoId}-${Date.now()}`,
        },
      });

      this.logger.log(`Pago capturado: ${pagoId}`);

      if (capturedPayment.status === 'approved') {
        await this.prisma.pago.updateMany({
          where: { mercadopagoId: pagoId },
          data: {
            estado: 'COMPLETADO',
            fechaPago: new Date(capturedPayment.date_approved!),
            actualizadoEn: new Date(),
          },
        });
      }

      return {
        id: capturedPayment.id,
        status: capturedPayment.status,
        status_detail: capturedPayment.status_detail,
        transaction_amount: capturedPayment.transaction_amount,
        date_approved: capturedPayment.date_approved,
        captured_amount: monto || capturedPayment.transaction_amount,
      };
    } catch (error) {
      this.logger.error(`Error al capturar pago: ${error.message}`);
      return this.manejarErroresCaptura(error);
    }
  }

  // Métodos privados de utilidad
  private isErrorWithMessage(error: unknown): error is { message: string } {
    return typeof error === 'object' && error !== null && 'message' in error;
  }

  private getErrorMessage(error: unknown): string {
    if (this.isErrorWithMessage(error)) {
      return error.message;
    }
    return 'Error desconocido';
  }

  private detectarIssuerIdPeru(firstSixDigits: string): string | null {
    // Para tarjetas de prueba de MercadoPago Perú, NO enviar issuer_id
    // El error bin_not_found ocurre cuando se envía un issuer_id incorrecto
    // Las tarjetas de prueba funcionan mejor sin issuer_id especificado

    const cardInfo = {
      '503175': 'Mastercard', // 5031 7557 3453 0604
      '400917': 'Visa', // 4009 1753 3280 6176
      '371180': 'American Express', // 3711 803032 57522
      '517878': 'Mastercard Débito', // 5178 7816 2220 2455
    }[firstSixDigits];

    if (cardInfo) {
      this.logger.log(
        `✓ Tarjeta de prueba oficial detectada: ${cardInfo} (${firstSixDigits}) -> SIN issuer_id (recomendado para pruebas)`
      );
      // Retornar null para no enviar issuer_id con tarjetas de prueba
      return null;
    }

    // Si no es una tarjeta de prueba oficial, advertir en modo test
    this.logger.warn(
      `⚠️  BIN ${firstSixDigits} NO es una tarjeta de prueba oficial de MercadoPago Perú`
    );
    this.logger.warn(
      '📋 Use solo tarjetas oficiales: 503175... (MC), 400917... (Visa), 371180... (Amex), 517878... (MC Débito)'
    );

    return null;
  }

  private esTargetapruebaOficial(firstSixDigits: string): boolean {
    // Números de tarjeta de prueba oficiales de MercadoPago Perú
    const targetsaspruebaOficiales = [
      '503175', // Mastercard: 5031 7557 3453 0604
      '400917', // Visa: 4009 1753 3280 6176
      '371180', // American Express: 3711 803032 57522
      '517878', // Mastercard débito: 5178 7816 2220 2455
    ];

    this.logger.log(
      `🔍 DEBUG esTargetapruebaOficial - Input: "${firstSixDigits}"`
    );
    this.logger.log(
      `🔍 DEBUG esTargetapruebaOficial - Array: ${JSON.stringify(targetsaspruebaOficiales)}`
    );
    const resultado = targetsaspruebaOficiales.includes(firstSixDigits);
    this.logger.log(
      `🔍 DEBUG esTargetapruebaOficial - Resultado: ${resultado}`
    );

    return resultado;
  }

  private validarTipoDocumento(numeroDocumento: string): string {
    if (!numeroDocumento || numeroDocumento.length < 8) {
      return 'DNI';
    }

    if (numeroDocumento.length === 8) {
      return 'DNI';
    } else if (numeroDocumento.length === 11) {
      return 'RUC';
    }

    return 'DNI';
  }

  private mapearEstadoDesdeMercadoPago(estadoMercadoPago: string): EstadoPago {
    return MERCADOPAGO_STATUS_MAPPING[estadoMercadoPago] || 'PENDIENTE';
  }

  private async verificarEstadoPedido(pedidoId: number): Promise<void> {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: pedidoId },
    });

    if (!pedido) {
      throw new NotFoundException('Pedido no encontrado');
    }

    if (pedido.estado !== 'PENDIENTE') {
      throw new BadRequestException(
        'El pedido no está en estado válido para procesar pagos'
      );
    }
  }

  private manejarErroresPago(error: unknown) {
    const errorMessage = this.getErrorMessage(error);

    // Error específico de tarjetas no oficiales en modo test
    if (errorMessage.includes('bin_not_found')) {
      throw new BadRequestException(
        'Tarjeta no válida para modo test. Use solo tarjetas de prueba oficiales de MercadoPago Perú: ' +
          '5031 7557 3453 0604 (MC), 4009 1753 3280 6176 (Visa), ' +
          '3711 803032 57522 (Amex) o 5178 7816 2220 2455 (MC Débito)'
      );
    }

    if (
      errorMessage.includes('invalid_token') ||
      errorMessage.includes('4000')
    ) {
      throw new BadRequestException(
        'Token de tarjeta inválido o expirado. Regenere el token desde el frontend.'
      );
    }

    if (
      errorMessage.includes('invalid_payment_method') ||
      errorMessage.includes('3028')
    ) {
      throw new BadRequestException(
        'Método de pago no válido para Checkout API. Use tarjetas de crédito o débito.'
      );
    }

    if (errorMessage.includes('cc_rejected_insufficient_amount')) {
      throw new BadRequestException(
        'Tarjeta rechazada por fondos insuficientes.'
      );
    }

    if (errorMessage.includes('cc_rejected_bad_filled_security_code')) {
      throw new BadRequestException(
        'Código de seguridad de la tarjeta inválido.'
      );
    }

    if (
      errorMessage.includes('cc_rejected_bad_filled_date') ||
      errorMessage.includes('3029') ||
      errorMessage.includes('3030')
    ) {
      throw new BadRequestException(
        'Fecha de vencimiento de la tarjeta inválida.'
      );
    }

    if (
      errorMessage.includes('cc_rejected_bad_filled_card_number') ||
      errorMessage.includes('3016')
    ) {
      throw new BadRequestException('Número de tarjeta inválido.');
    }

    if (errorMessage.includes('cc_rejected_card_disabled')) {
      throw new BadRequestException(
        'Tarjeta deshabilitada. Contacte a su banco emisor.'
      );
    }

    if (errorMessage.includes('cc_rejected_duplicated_payment')) {
      throw new BadRequestException(
        'Ya se procesó un pago con esta información. Use otra tarjeta si necesita realizar otro pago.'
      );
    }

    if (errorMessage.includes('cc_rejected_high_risk')) {
      throw new BadRequestException(
        'Pago rechazado por políticas de seguridad. Intente con otro método de pago.'
      );
    }

    throw new BadRequestException(
      `Error al procesar pago con Checkout API: ${errorMessage}`
    );
  }

  private manejarErroresCancelacion(error: unknown) {
    const errorMessage = this.getErrorMessage(error);

    if (errorMessage.includes('not found')) {
      throw new NotFoundException('Pago no encontrado en MercadoPago');
    }

    if (errorMessage.includes('not valid')) {
      throw new BadRequestException(
        'El pago no puede ser cancelado. Solo se pueden cancelar pagos en estado: pending, in_process o authorized'
      );
    }

    throw new BadRequestException(`Error al cancelar pago: ${errorMessage}`);
  }

  private manejarErroresCaptura(error: unknown) {
    const errorMessage = this.getErrorMessage(error);

    if (errorMessage.includes('not found')) {
      throw new NotFoundException('Pago no encontrado en MercadoPago');
    }

    if (errorMessage.includes('not valid')) {
      throw new BadRequestException(
        'El pago no puede ser capturado. Solo se pueden capturar pagos en estado authorized'
      );
    }

    throw new BadRequestException(`Error al capturar pago: ${errorMessage}`);
  }
}
