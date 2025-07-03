import { Injectable, Logger } from '@nestjs/common';
import {
  TipoNotificacion,
  CanalNotificacion,
  DatosNotificacion,
  ContextoPago,
  ESTADO_A_NOTIFICACION_MAP,
} from '../types/notificacion.types';
import { PLANTILLAS_NOTIFICACION } from '../templates/plantillas-notificacion';
import { EmailService } from './email.service';

@Injectable()
export class NotificacionService {
  private readonly logger = new Logger(NotificacionService.name);

  constructor(private readonly emailService: EmailService) {}

  /**
   * Enviar notificación basada en el estado de pago de MercadoPago
   */
  async enviarNotificacionPorEstado(
    estadoMercadoPago: string,
    contexto: ContextoPago
  ): Promise<boolean> {
    try {
      // Mapear estado de MercadoPago a tipo de notificación
      const tipoNotificacion = ESTADO_A_NOTIFICACION_MAP[estadoMercadoPago];

      if (!tipoNotificacion) {
        this.logger.warn(
          `No hay notificación definida para estado: ${estadoMercadoPago}`
        );
        return false;
      }

      return await this.enviarNotificacion(tipoNotificacion, contexto);
    } catch (error) {
      this.logger.error('Error enviando notificación por estado:', error);
      return false;
    }
  }

  /**
   * Enviar notificación específica
   */
  async enviarNotificacion(
    tipo: TipoNotificacion,
    contexto: ContextoPago
  ): Promise<boolean> {
    try {
      const plantilla = PLANTILLAS_NOTIFICACION[tipo];

      if (!plantilla) {
        this.logger.error(`No se encontró plantilla para tipo: ${tipo}`);
        return false;
      }

      const datosNotificacion = this.construirDatosNotificacion(
        tipo,
        plantilla,
        contexto
      );

      // Log de la notificación que se va a enviar
      this.logger.log(`📧 Enviando notificación: ${datosNotificacion.titulo}`);
      this.logger.log(`📋 Tipo: ${tipo}`);
      this.logger.log(
        `👤 Usuario: ${contexto.usuario.nombres} ${contexto.usuario.apellidos}`
      );
      this.logger.log(`📊 Pedido: #${contexto.numeroPedido}`);
      this.logger.log(`💰 Monto: ${contexto.monto} ${contexto.moneda}`);

      // Enviar por cada canal configurado
      const resultados = await Promise.allSettled(
        plantilla.canales.map((canal) =>
          this.enviarPorCanal(canal, datosNotificacion)
        )
      );

      // Verificar resultados
      const exitosos = resultados.filter(
        (r) => r.status === 'fulfilled'
      ).length;
      const fallidos = resultados.filter((r) => r.status === 'rejected').length;

      this.logger.log(
        `✅ Notificaciones enviadas: ${exitosos}/${resultados.length}`
      );

      if (fallidos > 0) {
        this.logger.warn(
          `⚠️ Notificaciones fallidas: ${fallidos}/${resultados.length}`
        );
      }

      return exitosos > 0; // Considerar exitoso si al menos un canal funcionó
    } catch (error) {
      this.logger.error('Error enviando notificación:', error);
      return false;
    }
  }

  /**
   * Construir datos de notificación con plantilla procesada
   */
  private construirDatosNotificacion(
    tipo: TipoNotificacion,
    plantilla: (typeof PLANTILLAS_NOTIFICACION)[TipoNotificacion],
    contexto: ContextoPago
  ): DatosNotificacion {
    const variables = this.construirVariablesPlantilla(contexto);

    return {
      tipo,
      titulo: this.procesarPlantilla(plantilla.titulo, variables),
      mensaje: this.procesarPlantilla(plantilla.mensaje, variables),
      canales: plantilla.canales,
      prioridad: plantilla.prioridad,
      contexto,
      metadatos: {
        templateEmail: plantilla.templateEmail
          ? this.procesarPlantilla(plantilla.templateEmail, variables)
          : undefined,
        templateSMS: plantilla.templateSMS
          ? this.procesarPlantilla(plantilla.templateSMS, variables)
          : undefined,
      },
    };
  }

