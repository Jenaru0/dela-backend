import { MercadoPagoConfig } from 'mercadopago';

export interface MercadoPagoConfiguration {
  accessToken: string;
  publicKey: string;
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
  webhookUrl: string;
}

export const createMercadoPagoConfig = (
  configuration: MercadoPagoConfiguration
): MercadoPagoConfig => {
  return new MercadoPagoConfig({
    accessToken: configuration.accessToken,
    options: {
      timeout: 5000,
    },
  });
};

export const getMercadoPagoConfig = (): MercadoPagoConfiguration => {
  const accessToken = process.env.MP_ACCESS_TOKEN || '';
  const publicKey = process.env.MP_PUBLIC_KEY || '';

  // 🔒 VALIDACIÓN CRÍTICA: Solo permitir credenciales TEST
  if (!accessToken.startsWith('TEST-')) {
    throw new Error(
      '🚨 SEGURIDAD: Solo se permiten credenciales TEST. El ACCESS_TOKEN debe comenzar con "TEST-"'
    );
  }

  if (!publicKey.startsWith('TEST-')) {
    throw new Error(
      '🚨 SEGURIDAD: Solo se permiten credenciales TEST. El PUBLIC_KEY debe comenzar con "TEST-"'
    );
  }

  if (!accessToken || !publicKey) {
    throw new Error('🚨 ERROR: MP_ACCESS_TOKEN y MP_PUBLIC_KEY son requeridos');
  }

  // ✅ VALIDACIÓN: URLs de webhook y redirección
  const webhookUrl =
    process.env.MP_WEBHOOK_URL || 'http://localhost:3001/pagos/webhook';

  // En producción, validar que las URLs no sean localhost
  if (!accessToken.startsWith('TEST-') && webhookUrl.includes('localhost')) {
    throw new Error(
      '🚨 PRODUCCIÓN: Las URLs de webhook no pueden usar localhost. ' +
        'Configure MP_WEBHOOK_URL con una URL pública accesible.'
    );
  }

  return {
    accessToken,
    publicKey,
    successUrl:
      process.env.MP_SUCCESS_URL || 'http://localhost:3000/pagos/exito',
    failureUrl:
      process.env.MP_FAILURE_URL || 'http://localhost:3000/pagos/error',
    pendingUrl:
      process.env.MP_PENDING_URL || 'http://localhost:3000/pagos/pendiente',
    webhookUrl,
  };
};

// ⚠️ MÉTODOS DE PAGO DISPONIBLES EN SANDBOX PERÚ (SOLO PRUEBAS)
// Basado en documentación oficial: https://www.mercadopago.com.pe/developers/es/docs/checkout-api/integration-test/
// ⚠️ IMPORTANTE: NO procesa dinero real - Solo simulaciones

