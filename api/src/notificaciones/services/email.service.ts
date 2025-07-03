import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { ContextoPago } from '../types/notificacion.types';

export interface EmailData {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private fromEmail: string;
  private isEnabled: boolean;

  constructor(private configService: ConfigService) {
    const emailHost = this.configService.get<string>('EMAIL_HOST');
    const emailPort = this.configService.get<number>('EMAIL_PORT') || 587;
    const emailUser = this.configService.get<string>('EMAIL_USER');
    const emailPass = this.configService.get<string>('EMAIL_PASS');

    this.fromEmail =
      this.configService.get<string>('EMAIL_FROM') || 'DELA <noreply@dela.com>';

    this.isEnabled = !!(emailHost && emailUser && emailPass);

    if (this.isEnabled) {
      this.transporter = nodemailer.createTransport({
        host: emailHost,
        port: emailPort,
        secure: emailPort === 465, // true para 465, false para otros puertos
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });

      this.logger.log('✅ Nodemailer configurado correctamente');
      void this.verificarConexion();
    } else {
      this.logger.warn(
        '⚠️ Email no configurado - Faltan variables: EMAIL_HOST, EMAIL_USER, EMAIL_PASS'
      );
    }
  }

  /**
   * Verificar conexión SMTP
   */
  private async verificarConexion() {
    try {
      await this.transporter.verify();
      this.logger.log('✅ Conexión SMTP verificada exitosamente');
    } catch (error) {
      this.logger.error('❌ Error verificando conexión SMTP:', error);
    }
  }

  /**
   * Enviar email genérico
   */
  async enviarEmail(data: EmailData): Promise<boolean> {
    if (!this.isEnabled) {
      this.logger.warn('📧 Email no enviado - Nodemailer no configurado');
      return false;
    }

    try {
      const mailOptions = {
        from: this.fromEmail,
        to: data.to,
        subject: data.subject,
        html: data.html,
      };

      const result = (await this.transporter.sendMail(mailOptions)) as {
        messageId: string;
      };

      this.logger.log(
        `✅ Email enviado exitosamente a ${data.to} - MessageID: ${result.messageId}`
      );
      return true;
    } catch (error) {
      this.logger.error('❌ Error enviando email:', error);
      return false;
    }
  }

  /**
   * Enviar email de confirmación de pago
   */
  async enviarConfirmacionPago(contexto: ContextoPago): Promise<boolean> {
    if (!this.isEnabled) {
      this.logger.warn(
        '📧 Email de confirmación no enviado - Nodemailer no configurado'
      );
      return false;
    }

    const htmlContent = this.generarHtmlConfirmacionPago(contexto);

    return this.enviarEmail({
      to: contexto.usuario.email,
      subject: `🎉 ¡Pago confirmado! Tu pedido #${contexto.numeroPedido} está listo - DELA`,
      html: htmlContent,
    });
  }