  /**
   * Construir variables para reemplazar en plantillas
   */
  private construirVariablesPlantilla(
    contexto: ContextoPago
  ): Record<string, string> {
    return {
      // Datos del usuario
      nombreCompleto: `${contexto.usuario.nombres} ${contexto.usuario.apellidos}`,
      nombres: contexto.usuario.nombres,
      apellidos: contexto.usuario.apellidos,
      email: contexto.usuario.email,

      // Datos del pago
      monto: contexto.monto.toFixed(2),
      moneda: contexto.moneda,
      metodoPago: contexto.metodoPago || 'Tarjeta',
      ultimosCuatroDigitos: contexto.ultimosCuatroDigitos || '****',
      fechaPago: contexto.fechaPago
        ? this.formatearFecha(contexto.fechaPago)
        : 'Pendiente',

      // Datos del pedido
      numeroPedido: contexto.numeroPedido,
      pedidoId: contexto.pedidoId.toString(),

      // Datos técnicos
      pagoId: contexto.pagoId.toString(),
      mercadopagoId: contexto.mercadopagoId || '',
    };
  }

  /**
   * Procesar plantilla reemplazando variables
   */
  private procesarPlantilla(
    plantilla: string,
    variables: Record<string, string>
  ): string {
    let resultado = plantilla;

    Object.entries(variables).forEach(([clave, valor]) => {
      const regex = new RegExp(`{{${clave}}}`, 'g');
      resultado = resultado.replace(regex, valor);
    });

    return resultado;
  }