export const MERCADOPAGO_PAYMENT_METHODS = {
  // ✅ TARJETAS DE CRÉDITO - COMPLETAMENTE FUNCIONAL EN SANDBOX
  MERCADOPAGO_CREDIT_CARD: {
    id: 'credit_card',
    name: 'Tarjeta de Crédito',
    country: 'PE',
    currency: 'PEN',
    disponibleEnSandbox: true,
    recomendado: true, // Método más confiable para pruebas
    description: 'Visa, Mastercard, American Express - SOLO PRUEBAS',
    // Tarjetas oficiales de la documentación de MercadoPago Perú (actualizada 2025)
    // Fuente: https://www.mercadopago.com.pe/developers/es/docs/checkout-api/integration-test/test-cards
    tarjetasPrueba: {
      // ✅ MASTERCARD - NÚMERO OFICIAL ACTUALIZADO
      MASTERCARD_APROBADA: {
        number: '5031755734530604', // Número oficial actualizado
        cvv: '123',
        expiry: '11/30', // Fecha oficial actualizada
        holder: 'APRO', // Para pago aprobado
        document: '123456789', // Documento oficial
        result: 'APROBADO',
      },
      // ✅ VISA - NÚMERO OFICIAL ACTUALIZADO
      VISA_APROBADA: {
        number: '4009175332806176', // Número oficial actualizado
        cvv: '123',
        expiry: '11/30', // Fecha oficial actualizada
        holder: 'APRO', // Para pago aprobado
        document: '123456789', // Documento oficial
        result: 'APROBADO',
      },
      // ✅ AMERICAN EXPRESS - NÚMERO OFICIAL ACTUALIZADO
      AMEX_APROBADA: {
        number: '371180303257522', // Número oficial actualizado (sin espacios)
        cvv: '1234',
        expiry: '11/30', // Fecha oficial actualizada
        holder: 'APRO', // Para pago aprobado
        document: '123456789', // Documento oficial
        result: 'APROBADO',
      },

      // 🧪 TARJETAS PARA PROBAR DIFERENTES ESTADOS (mismos números, diferentes titulares)
      MASTERCARD_RECHAZADA_GENERAL: {
        number: '5031755734530604',
        cvv: '123',
        expiry: '11/30',
        holder: 'OTHE', // Rechazado por error general
        document: '123456789',
        result: 'RECHAZADO_ERROR_GENERAL',
      },
      VISA_PENDIENTE: {
        number: '4009175332806176',
        cvv: '123',
        expiry: '11/30',
        holder: 'CONT', // Pendiente de pago
        document: '123456789',
        result: 'PENDIENTE',
      },
      AMEX_RECHAZADA_VALIDACION: {
        number: '371180303257522',
        cvv: '1234',
        expiry: '11/30',
        holder: 'CALL', // Rechazado con validación para autorizar
        document: '123456789',
        result: 'RECHAZADO_VALIDACION',
      },
      MASTERCARD_FONDOS_INSUFICIENTES: {
        number: '5031755734530604',
        cvv: '123',
        expiry: '11/30',
        holder: 'FUND', // Rechazado por importe insuficiente
        document: '123456789',
        result: 'RECHAZADO_FONDOS',
      },
      VISA_CVV_INVALIDO: {
        number: '4009175332806176',
        cvv: '123',
        expiry: '11/30',
        holder: 'SECU', // Rechazado por código de seguridad inválido
        document: '123456789',
        result: 'RECHAZADO_CVV',
      },
      AMEX_FECHA_VENCIDA: {
        number: '371180303257522',
        cvv: '1234',
        expiry: '11/30',
        holder: 'EXPI', // Rechazado debido a un problema de fecha de vencimiento
        document: '123456789',
        result: 'RECHAZADO_VENCIMIENTO',
      },
      MASTERCARD_ERROR_FORMULARIO: {
        number: '5031755734530604',
        cvv: '123',
        expiry: '11/30',
        holder: 'FORM', // Rechazado debido a un error de formulario
        document: '123456789',
        result: 'RECHAZADO_FORMULARIO',
      },
    },
  },

  // ✅ TARJETAS DE DÉBITO - FUNCIONAL EN SANDBOX
  MERCADOPAGO_DEBIT_CARD: {
    id: 'debit_card',
    name: 'Tarjeta de Débito',
    country: 'PE',
    currency: 'PEN',
    disponibleEnSandbox: true,
    recomendado: true,
    description: 'Tarjetas de débito - SOLO PRUEBAS',
    tarjetasPrueba: {
      // Usando el mismo número de MasterCard oficial para débito
      MASTERCARD_DEBIT_APROBADA: {
        number: '5031755734530604', // Mismo número oficial que crédito
        cvv: '123',
        expiry: '11/30', // Fecha oficial actualizada
        holder: 'APRO',
        document: '123456789', // Documento oficial
        result: 'APROBADO',
      },
      // También se puede usar VISA para débito
      VISA_DEBIT_APROBADA: {
        number: '4009175332806176', // Mismo número oficial que crédito
        cvv: '123',
        expiry: '11/30', // Fecha oficial actualizada
        holder: 'APRO',
        document: '123456789', // Documento oficial
        result: 'APROBADO',
      },
    },
  },

  // ❌ YAPE - NO DISPONIBLE EN SANDBOX
  // Según la documentación oficial, Yape requiere integración especial
  // y NO está disponible en modo sandbox estándar
  // ELIMINADO PARA EVITAR CONFUSIÓN

  // ❌ PAGOEFECTIVO - LIMITADO EN SANDBOX
  // Solo genera cupones simulados, no es útil para pruebas reales
  // ELIMINADO PARA EVITAR CONFUSIÓN
};

// Estados de pago de MercadoPago mapeados a nuestros estados
export const MERCADOPAGO_STATUS_MAPPING = {
  pending: 'PENDIENTE',
  approved: 'COMPLETADO',
  authorized: 'PROCESANDO',
  in_process: 'PROCESANDO',
  in_mediation: 'PROCESANDO',
  rejected: 'FALLIDO',
  cancelled: 'CANCELADO',
  refunded: 'REEMBOLSADO',
  charged_back: 'REEMBOLSADO',
} as const;
