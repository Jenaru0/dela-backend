/**
 * Tipos y interfaces para el sistema de notificaciones
 */

export enum TipoNotificacion {
  PAGO_APROBADO = 'PAGO_APROBADO',
  PAGO_RECHAZADO = 'PAGO_RECHAZADO',
  PAGO_CANCELADO = 'PAGO_CANCELADO',
  PAGO_PENDIENTE = 'PAGO_PENDIENTE',
  PAGO_REEMBOLSADO = 'PAGO_REEMBOLSADO',
  PAGO_EXPIRADO = 'PAGO_EXPIRADO',
  PAGO_ERROR_FORMULARIO = 'PAGO_ERROR_FORMULARIO',
  PAGO_FONDOS_INSUFICIENTES = 'PAGO_FONDOS_INSUFICIENTES',
  PAGO_CODIGO_SEGURIDAD_INVALIDO = 'PAGO_CODIGO_SEGURIDAD_INVALIDO',
  PAGO_VALIDACION_REQUERIDA = 'PAGO_VALIDACION_REQUERIDA',
  PEDIDO_CONFIRMADO = 'PEDIDO_CONFIRMADO',
  PEDIDO_PROCESANDO = 'PEDIDO_PROCESANDO',
}

export enum CanalNotificacion {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
}

export enum PrioridadNotificacion {
  BAJA = 'BAJA',
  NORMAL = 'NORMAL',
  ALTA = 'ALTA',
  CRITICA = 'CRITICA',
}

export interface ContextoPago {
  pagoId: number;
  mercadopagoId?: string;
  monto: number;
  moneda: string;
  metodoPago?: string;
  ultimosCuatroDigitos?: string;
  fechaPago?: Date;
  pedidoId: number;
  numeroPedido: string;
  usuario: {
    id: number;
    nombres: string;
    apellidos: string;
    email: string;
    celular?: string;
  };
}

export interface DatosNotificacion {
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  canales: CanalNotificacion[];
  prioridad: PrioridadNotificacion;
  contexto: ContextoPago;
  metadatos?: Record<string, any>;
}

export interface PlantillaNotificacion {
  titulo: string;
  mensaje: string;
  templateEmail?: string;
  templateSMS?: string;
}

/**
 * Mapeo de estados de MercadoPago a tipos de notificación
 */
export const ESTADO_A_NOTIFICACION_MAP: Record<string, TipoNotificacion> = {
  // Estados exitosos
  APRO: TipoNotificacion.PAGO_APROBADO,
  approved: TipoNotificacion.PAGO_APROBADO,

  // Estados pendientes
  CONT: TipoNotificacion.PAGO_PENDIENTE,
  pending: TipoNotificacion.PAGO_PENDIENTE,
  in_process: TipoNotificacion.PAGO_PENDIENTE,
  in_mediation: TipoNotificacion.PAGO_PENDIENTE,

  // Estados que requieren validación
  CALL: TipoNotificacion.PAGO_VALIDACION_REQUERIDA,

  // Estados de rechazo específicos
  FUND: TipoNotificacion.PAGO_FONDOS_INSUFICIENTES,
  SECU: TipoNotificacion.PAGO_CODIGO_SEGURIDAD_INVALIDO,
  FORM: TipoNotificacion.PAGO_ERROR_FORMULARIO,
  EXPI: TipoNotificacion.PAGO_EXPIRADO,

  // Estados generales de rechazo
  OTHE: TipoNotificacion.PAGO_RECHAZADO,
  rejected: TipoNotificacion.PAGO_RECHAZADO,

  // Estados de cancelación y reembolso
  cancelled: TipoNotificacion.PAGO_CANCELADO,
  refunded: TipoNotificacion.PAGO_REEMBOLSADO,
  charged_back: TipoNotificacion.PAGO_REEMBOLSADO,
};