  /**
   * Enviar notificación por canal específico
   */
  private async enviarPorCanal(
    canal: CanalNotificacion,
    datos: DatosNotificacion
  ): Promise<boolean> {
    try {
      switch (canal) {
        case CanalNotificacion.EMAIL:
          return await this.enviarEmail(datos);

        case CanalNotificacion.SMS:
          return await this.enviarSMS(datos);

        case CanalNotificacion.PUSH:
          return await this.enviarPush(datos);

        case CanalNotificacion.IN_APP:
          return await this.enviarInApp(datos);

        default:
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          this.logger.warn(`Canal no implementado: ${canal}`);
          return false;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Error enviando por canal ${String(canal)}: ${errorMessage}`
      );
      return false;
    }
  }

  /**
   * Enviar notificación por email
   */
  private async enviarEmail(datos: DatosNotificacion): Promise<boolean> {
    try {
      // Verificar si el EmailService está configurado
      if (!this.emailService.isConfigured()) {
        this.logger.warn(
          '📧 EmailService no configurado - usando modo simulación'
        );
        // Mantener el comportamiento anterior como fallback
        this.logger.log(`📧 EMAIL enviado a: ${datos.contexto.usuario.email}`);
        this.logger.log(`📧 Asunto: ${datos.titulo}`);
        await new Promise((resolve) => setTimeout(resolve, 100)); // Simular latencia
        this.logger.log('📧 ✅ Email enviado exitosamente (simulado)');
        return true;
      }

      // Usar Resend para casos de pago exitoso
      if (datos.tipo === TipoNotificacion.PAGO_APROBADO) {
        this.logger.log(`📧 Enviando email de confirmación de pago con Resend`);
        return await this.emailService.enviarConfirmacionPago(datos.contexto);
      }

      // Para otros tipos de notificación, usar el email genérico de Resend
      const emailEnviado = await this.emailService.enviarEmail({
        to: datos.contexto.usuario.email,
        subject: datos.titulo,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">${datos.titulo}</h2>
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              ${datos.mensaje.replace(/\n/g, '<br>')}
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 14px;">
              Este email fue enviado a ${datos.contexto.usuario.email}<br>
              © ${new Date().getFullYear()} DELA. Todos los derechos reservados.
            </p>
          </div>
        `,
      });

      return emailEnviado;
    } catch (error) {
      this.logger.error('Error enviando email:', error);
      return false;
    }
  }

  /**
   * Enviar notificación por SMS
   */
  private async enviarSMS(datos: DatosNotificacion): Promise<boolean> {
    try {
      const celular = datos.contexto.usuario.celular;

      if (!celular) {
        this.logger.log('📱 SMS no enviado: usuario sin celular');
        return false;
      }

      this.logger.log(`📱 SMS enviado a: ${celular}`);
      this.logger.log(
        `📱 Mensaje: ${datos.metadatos?.templateSMS || datos.mensaje}`
      );

      // Aquí iría la integración real con servicio de SMS
      // Por ejemplo: Twilio, AWS SNS, etc.

      // SIMULACIÓN - en producción implementar servicio real
      await new Promise((resolve) => setTimeout(resolve, 150)); // Simular latencia
      this.logger.log('📱 ✅ SMS enviado exitosamente (simulado)');

      return true;
    } catch (error) {
      this.logger.error('Error enviando SMS:', error);
      return false;
    }
  }

  /**
   * Enviar notificación push
   */
  private async enviarPush(datos: DatosNotificacion): Promise<boolean> {
    try {
      this.logger.log(
        `🔔 PUSH enviado a usuario: ${datos.contexto.usuario.id}`
      );
      this.logger.log(`🔔 Título: ${datos.titulo}`);

      // Aquí iría la integración real con servicio de push notifications
      // Por ejemplo: Firebase Cloud Messaging (FCM), Apple Push Notification Service (APNs), etc.

      // SIMULACIÓN - en producción implementar servicio real
      await new Promise((resolve) => setTimeout(resolve, 200)); // Simular latencia
      this.logger.log(
        '🔔 ✅ Push notification enviada exitosamente (simulado)'
      );

      return true;
    } catch (error) {
      this.logger.error('Error enviando push notification:', error);
      return false;
    }
  }

  /**
   * Enviar notificación in-app
   */
  private async enviarInApp(datos: DatosNotificacion): Promise<boolean> {
    try {
      this.logger.log(
        `📱 IN-APP enviado a usuario: ${datos.contexto.usuario.id}`
      );
      this.logger.log(`📱 Notificación: ${datos.mensaje}`);

      // Aquí se podría guardar en base de datos para mostrar en la aplicación
      // O enviar via WebSocket para notificaciones en tiempo real

      // SIMULACIÓN - en producción implementar almacenamiento real
      await new Promise((resolve) => setTimeout(resolve, 50)); // Simular latencia
      this.logger.log(
        '📱 ✅ Notificación in-app guardada exitosamente (simulado)'
      );

      return true;
    } catch (error) {
      this.logger.error('Error enviando notificación in-app:', error);
      return false;
    }
  }

  /**
   * Formatear fecha para mostrar
   */
  private formatearFecha(fecha: Date): string {
    return fecha.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Obtener descripción amigable del estado para logs
   */
  getDescripcionEstado(estado: string): string {
    const descripciones: Record<string, string> = {
      APRO: '✅ Pago aprobado',
      OTHE: '❌ Rechazado por error general',
      CONT: '⏳ Pendiente de pago',
      CALL: '🔐 Rechazado con validación para autorizar',
      FUND: '💳 Rechazado por importe insuficiente',
      SECU: '🔒 Rechazado por código de seguridad inválido',
      EXPI: '⏰ Rechazado debido a problema de fecha de vencimiento',
      FORM: '📝 Rechazado debido a error de formulario',
      approved: '✅ Pago aprobado',
      accredited: '✅ Pago acreditado', // ← AGREGADO
      pending: '⏳ Pago pendiente',
      rejected: '❌ Pago rechazado',
      cancelled: '🚫 Pago cancelado',
      refunded: '💰 Pago reembolsado',
    };

    return descripciones[estado] || `❓ Estado desconocido: ${estado}`;
  }
}