  /**
   * Generar HTML para email de confirmación de pago
   */
  private generarHtmlConfirmacionPago(contexto: ContextoPago): string {
    const fechaPago = contexto.fechaPago
      ? this.formatearFecha(contexto.fechaPago)
      : 'Procesando...';

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmación de Pago - DELA</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8f9fa;
            }
            .container {
                background: linear-gradient(135deg, #ffffff, #fafbfc);
                border-radius: 20px;
                padding: 40px;
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
                border: 1px solid #e5e7eb;
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #f0f0f0;
                padding-bottom: 20px;
            }
            .success-icon {
                width: 80px;
                height: 80px;
                margin-bottom: 20px;
                display: inline-block;
                filter: drop-shadow(0 8px 25px rgba(16, 185, 129, 0.3));
            }
            .success-icon img {
                width: 100%;
                height: 100%;
                border-radius: 50%;
            }
            .title {
                color: #1f2937;
                font-size: 32px;
                font-weight: 800;
                margin: 0 0 12px 0;
                background: linear-gradient(135deg, #1f2937, #374151);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            .subtitle {
                color: #6b7280;
                font-size: 16px;
                margin: 0;
            }
            .info-section {
                margin: 30px 0;
                padding: 25px;
                background: linear-gradient(135deg, #f8fafc, #f1f5f9);
                border-radius: 16px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            }
            .info-title {
                font-size: 18px;
                font-weight: 700;
                color: #1f2937;
                margin-bottom: 20px;
                padding-bottom: 8px;
                border-bottom: 2px solid #e2e8f0;
            }
            .info-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                padding: 12px 0;
                border-bottom: 1px solid #e5e7eb;
            }
            .info-row:last-child {
                border-bottom: none;
                margin-bottom: 0;
            }
            .info-label {
                color: #6b7280;
                font-size: 14px;
                font-weight: 500;
                min-width: 140px;
            }
            .info-value {
                color: #1f2937;
                font-weight: 600;
                font-size: 14px;
                text-align: right;
                flex: 1;
            }
            .total-amount {
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
                padding: 25px;
                border-radius: 16px;
                text-align: center;
                margin: 30px 0;
                box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
                border: 1px solid #059669;
            }
            .total-amount .amount {
                font-size: 36px;
                font-weight: 900;
                margin: 0;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .total-amount .label {
                font-size: 16px;
                opacity: 0.95;
                margin: 0;
                font-weight: 600;
            }
            .payment-method {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .card-info {
                background-color: #f3f4f6;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                color: #6b7280;
            }
            .status-badge {
                background-color: #10b981;
                color: white;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                color: #6b7280;
                font-size: 14px;
            }
            .footer-links {
                margin-top: 15px;
            }
            .footer-links a {
                color: #3b82f6;
                text-decoration: none;
                margin: 0 10px;
            }
            .footer-links a:hover {
                text-decoration: underline;
            }
            .logo {
                font-size: 32px;
                font-weight: 900;
                background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin-bottom: 15px;
                letter-spacing: 2px;
            }
            @media (max-width: 600px) {
                body {
                    padding: 10px;
                }
                .container {
                    padding: 25px 20px;
                }
                .info-row {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 8px;
                    padding: 15px 0;
                }
                .info-label {
                    min-width: auto;
                    font-weight: 600;
                    color: #374151;
                }
                .info-value {
                    text-align: left;
                    font-size: 15px;
                }
                .logo {
                    font-size: 28px;
                }
                .title {
                    font-size: 26px;
                }
                .success-icon {
                    width: 70px;
                    height: 70px;
                }
                .success-icon img {
                    width: 70px;
                    height: 70px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <div class="header">
                <div class="logo">DELA</div>
                <div class="success-icon">
                    <img src="https://res.cloudinary.com/duq4tqkmm/image/upload/v1751518350/green-check-mark-icon-in-round-shape-design-png_yharc9.webp" alt="Pago exitoso" />
                </div>
                <h1 class="title">¡Pago Exitoso!</h1>
                <p class="subtitle">Tu pedido ha sido confirmado y está siendo procesado</p>
            </div>

            <!-- Saludo personalizado -->
            <p style="font-size: 16px; margin-bottom: 10px;">Hola <strong>${contexto.usuario.nombres} ${contexto.usuario.apellidos}</strong>,</p>
            <p style="font-size: 16px; margin-bottom: 25px;">¡Excelentes noticias! 🎉 Tu pago ha sido procesado exitosamente y tu pedido está confirmado. A continuación tienes todos los detalles de tu compra:</p>

            <!-- Información del Pedido -->
            <div class="info-section">
                <div class="info-title">📦 Información del Pedido</div>
                <div class="info-row">
                    <span class="info-label">Número de pedido</span>
                    <span class="info-value">#${contexto.numeroPedido}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Fecha del pedido</span>
                    <span class="info-value">${fechaPago}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Estado</span>
                    <span class="status-badge">Confirmado</span>
                </div>
            </div>

            <!-- Información del Pago -->
            <div class="info-section">
                <div class="info-title">💳 Información del Pago</div>
                <div class="info-row">
                    <span class="info-label">Método de pago</span>
                    <div class="payment-method">
                        <span class="info-value">${contexto.metodoPago}</span>
                        ${contexto.ultimosCuatroDigitos ? `<span class="card-info">****${contexto.ultimosCuatroDigitos}</span>` : ''}
                    </div>
                </div>
                <div class="info-row">
                    <span class="info-label">ID de transacción</span>
                    <span class="info-value">${contexto.mercadopagoId}</span>
                </div>
            </div>

            <!-- Monto Total -->
            <div class="total-amount">
                <p class="label">Total Pagado</p>
                <p class="amount">${contexto.moneda} ${contexto.monto.toFixed(2)}</p>
            </div>

            <!-- Próximos pasos -->
            <div class="info-section">
                <div class="info-title">🚀 ¿Qué sigue?</div>
                <div style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                    ✅ <strong>Confirmación:</strong> Tu pedido ha sido recibido y confirmado<br><br>
                    📦 <strong>Preparación:</strong> Nuestro equipo comenzará a preparar tu pedido inmediatamente<br><br>
                    🚚 <strong>Entrega:</strong> Te notificaremos cuando tu pedido esté listo para entrega<br><br>
                    💬 <strong>Soporte:</strong> Si tienes alguna pregunta, contáctanos en cualquier momento
                </div>
            </div>

            <!-- Footer -->
            <div class="footer">
                <p style="font-size: 18px; font-weight: 600; color: #10b981; margin-bottom: 10px;">¡Gracias por elegirnos! 💚</p>
                <p style="margin-bottom: 20px;">Tu confianza es nuestra motivación. Si tienes alguna pregunta sobre tu pedido, estamos aquí para ayudarte.</p>
                
                <div class="footer-links">
                    <a href="mailto:aitorleonel2@gmail.com">📧 Soporte</a>
                    <a href="tel:+51-999-999-999">📞 Llámanos</a>
                    <a href="${contexto.usuario.email}">👤 Mi cuenta</a>
                </div>
                
                <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
                    Este email fue enviado a ${contexto.usuario.email}<br>
                    © ${new Date().getFullYear()} DELA. Todos los derechos reservados.
                </p>
            </div>
        </div>
    </body>
    </html>`;
  }

  /**
   * Formatear fecha para mostrar en email
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
   * Validar configuración de Nodemailer
   */
  isConfigured(): boolean {
    return this.isEnabled;
  }

  /**
   * Obtener información de configuración
   */
  getConfigInfo() {
    return {
      isEnabled: this.isEnabled,
      fromEmail: this.fromEmail,
      hasHost: !!this.configService.get<string>('EMAIL_HOST'),
      hasUser: !!this.configService.get<string>('EMAIL_USER'),
      hasPass: !!this.configService.get<string>('EMAIL_PASS'),
    };
  }

  /**
   * Enviar email de suscripción al newsletter
   */
  async enviarSuscripcionNewsletter(contexto: {
    email: string;
    fechaAccion: Date;
    usuario?: { nombres?: string; apellidos?: string };
  }): Promise<boolean> {
    if (!this.isEnabled) {
      this.logger.warn(
        '📧 Email de suscripción newsletter no enviado - Nodemailer no configurado'
      );
      return false;
    }

    try {
      const nombreCompleto = contexto.usuario
        ? `${contexto.usuario.nombres || ''} ${contexto.usuario.apellidos || ''}`.trim()
        : contexto.email;

      const html = this.generarPlantillaNewsletter('suscripcion', {
        email: contexto.email,
        nombreCompleto,
        fechaAccion: this.formatearFecha(contexto.fechaAccion),
      });

      const emailData: EmailData = {
        to: contexto.email,
        subject: '🎉 ¡Bienvenido al Newsletter de DELA!',
        html,
      };

      const enviado = await this.enviarEmail(emailData);

      if (enviado) {
        this.logger.log(
          `✅ Email de suscripción newsletter enviado a ${contexto.email}`
        );
      }

      return enviado;
    } catch (error) {
      this.logger.error(
        '❌ Error enviando email de suscripción newsletter:',
        error
      );
      return false;
    }
  }

  /**
   * Enviar email de desuscripción al newsletter
   */
  async enviarDesuscripcionNewsletter(contexto: {
    email: string;
    fechaAccion: Date;
    usuario?: { nombres?: string; apellidos?: string };
  }): Promise<boolean> {
    if (!this.isEnabled) {
      this.logger.warn(
        '📧 Email de desuscripción newsletter no enviado - Nodemailer no configurado'
      );
      return false;
    }

    try {
      const nombreCompleto = contexto.usuario
        ? `${contexto.usuario.nombres || ''} ${contexto.usuario.apellidos || ''}`.trim()
        : contexto.email;

      const html = this.generarPlantillaNewsletter('desuscripcion', {
        email: contexto.email,
        nombreCompleto,
        fechaAccion: this.formatearFecha(contexto.fechaAccion),
      });

      const emailData: EmailData = {
        to: contexto.email,
        subject: '👋 Suscripción cancelada - DELA Newsletter',
        html,
      };

      const enviado = await this.enviarEmail(emailData);

      if (enviado) {
        this.logger.log(
          `✅ Email de desuscripción newsletter enviado a ${contexto.email}`
        );
      }

      return enviado;
    } catch (error) {
      this.logger.error(
        '❌ Error enviando email de desuscripción newsletter:',
        error
      );
      return false;
    }
  }

  /**
   * Generar plantilla HTML para newsletter
   */
  private generarPlantillaNewsletter(
    tipo: 'suscripcion' | 'desuscripcion',
    variables: { email: string; nombreCompleto: string; fechaAccion: string }
  ): string {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    if (tipo === 'suscripcion') {
      return `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="background: linear-gradient(135deg, #CC9F53 0%, #B8903D 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">
              ¡Bienvenido a DELA! 🎉
            </h1>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
            <h2 style="color: #CC9F53; margin-top: 0;">¡Gracias por suscribirte!</h2>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Hola ${variables.nombreCompleto},
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
                Email: ${variables.email}<br>
                Fecha: ${variables.fechaAccion}
              </p>
            </div>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Puedes cancelar tu suscripción en cualquier momento desde tu perfil de usuario.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${frontendUrl}" 
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
      `;
    } else {
      return `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">
              Hasta pronto 👋
            </h1>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
            <h2 style="color: #6b7280; margin-top: 0;">Suscripción cancelada</h2>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Hola ${variables.nombreCompleto},
            </p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Has cancelado tu suscripción a nuestro newsletter exitosamente.
            </p>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <p style="margin: 0; color: #856404;">
                <strong>ℹ️ Confirmación de cancelación</strong><br>
                Email: ${variables.email}<br>
                Fecha: ${variables.fechaAccion}
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
              <a href="${frontendUrl}/perfil" 
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
      `;
    }
  }

  /**
   * Enviar email de recuperación de contraseña
   */
  async enviarRecuperacionContrasena(
    email: string,
    nombre: string,
    token: string
  ): Promise<boolean> {
    if (!this.isEnabled) {
      this.logger.warn(
        '📧 Email de recuperación no enviado - Nodemailer no configurado'
      );
      return false;
    }

    const htmlContent = this.generarHtmlRecuperacionContrasena(nombre, token);

    return this.enviarEmail({
      to: email,
      subject: '🔐 Recuperación de contraseña - DELA',
      html: htmlContent,
    });
  }

  /**
   * Generar HTML para email de recuperación de contraseña
   */
  private generarHtmlRecuperacionContrasena(
    nombre: string,
    token: string
  ): string {
    return `
      <div style="max-width: 600px; margin: 0 auto; font-family: 'Arial', sans-serif; line-height: 1.6; color: #333;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #CC9F53 0%, #D4C088 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">
            🔐 Recuperación de Contraseña
          </h1>
        </div>
        
        <!-- Content -->
        <div style="background: white; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none;">
          <p style="margin: 0 0 20px 0; font-size: 18px; color: #CC9F53; font-weight: bold;">
            Hola ${nombre},
          </p>
          
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #555;">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta en DELA.
          </p>
          
          <p style="margin: 0 0 30px 0; font-size: 16px; color: #555;">
            Tu código de verificación es:
          </p>
          
          <!-- Token Box -->
          <div style="background: #f8f9fa; border: 2px solid #CC9F53; border-radius: 10px; padding: 20px; text-align: center; margin: 30px 0;">
            <div style="font-size: 32px; font-weight: bold; color: #CC9F53; letter-spacing: 8px; font-family: 'Courier New', monospace;">
              ${token}
            </div>
          </div>
          
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #555;">
            Ingresa este código en la aplicación para crear tu nueva contraseña.
          </p>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #856404;">
              <strong>⚠️ Importante:</strong><br>
              • Este código expira en 15 minutos<br>
              • Si no solicitaste este cambio, ignora este email<br>
              • Por tu seguridad, nunca compartas este código
            </p>
          </div>
          
          <p style="margin: 30px 0 0 0; font-size: 14px; color: #666; text-align: center;">
            Si tienes problemas, contáctanos en nuestro centro de ayuda.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
          <p style="margin: 0; font-size: 14px; color: #666;">
            © 2025 DELA. Todos los derechos reservados.<br>
            <a href="#" style="color: #CC9F53; text-decoration: none;">Términos y Condiciones</a> | 
            <a href="#" style="color: #CC9F53; text-decoration: none;">Política de Privacidad</a>
          </p>
        </div>
      </div>
    `;
  }
}
