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
      timeout: 10000,
    },
  });
};

export const getMercadoPagoConfig = (): MercadoPagoConfiguration => {
  const accessToken = process.env.MP_ACCESS_TOKEN || '';
  const publicKey = process.env.MP_PUBLIC_KEY || '';

  if (!accessToken || !publicKey) {
    throw new Error('🚨 ERROR: MP_ACCESS_TOKEN y MP_PUBLIC_KEY son requeridos');
  }

  const webhookUrl =
    process.env.MP_WEBHOOK_URL || 'https://tu-dominio.com/pagos/webhook';

  // ⚠️ IMPORTANTE: Para Perú, asegurar HTTPS y dominio público
  if (!accessToken.startsWith('TEST-') && webhookUrl.includes('localhost')) {
    throw new Error(
      '🚨 PRODUCCIÓN PERÚ: Las URLs de webhook deben ser HTTPS públicas. ' +
        'Configure MP_WEBHOOK_URL con una URL accesible desde internet.'
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
  authorized: 'AUTORIZADO',
  in_process: 'PROCESANDO',
  in_mediation: 'PROCESANDO',
  rejected: 'FALLIDO',
  cancelled: 'CANCELADO',
  refunded: 'REEMBOLSADO',
  charged_back: 'REEMBOLSADO',
} as const;
