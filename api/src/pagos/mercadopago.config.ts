import { MercadoPagoConfig } from 'mercadopago';

export interface MercadoPagoConfiguration {
  accessToken: string;
  publicKey: string;
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

  // ✅ VALIDACIÓN: URLs de webhook
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
    webhookUrl,
  };
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
