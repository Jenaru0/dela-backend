import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  MercadoPagoConfig,
  Preference,
  Payment,
  PaymentRefund,
} from 'mercadopago';
import {
  getMercadoPagoConfig,
  createMercadoPagoConfig,
} from './mercadopago.config';
import type { ReembolsoResult } from './pagos.service';

@Injectable()
export class PagosMercadoPagoService {
  private readonly logger = new Logger(PagosMercadoPagoService.name);
  private mercadopago: MercadoPagoConfig;

  constructor() {
    const config = getMercadoPagoConfig();
    this.mercadopago = createMercadoPagoConfig(config);
    this.logger.log('🔒 Servicio MercadoPago inicializado en MODO SANDBOX');
  }

  /**
   * 🎯 MÉTODO REAL - Obtener métodos de pago desde API oficial de MercadoPago
   * @see https://www.mercadopago.com.pe/developers/es/reference/payment_methods/_payment_methods/get
   */
  async obtenerMetodosPagoReales(): Promise<unknown[]> {
    try {
      // ✅ USAR API REAL - Obtener métodos de pago disponibles para Perú
      const response = await fetch(
        'https://api.mercadopago.com/v1/payment_methods?public_key=' +
          getMercadoPagoConfig().publicKey
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const paymentMethods = (await response.json()) as unknown[];

      // Filtrar solo métodos relevantes para Checkout API en Perú
      const metodosCheckoutAPI = paymentMethods.filter(
        (method: any) =>
          method.status === 'active' &&
          (method.payment_type_id === 'credit_card' ||
            method.payment_type_id === 'debit_card')
      );

      this.logger.log(
        `✅ Métodos de pago obtenidos desde API oficial: ${metodosCheckoutAPI.length} métodos`
      );

      return metodosCheckoutAPI;
    } catch (error) {
      this.logger.error(
        '❌ Error al obtener métodos de pago desde API:',
        error
      );

      // 🔄 FALLBACK - Métodos básicos solo para desarrollo
      this.logger.warn('⚠️ Usando fallback de métodos básicos para desarrollo');
      return [
        {
          id: 'visa',
          name: 'Visa',
          payment_type_id: 'credit_card',
          status: 'active',
          secure_thumbnail:
            'https://www.mercadopago.com/org-img/MP3/API/logos/visa.gif',
          thumbnail:
            'https://www.mercadopago.com/org-img/MP3/API/logos/visa.gif',
        },
        {
          id: 'master',
          name: 'Mastercard',
          payment_type_id: 'credit_card',
          status: 'active',
          secure_thumbnail:
            'https://www.mercadopago.com/org-img/MP3/API/logos/master.gif',
          thumbnail:
            'https://www.mercadopago.com/org-img/MP3/API/logos/master.gif',
        },
      ];
    }
  }

  /**
   * Validar configuración de MercadoPago
   */
  async validarConfiguracion(): Promise<boolean> {
    try {
      const config = getMercadoPagoConfig();

      // Verificar que las credenciales son de TEST
      if (
        !config.accessToken.startsWith('TEST-') ||
        !config.publicKey.startsWith('TEST-')
      ) {
        throw new Error('Solo se permiten credenciales de TEST');
      }

      // Intentar hacer una consulta simple para validar las credenciales
      // En sandbox podemos crear una preferencia de prueba
      const preference = new Preference(this.mercadopago);

      const testPreference = {
        items: [
          {
            id: 'test-item',
            title: 'Test de configuración',
            quantity: 1,
            unit_price: 1,
            currency_id: 'PEN',
          },
        ],
        payer: {
          name: 'Test',
          surname: 'User',
          email: 'test@test.com',
        },
      };

      const result = await preference.create({ body: testPreference });

      if (result.id) {
        this.logger.log(
          '✅ Configuración de MercadoPago validada correctamente'
        );
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('❌ Error en validación de MercadoPago:', error);
      return false;
    }
  }

  /**
   * Procesar reembolso real en MercadoPago
   */
  async procesarReembolsoReal(
    paymentId: string,
    amount?: number,
    reason?: string
  ): Promise<ReembolsoResult> {
    try {
      const payment = new Payment(this.mercadopago);

      // Primero obtenemos el pago para validarlo
      const pagoOriginal = await payment.get({ id: paymentId });

      if (!pagoOriginal || pagoOriginal.status !== 'approved') {
        throw new BadRequestException(
          'El pago no está en estado válido para reembolso'
        );
      }

      // Crear el reembolso con tipado correcto
      const refundData: {
        payment_id: number;
        amount?: number;
        metadata?: { reason: string };
      } = {
        payment_id: parseInt(paymentId),
      };

      // Si se especifica un monto, hacer reembolso parcial
      if (amount && amount < pagoOriginal.transaction_amount!) {
        refundData.amount = amount;
        this.logger.log(
          `🔄 Procesando reembolso parcial: S/${amount} de S/${pagoOriginal.transaction_amount}`
        );
      } else {
        this.logger.log(
          `🔄 Procesando reembolso total: S/${pagoOriginal.transaction_amount}`
        );
      }

      if (reason) {
        refundData.metadata = { reason };
      }

      // En el SDK actual, usamos la API REST para reembolsos
      const refund = new PaymentRefund(this.mercadopago);
      const resultado = await refund.create({
        payment_id: paymentId,
        body: refundData,
      });

      this.logger.log(`✅ Reembolso procesado - ID: ${resultado.id}`);

      return {
        success: true,
        refundId: String(resultado.id || ''),
        status: String(resultado.status || ''),
        amount: Number(resultado.amount || 0),
        payment_id: paymentId,
        message: 'Reembolso procesado exitosamente en MercadoPago',
      };
    } catch (error) {
      this.logger.error(
        `❌ Error al procesar reembolso para pago ${paymentId}:`,
        error
      );

      // En sandbox, simular el reembolso si la API no responde
      if (
        error.message?.includes('sandbox') ||
        error.message?.includes('test')
      ) {
        this.logger.warn('⚠️ Simulando reembolso en modo sandbox');
        return {
          success: true,
          refundId: `REFUND-TEST-${Date.now()}`,
          status: 'approved',
          amount: amount || 0,
          payment_id: paymentId,
          message: 'Reembolso simulado en modo sandbox',
          simulated: true,
        };
      }

      throw new BadRequestException(
        `Error al procesar reembolso: ${error.message}`
      );
    }
  }

  /**
   * Obtener información detallada de un pago desde MercadoPago
   */
  async obtenerDetallePago(paymentId: string) {
    try {
      const payment = new Payment(this.mercadopago);
      const pago = await payment.get({ id: paymentId });

      return {
        id: pago.id,
        status: pago.status,
        status_detail: pago.status_detail,
        transaction_amount: pago.transaction_amount,
        currency_id: pago.currency_id,
        date_created: pago.date_created,
        date_approved: pago.date_approved,
        payment_method_id: pago.payment_method_id,
        payment_type_id: pago.payment_type_id,
        installments: pago.installments,
        card: pago.card
          ? {
              first_six_digits: pago.card.first_six_digits,
              last_four_digits: pago.card.last_four_digits,
              cardholder: pago.card.cardholder,
            }
          : null,
        payer: {
          email: pago.payer?.email,
          identification: pago.payer?.identification,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener detalle del pago ${paymentId}:`,
        error
      );
      throw new BadRequestException(
        'Error al consultar el pago en MercadoPago'
      );
    }
  }

  /**
   * Obtener estadísticas desde MercadoPago
   */
  obtenerEstadisticasMercadoPago() {
    try {
      // En sandbox, las estadísticas están limitadas
      // Retornamos información básica de configuración
      const config = getMercadoPagoConfig();

      return {
        configuracion: {
          modo: 'SANDBOX',
          pais: 'PE',
          moneda: 'PEN',
          credenciales_validas:
            config.accessToken.startsWith('TEST-') &&
            config.publicKey.startsWith('TEST-'),
          webhook_configurado: !!config.webhookUrl,
        },
        advertencias: [
          '⚠️ Modo sandbox - Solo pagos de prueba',
          '⚠️ Estadísticas limitadas en sandbox',
          '⚠️ Solo tarjetas de prueba funcionan',
        ],
        urls: {
          success: config.successUrl,
          failure: config.failureUrl,
          pending: config.pendingUrl,
          webhook: config.webhookUrl,
        },
      };
    } catch (error) {
      this.logger.error('Error al obtener estadísticas:', error);
      throw new BadRequestException(
        'Error al obtener estadísticas de MercadoPago'
      );
    }
  }

  /**
   * 🎯 CHECKOUT API - Validar token de tarjeta antes de procesar pago
   * CORREGIDO: Validación más estricta según documentación oficial
   */
  validarTokenTarjeta(token: string): boolean {
    try {
      // Validaciones básicas
      if (!token || typeof token !== 'string') {
        this.logger.warn('Token nulo o tipo inválido');
        return false;
      }

      // Eliminar espacios en blanco
      const tokenLimpio = token.trim();

      // Los tokens de MercadoPago tienen formatos específicos
      if (tokenLimpio.length < 20) {
        this.logger.warn(
          `Token demasiado corto: ${tokenLimpio.length} caracteres`
        );
        return false;
      }

      // Formato típico de tokens de MercadoPago: letras, números, guiones
      const formatoValido = /^[a-zA-Z0-9_-]+$/.test(tokenLimpio);
      if (!formatoValido) {
        this.logger.warn('Token contiene caracteres inválidos');
        return false;
      }

      // En sandbox, aceptar tokens de prueba con patrones conocidos
      const patronesSandbox = [
        /^ff8080[a-f0-9]+$/i, // Patrón común en sandbox
        /^[a-f0-9]{32,}$/i, // Patrón hexadecimal largo
        /.*test.*/i, // Contiene 'test'
        /.*sandbox.*/i, // Contiene 'sandbox'
      ];

      const esTokenSandbox = patronesSandbox.some((patron) =>
        patron.test(tokenLimpio)
      );

      if (esTokenSandbox) {
        this.logger.log(
          `✅ Token de sandbox validado: ${tokenLimpio.substring(0, 10)}...`
        );
        return true;
      }

      // Token con formato válido pero no reconocido - aceptar en sandbox
      this.logger.warn(
        `⚠️ Token con formato no reconocido pero aceptado en sandbox: ${tokenLimpio.substring(0, 10)}...`
      );
      return true;
    } catch (error) {
      this.logger.error('Error al validar token:', error);
      return false;
    }
  }

  /**
   * 🎯 CHECKOUT API - Obtener cuotas disponibles para un monto
   */
  obtenerCuotasDisponibles(monto: number, metodoPago: string = 'credit_card') {
    try {
      // En sandbox, las cuotas están limitadas pero podemos simular las reales
      // Método de pago: ${metodoPago} (informativo)
      const cuotasSimuladas = [
        { installments: 1, total: monto, interest_rate: 0 },
        { installments: 3, total: monto * 1.05, interest_rate: 5 },
        { installments: 6, total: monto * 1.12, interest_rate: 12 },
        { installments: 12, total: monto * 1.25, interest_rate: 25 },
      ];

      this.logger.log(
        `📊 Cuotas calculadas para monto S/${monto} (${metodoPago})`
      );
      return {
        available_installments: cuotasSimuladas,
        recommended: 1, // Sin interés
        max_installments: 12,
        min_amount: 1,
        currency: 'PEN',
      };
    } catch (error) {
      this.logger.error('Error al obtener cuotas:', error);
      throw new BadRequestException('Error al calcular cuotas disponibles');
    }
  }

  /**
   * 🎯 MÉTODO PARA PRODUCCIÓN - Identificar payment_method_id por BIN
   * Este método debería usarse en el frontend con MercadoPago.js
   * @see https://www.mercadopago.com.pe/developers/es/docs/checkout-api/integration-configuration/card/web-integration
   */
  async identificarMetodoPagoPorBIN(bin: string): Promise<string> {
    try {
      if (!bin || bin.length < 6) {
        throw new BadRequestException('BIN debe tener al menos 6 dígitos');
      }

      // ✅ USAR API REAL - Obtener payment_method por BIN
      const response = await fetch(
        `https://api.mercadopago.com/v1/payment_methods/search?public_key=${
          getMercadoPagoConfig().publicKey
        }&bin=${bin.substring(0, 8)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const binInfo: unknown = await response.json();

      if (binInfo && typeof binInfo === 'object' && 'results' in binInfo) {
        const results = (binInfo as { results: any[] }).results;
        if (results && results.length > 0) {
          const paymentMethod = results[0] as { id: string };
          this.logger.log(
            `✅ Payment method identificado por BIN: ${paymentMethod.id}`
          );
          return paymentMethod.id;
        }
      }

      // Fallback para desarrollo
      this.logger.warn(
        `⚠️ No se pudo identificar payment_method para BIN: ${bin.substring(0, 6)}***`
      );
      return 'visa'; // Default para desarrollo
    } catch (error) {
      this.logger.error(
        '❌ Error al identificar payment method por BIN:',
        error
      );
      return 'visa'; // Default para desarrollo
    }
  }
}
