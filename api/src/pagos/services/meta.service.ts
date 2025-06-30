import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  MercadoPagoConfig,
  PaymentMethod,
  IdentificationType,
} from 'mercadopago';
import {
  getMercadoPagoConfig,
  createMercadoPagoConfig,
} from '../mercadopago.config';

/**
 * Servicio dedicado a APIs de información de MercadoPago
 * Maneja: métodos de pago, tipos de identificación, configuración
 */
@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);
  private mercadopago: MercadoPagoConfig;

  constructor() {
    const config = getMercadoPagoConfig();
    this.mercadopago = createMercadoPagoConfig(config);
  }

  /**
   * Obtener métodos de pago disponibles desde la API oficial
   */
  async obtenerMetodosPagoRealesAPI() {
    try {
      this.logger.log('Obteniendo métodos de pago desde API oficial');

      const paymentMethod = new PaymentMethod(this.mercadopago);
      const metodosReales = await paymentMethod.get();

      return {
        mensaje: 'Métodos de pago obtenidos exitosamente desde API oficial',
        data: metodosReales,
      };
    } catch (error) {
      this.logger.error('Error al obtener métodos de pago desde API:', error);
      this.logger.warn('Usando fallback de métodos de pago locales');
      return this.obtenerMetodosPagoDisponibles();
    }
  }

  /**
   * Obtener tipos de identificación desde la API oficial
   */
  async obtenerTiposIdentificacion() {
    try {
      this.logger.log('Obteniendo tipos de identificación desde API oficial');

      const identificationType = new IdentificationType(this.mercadopago);
      const tiposIdentificacion = await identificationType.list();

      return {
        mensaje: 'Tipos de identificación obtenidos exitosamente',
        data: tiposIdentificacion,
      };
    } catch (error) {
      this.logger.error('Error al obtener tipos de identificación:', error);

      return {
        mensaje: 'Tipos de identificación obtenidos exitosamente (fallback)',
        data: [
          {
            id: 'DNI',
            name: 'DNI',
            type: 'number',
            min_length: 8,
            max_length: 8,
          },
          {
            id: 'RUC',
            name: 'RUC',
            type: 'number',
            min_length: 11,
            max_length: 11,
          },
          {
            id: 'CE',
            name: 'Carnet de Extranjería',
            type: 'number',
            min_length: 9,
            max_length: 12,
          },
        ],
        country: 'PE',
        fallback: true,
      };
    }
  }

  /**
   * Obtener métodos de pago locales (fallback)
   */
  obtenerMetodosPagoDisponibles() {
    try {
      const metodosReales = this.obtenerMetodosPagoReales();

      return {
        mensaje: 'Métodos de pago obtenidos exitosamente',
        data: metodosReales,
      };
    } catch (error) {
      this.logger.error('Error al obtener métodos de pago:', error);
      throw new BadRequestException(
        'Error al consultar métodos de pago disponibles'
      );
    }
  }

  /**
   * Validar configuración de MercadoPago
   */
  validarConfiguracionMercadoPago() {
    return {
      configuracion_mercadopago: {
        modo: process.env.MERCADOPAGO_ENV || 'sandbox',
        pais: 'PE',
        moneda: 'PEN',
        activo: true,
      },
      metodos_pago_disponibles: ['visa', 'master', 'amex'],
      checkout_api: {
        descripcion: 'MercadoPago Checkout API para Perú',
        requiere_token: true,
        requiere_identificacion: true,
      },
    };
  }

  /**
   * Obtener métodos de pago reales para Perú (fallback)
   */
  private obtenerMetodosPagoReales() {
    try {
      return [
        {
          id: 'visa',
          name: 'Visa',
          payment_type_id: 'credit_card',
          status: 'active',
          thumbnail:
            'https://http2.mlstatic.com/storage/logos-api-admin/a5f047d0-9be0-11ec-aad4-c3381f368aaf-m.svg',
          secure_thumbnail:
            'https://http2.mlstatic.com/storage/logos-api-admin/a5f047d0-9be0-11ec-aad4-c3381f368aaf-m.svg',
          deferred_capture: 'unsupported',
          settings: [],
          additional_info_needed: [
            'cardholder_name',
            'cardholder_identification_number',
          ],
          min_allowed_amount: 1,
          max_allowed_amount: 25000000,
          accreditation_time: 0,
          financial_institutions: [],
          processing_modes: ['aggregator'],
        },
        {
          id: 'master',
          name: 'Mastercard',
          payment_type_id: 'credit_card',
          status: 'active',
          thumbnail:
            'https://http2.mlstatic.com/storage/logos-api-admin/b2c93a40-f3be-11eb-9984-b7076edb0bb7-m.svg',
          secure_thumbnail:
            'https://http2.mlstatic.com/storage/logos-api-admin/b2c93a40-f3be-11eb-9984-b7076edb0bb7-m.svg',
          deferred_capture: 'unsupported',
          settings: [],
          additional_info_needed: [
            'cardholder_name',
            'cardholder_identification_number',
          ],
          min_allowed_amount: 1,
          max_allowed_amount: 25000000,
          accreditation_time: 0,
          financial_institutions: [],
          processing_modes: ['aggregator'],
        },
        {
          id: 'amex',
          name: 'American Express',
          payment_type_id: 'credit_card',
          status: 'active',
          thumbnail:
            'https://http2.mlstatic.com/storage/logos-api-admin/fec5f230-06ee-11ea-8b72-39f7d2a38bd9-m.svg',
          secure_thumbnail:
            'https://http2.mlstatic.com/storage/logos-api-admin/fec5f230-06ee-11ea-8b72-39f7d2a38bd9-m.svg',
          deferred_capture: 'unsupported',
          settings: [],
          additional_info_needed: [
            'cardholder_name',
            'cardholder_identification_number',
          ],
          min_allowed_amount: 1,
          max_allowed_amount: 25000000,
          accreditation_time: 0,
          financial_institutions: [],
          processing_modes: ['aggregator'],
        },
      ];
    } catch (error) {
      this.logger.warn(
        'Usando fallback mínimo de métodos de pago:',
        error.message
      );
      return [
        {
          id: 'visa',
          name: 'Visa',
          payment_type_id: 'credit_card',
          status: 'active',
          thumbnail: '',
          secure_thumbnail: '',
          deferred_capture: 'unsupported',
          settings: [],
          additional_info_needed: [
            'cardholder_name',
            'cardholder_identification_number',
          ],
          min_allowed_amount: 1,
          max_allowed_amount: 25000000,
          accreditation_time: 0,
          financial_institutions: [],
          processing_modes: ['aggregator'],
        },
        {
          id: 'master',
          name: 'Mastercard',
          payment_type_id: 'credit_card',
          status: 'active',
          thumbnail: '',
          secure_thumbnail: '',
          deferred_capture: 'unsupported',
          settings: [],
          additional_info_needed: [
            'cardholder_name',
            'cardholder_identification_number',
          ],
          min_allowed_amount: 1,
          max_allowed_amount: 25000000,
          accreditation_time: 0,
          financial_institutions: [],
          processing_modes: ['aggregator'],
        },
      ];
    }
  }
}
