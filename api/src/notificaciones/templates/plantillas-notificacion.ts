import {
  TipoNotificacion,
  PlantillaNotificacion,
  PrioridadNotificacion,
  CanalNotificacion,
} from '../types/notificacion.types';

/**
 * Plantillas predefinidas para cada tipo de notificación
 */
export const PLANTILLAS_NOTIFICACION: Record<
  TipoNotificacion,
  PlantillaNotificacion & {
    prioridad: PrioridadNotificacion;
    canales: CanalNotificacion[];
  }
> = {
  [TipoNotificacion.PAGO_APROBADO]: {
    titulo: '¡Pago aprobado exitosamente!',
    mensaje:
      'Tu pago de {{monto}} {{moneda}} ha sido aprobado. Tu pedido #{{numeroPedido}} está siendo procesado.',
    prioridad: PrioridadNotificacion.ALTA,
    canales: [CanalNotificacion.EMAIL, CanalNotificacion.IN_APP],
    templateEmail: `
      <h2>🎉 ¡Pago Aprobado!</h2>
      <p>Hola {{nombreCompleto}},</p>
      <p>Te confirmamos que tu pago ha sido <strong>aprobado exitosamente</strong>.</p>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>📄 Detalles del Pago</h3>
        <ul>
          <li><strong>Monto:</strong> {{monto}} {{moneda}}</li>
          <li><strong>Pedido:</strong> #{{numeroPedido}}</li>
          <li><strong>Método de pago:</strong> {{metodoPago}} ****{{ultimosCuatroDigitos}}</li>
          <li><strong>Fecha:</strong> {{fechaPago}}</li>
        </ul>
      </div>
      
      <p>Tu pedido está siendo procesado y te notificaremos cuando esté listo para envío.</p>
      <p>¡Gracias por tu compra!</p>
    `,
    templateSMS:
      'DELA: Tu pago de {{monto}} {{moneda}} fue aprobado. Pedido #{{numeroPedido}} en proceso. ¡Gracias!',
  },

  [TipoNotificacion.PAGO_PENDIENTE]: {
    titulo: 'Pago pendiente de confirmación',
    mensaje:
      'Tu pago de {{monto}} {{moneda}} está pendiente. Te notificaremos cuando se confirme.',
    prioridad: PrioridadNotificacion.NORMAL,
    canales: [CanalNotificacion.EMAIL, CanalNotificacion.IN_APP],
    templateEmail: `
      <h2>⏳ Pago Pendiente</h2>
      <p>Hola {{nombreCompleto}},</p>
      <p>Tu pago está <strong>pendiente de confirmación</strong>.</p>
      
      <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
        <h3>⚠️ Estado del Pago</h3>
        <ul>
          <li><strong>Monto:</strong> {{monto}} {{moneda}}</li>
          <li><strong>Pedido:</strong> #{{numeroPedido}}</li>
          <li><strong>Estado:</strong> Pendiente de procesamiento</li>
        </ul>
      </div>
      
      <p>Esto puede deberse a:</p>
      <ul>
        <li>Validación bancaria en proceso</li>
        <li>Verificación de seguridad adicional</li>
        <li>Proceso de autorización del banco</li>
      </ul>
      
      <p>Te notificaremos tan pronto como se confirme el pago. No es necesario realizar ninguna acción adicional.</p>
    `,
    templateSMS:
      'DELA: Tu pago de {{monto}} {{moneda}} está pendiente. Te avisaremos cuando se confirme. Pedido #{{numeroPedido}}',
  },

  [TipoNotificacion.PAGO_VALIDACION_REQUERIDA]: {
    titulo: 'Se requiere validación para autorizar el pago',
    mensaje:
      'Tu pago requiere validación adicional. Revisa tu banco o contacta soporte.',
    prioridad: PrioridadNotificacion.ALTA,
    canales: [
      CanalNotificacion.EMAIL,
      CanalNotificacion.IN_APP,
      CanalNotificacion.SMS,
    ],
    templateEmail: `
      <h2>🔐 Validación Requerida</h2>
      <p>Hola {{nombreCompleto}},</p>
      <p>Tu pago requiere <strong>validación adicional</strong> para ser autorizado.</p>
      
      <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
        <h3>📋 Detalles del Pago</h3>
        <ul>
          <li><strong>Monto:</strong> {{monto}} {{moneda}}</li>
          <li><strong>Pedido:</strong> #{{numeroPedido}}</li>
          <li><strong>Estado:</strong> Requiere validación</li>
        </ul>
      </div>
      
      <h3>¿Qué puedes hacer?</h3>
      <ul>
        <li>Revisa tu aplicación bancaria por notificaciones de autorización</li>
        <li>Verifica tu correo electrónico del banco</li>
        <li>Contacta directamente con tu banco si es necesario</li>
        <li>O intenta realizar el pago nuevamente</li>
      </ul>
      
      <p>Si necesitas ayuda, no dudes en contactar nuestro soporte.</p>
    `,
    templateSMS:
      'DELA: Tu pago requiere validación adicional. Revisa tu banco o intenta nuevamente. Pedido #{{numeroPedido}}',
  },

  [TipoNotificacion.PAGO_FONDOS_INSUFICIENTES]: {
    titulo: 'Fondos insuficientes para procesar el pago',
    mensaje:
      'El pago fue rechazado por fondos insuficientes. Verifica el saldo de tu tarjeta.',
    prioridad: PrioridadNotificacion.ALTA,
    canales: [CanalNotificacion.EMAIL, CanalNotificacion.IN_APP],
    templateEmail: `
      <h2>💳 Fondos Insuficientes</h2>
      <p>Hola {{nombreCompleto}},</p>
      <p>No pudimos procesar tu pago debido a <strong>fondos insuficientes</strong>.</p>
      
      <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
        <h3>❌ Pago Rechazado</h3>
        <ul>
          <li><strong>Monto:</strong> {{monto}} {{moneda}}</li>
          <li><strong>Pedido:</strong> #{{numeroPedido}}</li>
          <li><strong>Motivo:</strong> Fondos insuficientes</li>
        </ul>
      </div>
      
      <h3>¿Cómo solucionarlo?</h3>
      <ul>
        <li>Verifica el saldo disponible en tu tarjeta</li>
        <li>Considera usar una tarjeta diferente</li>
        <li>Prueba otro método de pago</li>
        <li>Contacta tu banco para aumentar el límite</li>
      </ul>
      
      <p><a href="/checkout" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Intentar Nuevamente</a></p>
    `,
    templateSMS:
      'DELA: Pago rechazado por fondos insuficientes. Verifica saldo y prueba nuevamente. Pedido #{{numeroPedido}}',
  },

  [TipoNotificacion.PAGO_CODIGO_SEGURIDAD_INVALIDO]: {
    titulo: 'Código de seguridad inválido',
    mensaje:
      'El código de seguridad de tu tarjeta es incorrecto. Verifica e intenta nuevamente.',
    prioridad: PrioridadNotificacion.ALTA,
    canales: [CanalNotificacion.EMAIL, CanalNotificacion.IN_APP],
    templateEmail: `
      <h2>🔒 Código de Seguridad Inválido</h2>
      <p>Hola {{nombreCompleto}},</p>
      <p>Tu pago fue rechazado debido a un <strong>código de seguridad inválido</strong>.</p>
      
      <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
        <h3>❌ Error de Seguridad</h3>
        <ul>
          <li><strong>Monto:</strong> {{monto}} {{moneda}}</li>
          <li><strong>Pedido:</strong> #{{numeroPedido}}</li>
          <li><strong>Problema:</strong> CVV/CVC incorrecto</li>
        </ul>
      </div>
      
      <h3>¿Cómo solucionarlo?</h3>
      <ul>
        <li>Verifica el código CVV/CVC en el reverso de tu tarjeta</li>
        <li>Asegúrate de ingresar los 3 o 4 dígitos correctos</li>
        <li>Si continúa fallando, intenta con otra tarjeta</li>
      </ul>
      
      <p><a href="/checkout" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Intentar Nuevamente</a></p>
    `,
    templateSMS:
      'DELA: Código de seguridad incorrecto. Verifica CVV/CVC e intenta nuevamente. Pedido #{{numeroPedido}}',
  },

  [TipoNotificacion.PAGO_ERROR_FORMULARIO]: {
    titulo: 'Error en los datos del formulario',
    mensaje:
      'Hay errores en los datos proporcionados. Verifica la información e intenta nuevamente.',
    prioridad: PrioridadNotificacion.NORMAL,
    canales: [CanalNotificacion.IN_APP, CanalNotificacion.EMAIL],
    templateEmail: `
      <h2>📝 Error en Formulario</h2>
      <p>Hola {{nombreCompleto}},</p>
      <p>Detectamos <strong>errores en los datos</strong> proporcionados para el pago.</p>
      
      <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
        <h3>⚠️ Datos Incorrectos</h3>
        <ul>
          <li><strong>Monto:</strong> {{monto}} {{moneda}}</li>
          <li><strong>Pedido:</strong> #{{numeroPedido}}</li>
          <li><strong>Problema:</strong> Información del formulario inválida</li>
        </ul>
      </div>
      
      <h3>Verifica estos datos:</h3>
      <ul>
        <li>Número de tarjeta completo y correcto</li>
        <li>Fecha de vencimiento (MM/AA)</li>
        <li>Nombre exacto como aparece en la tarjeta</li>
        <li>Documento de identidad válido</li>
      </ul>
      
      <p><a href="/checkout" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Corregir Datos</a></p>
    `,
    templateSMS:
      'DELA: Error en datos del pago. Verifica la información e intenta nuevamente. Pedido #{{numeroPedido}}',
  },

  [TipoNotificacion.PAGO_EXPIRADO]: {
    titulo: 'Pago vencido',
    mensaje:
      'El pago ha vencido por límite de tiempo. Puedes intentar realizar un nuevo pago.',
    prioridad: PrioridadNotificacion.NORMAL,
    canales: [CanalNotificacion.EMAIL, CanalNotificacion.IN_APP],
    templateEmail: `
      <h2>⏰ Pago Vencido</h2>
      <p>Hola {{nombreCompleto}},</p>
      <p>Tu pago ha <strong>vencido</strong> debido al límite de tiempo de procesamiento.</p>
      
      <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
        <h3>⌛ Tiempo Agotado</h3>
        <ul>
          <li><strong>Monto:</strong> {{monto}} {{moneda}}</li>
          <li><strong>Pedido:</strong> #{{numeroPedido}}</li>
          <li><strong>Estado:</strong> Vencido</li>
        </ul>
      </div>
      
      <p>No te preocupes, puedes realizar un nuevo pago cuando gustes.</p>
      <p>Tu carrito de compras se mantiene guardado para tu comodidad.</p>
      
      <p><a href="/checkout" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Realizar Nuevo Pago</a></p>
    `,
    templateSMS:
      'DELA: Pago vencido por tiempo límite. Puedes realizar un nuevo pago cuando gustes. Pedido #{{numeroPedido}}',
  },

  [TipoNotificacion.PAGO_RECHAZADO]: {
    titulo: 'Pago rechazado',
    mensaje:
      'Tu pago fue rechazado. Intenta con otro método de pago o contacta tu banco.',
    prioridad: PrioridadNotificacion.ALTA,
    canales: [CanalNotificacion.EMAIL, CanalNotificacion.IN_APP],
    templateEmail: `
      <h2>❌ Pago Rechazado</h2>
      <p>Hola {{nombreCompleto}},</p>
      <p>Lamentamos informarte que tu pago fue <strong>rechazado</strong>.</p>
      
      <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
        <h3>🚫 Pago No Procesado</h3>
        <ul>
          <li><strong>Monto:</strong> {{monto}} {{moneda}}</li>
          <li><strong>Pedido:</strong> #{{numeroPedido}}</li>
          <li><strong>Estado:</strong> Rechazado</li>
        </ul>
      </div>
      
      <h3>¿Qué hacer ahora?</h3>
      <ul>
        <li>Intenta con una tarjeta diferente</li>
        <li>Verifica que tu tarjeta esté habilitada para compras online</li>
        <li>Contacta tu banco para verificar restricciones</li>
        <li>Prueba otro método de pago</li>
      </ul>
      
      <p><a href="/checkout" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Intentar Nuevamente</a></p>
    `,
    templateSMS:
      'DELA: Pago rechazado. Intenta con otra tarjeta o método de pago. Pedido #{{numeroPedido}}',
  },

  [TipoNotificacion.PAGO_CANCELADO]: {
    titulo: 'Pago cancelado',
    mensaje: 'El pago fue cancelado. Puedes intentar nuevamente cuando desees.',
    prioridad: PrioridadNotificacion.NORMAL,
    canales: [CanalNotificacion.EMAIL, CanalNotificacion.IN_APP],
    templateEmail: `
      <h2>🚫 Pago Cancelado</h2>
      <p>Hola {{nombreCompleto}},</p>
      <p>Tu pago ha sido <strong>cancelado</strong>.</p>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6c757d;">
        <h3>⭕ Pago Cancelado</h3>
        <ul>
          <li><strong>Monto:</strong> {{monto}} {{moneda}}</li>
          <li><strong>Pedido:</strong> #{{numeroPedido}}</li>
          <li><strong>Estado:</strong> Cancelado</li>
        </ul>
      </div>
      
      <p>No se realizó ningún cargo a tu tarjeta.</p>
      <p>Puedes realizar un nuevo pago cuando lo desees.</p>
      
      <p><a href="/checkout" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Realizar Nuevo Pago</a></p>
    `,
    templateSMS:
      'DELA: Pago cancelado. No se realizó cargo. Puedes pagar nuevamente cuando gustes. Pedido #{{numeroPedido}}',
  },

  [TipoNotificacion.PAGO_REEMBOLSADO]: {
    titulo: 'Pago reembolsado',
    mensaje:
      'Tu pago ha sido reembolsado exitosamente. El dinero será devuelto a tu cuenta.',
    prioridad: PrioridadNotificacion.ALTA,
    canales: [
      CanalNotificacion.EMAIL,
      CanalNotificacion.IN_APP,
      CanalNotificacion.SMS,
    ],
    templateEmail: `
      <h2>💰 Reembolso Procesado</h2>
      <p>Hola {{nombreCompleto}},</p>
      <p>Tu pago ha sido <strong>reembolsado exitosamente</strong>.</p>
      
      <div style="background: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
        <h3>💸 Detalles del Reembolso</h3>
        <ul>
          <li><strong>Monto reembolsado:</strong> {{monto}} {{moneda}}</li>
          <li><strong>Pedido:</strong> #{{numeroPedido}}</li>
          <li><strong>Método original:</strong> {{metodoPago}} ****{{ultimosCuatroDigitos}}</li>
        </ul>
      </div>
      
      <p><strong>Tiempo de procesamiento:</strong></p>
      <ul>
        <li>Tarjetas de crédito: 5-10 días hábiles</li>
        <li>Tarjetas de débito: 1-3 días hábiles</li>
      </ul>
      
      <p>El reembolso aparecerá en tu estado de cuenta con la referencia del pedido.</p>
    `,
    templateSMS:
      'DELA: Reembolso procesado de {{monto}} {{moneda}}. Aparecerá en tu cuenta en 1-10 días hábiles. Pedido #{{numeroPedido}}',
  },

  [TipoNotificacion.PEDIDO_CONFIRMADO]: {
    titulo: '✅ Pedido confirmado',
    mensaje:
      'Tu pedido #{{numeroPedido}} ha sido confirmado y está siendo preparado para envío.',
    prioridad: PrioridadNotificacion.ALTA,
    canales: [CanalNotificacion.EMAIL, CanalNotificacion.IN_APP],
    templateEmail: `
      <h2>📦 Pedido Confirmado</h2>
      <p>Hola {{nombreCompleto}},</p>
      <p>¡Excelentes noticias! Tu pedido ha sido <strong>confirmado</strong> y está siendo preparado.</p>
      
      <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
        <h3>✅ Pedido en Proceso</h3>
        <ul>
          <li><strong>Número de pedido:</strong> #{{numeroPedido}}</li>
          <li><strong>Total pagado:</strong> {{monto}} {{moneda}}</li>
          <li><strong>Estado:</strong> Confirmado</li>
        </ul>
      </div>
      
      <p>Próximos pasos:</p>
      <ol>
        <li>Preparación del pedido (24-48 horas)</li>
        <li>Envío y tracking</li>
        <li>Entrega en tu dirección</li>
      </ol>
      
      <p>Te mantendremos informado sobre el progreso de tu pedido.</p>
    `,
    templateSMS:
      'DELA: Pedido #{{numeroPedido}} confirmado y en preparación. Te avisaremos cuando esté listo para envío.',
  },

  [TipoNotificacion.PEDIDO_PROCESANDO]: {
    titulo: 'Pedido en procesamiento',
    mensaje:
      'Tu pedido #{{numeroPedido}} está siendo procesado. Te notificaremos sobre su progreso.',
    prioridad: PrioridadNotificacion.NORMAL,
    canales: [CanalNotificacion.IN_APP],
    templateEmail: `
      <h2>⚙️ Pedido en Procesamiento</h2>
      <p>Hola {{nombreCompleto}},</p>
      <p>Tu pedido está siendo <strong>procesado</strong> por nuestro equipo.</p>
      
      <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
        <h3>⚙️ Estado Actual</h3>
        <ul>
          <li><strong>Número de pedido:</strong> #{{numeroPedido}}</li>
          <li><strong>Estado:</strong> En procesamiento</li>
        </ul>
      </div>
      
      <p>Estamos verificando el inventario y preparando tu pedido para envío.</p>
      <p>Te notificaremos tan pronto como tengamos actualizaciones.</p>
    `,
    templateSMS:
      'DELA: Pedido #{{numeroPedido}} en procesamiento. Te avisaremos cuando esté listo.',
  },

  [TipoNotificacion.NEWSLETTER_SUSCRIPCION]: {
    titulo: '¡Bienvenido a nuestro Newsletter!',
    mensaje:
      'Te has suscrito exitosamente a nuestro newsletter. Recibirás noticias y ofertas exclusivas.',
    prioridad: PrioridadNotificacion.NORMAL,
    canales: [CanalNotificacion.EMAIL],
    templateEmail: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="background: linear-gradient(135deg, #CC9F53 0%, #B8903D 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">
            ¡Bienvenido a DELA! 🎉
          </h1>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
          <h2 style="color: #CC9F53; margin-top: 0;">¡Gracias por suscribirte!</h2>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            Hola {{nombreCompleto | email}},
          </p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            Te has suscrito exitosamente a nuestro newsletter. Ahora recibirás:
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <ul style="margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">📧 Noticias sobre nuevos productos</li>
              <li style="margin-bottom: 8px;">🎯 Ofertas y descuentos exclusivos</li>
              <li style="margin-bottom: 8px;">📱 Actualizaciones de la plataforma</li>
              <li style="margin-bottom: 8px;">💡 Tips y consejos</li>
            </ul>
          </div>
          
          <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
            <p style="margin: 0; color: #2e7d32;">
              <strong>✅ Suscripción confirmada</strong><br>
              Email: {{email}}<br>
              Fecha: {{fechaAccion}}
            </p>
          </div>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            Puedes cancelar tu suscripción en cualquier momento desde tu perfil de usuario.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
               style="background: #CC9F53; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Visitar DELA
            </a>
          </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
          <p style="margin: 0; font-size: 14px; color: #666;">
            © 2025 DELA. Todos los derechos reservados.<br>
            <a href="#" style="color: #CC9F53; text-decoration: none;">Términos y Condiciones</a> | 
            <a href="#" style="color: #CC9F53; text-decoration: none;">Política de Privacidad</a>
          </p>
        </div>
      </div>
    `,
    templateSMS:
      'DELA: ¡Bienvenido! Te has suscrito al newsletter. Recibirás ofertas exclusivas.',
  },

  [TipoNotificacion.NEWSLETTER_DESUSCRIPCION]: {
    titulo: 'Has cancelado tu suscripción al newsletter',
    mensaje: 'Tu suscripción al newsletter ha sido cancelada exitosamente.',
    prioridad: PrioridadNotificacion.NORMAL,
    canales: [CanalNotificacion.EMAIL],
    templateEmail: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">
            Hasta pronto 👋
          </h1>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
          <h2 style="color: #6b7280; margin-top: 0;">Suscripción cancelada</h2>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            Hola {{nombreCompleto | email}},
          </p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            Has cancelado tu suscripción a nuestro newsletter exitosamente.
          </p>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0; color: #856404;">
              <strong>ℹ️ Confirmación de cancelación</strong><br>
              Email: {{email}}<br>
              Fecha: {{fechaAccion}}
            </p>
          </div>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            Ya no recibirás emails promocionales de nuestra parte. Sin embargo, seguirás recibiendo:
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <ul style="margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">📧 Confirmaciones de pedidos</li>
              <li style="margin-bottom: 8px;">📦 Actualizaciones de envíos</li>
              <li style="margin-bottom: 8px;">🔐 Notificaciones de seguridad</li>
              <li style="margin-bottom: 8px;">💬 Respuestas a tus consultas</li>
            </ul>
          </div>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            Si cambiaste de opinión, puedes volver a suscribirte en cualquier momento desde tu perfil de usuario.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/perfil" 
               style="background: #CC9F53; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Volver a suscribirme
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; text-align: center;">
            ¡Esperamos verte pronto de nuevo!
          </p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
          <p style="margin: 0; font-size: 14px; color: #666;">
            © 2025 DELA. Todos los derechos reservados.<br>
            <a href="#" style="color: #CC9F53; text-decoration: none;">Términos y Condiciones</a> | 
            <a href="#" style="color: #CC9F53; text-decoration: none;">Política de Privacidad</a>
          </p>
        </div>
      </div>
    `,
    templateSMS:
      'DELA: Tu suscripción al newsletter ha sido cancelada. Puedes volver a suscribirte cuando quieras.',
  },
};
