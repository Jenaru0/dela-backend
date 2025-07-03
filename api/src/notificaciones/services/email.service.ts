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
      subject: `¡Tu pago fue exitoso! - Pedido #${contexto.numeroPedido}`,
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
                background-color: white;
                border-radius: 12px;
                padding: 30px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #f0f0f0;
                padding-bottom: 20px;
            }
            .success-icon {
                background-color: #10b981;
                color: white;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                margin-bottom: 15px;
            }
            .title {
                color: #1f2937;
                font-size: 28px;
                font-weight: bold;
                margin: 0 0 8px 0;
            }
            .subtitle {
                color: #6b7280;
                font-size: 16px;
                margin: 0;
            }
            .info-section {
                margin: 25px 0;
                padding: 20px;
                background-color: #f9fafb;
                border-radius: 8px;
                border-left: 4px solid #3b82f6;
            }
            .info-title {
                font-size: 18px;
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 15px;
            }
            .info-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
                padding: 8px 0;
                border-bottom: 1px solid #e5e7eb;
            }
            .info-row:last-child {
                border-bottom: none;
                margin-bottom: 0;
            }
            .info-label {
                color: #6b7280;
                font-size: 14px;
            }
            .info-value {
                color: #1f2937;
                font-weight: 600;
                font-size: 14px;
            }
            .total-amount {
                background-color: #10b981;
                color: white;
                padding: 15px;
                border-radius: 8px;
                text-align: center;
                margin: 25px 0;
            }
            .total-amount .amount {
                font-size: 32px;
                font-weight: bold;
                margin: 0;
            }
            .total-amount .label {
                font-size: 14px;
                opacity: 0.9;
                margin: 0;
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
                font-size: 24px;
                font-weight: bold;
                color: #3b82f6;
                margin-bottom: 10px;
            }
            @media (max-width: 600px) {
                body {
                    padding: 10px;
                }
                .container {
                    padding: 20px;
                }
                .info-row {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 5px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <div class="header">
                <div class="logo">DELA</div>
                <div class="success-icon">✓</div>
                <h1 class="title">¡Pago Exitoso!</h1>
                <p class="subtitle">Tu pedido ha sido confirmado y será procesado pronto</p>
            </div>

            <!-- Saludo personalizado -->
            <p>Hola <strong>${contexto.usuario.nombres} ${contexto.usuario.apellidos}</strong>,</p>
            <p>¡Excelentes noticias! Tu pago ha sido procesado exitosamente. A continuación tienes todos los detalles de tu compra:</p>

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
                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                    • Recibirás actualizaciones sobre el estado de tu pedido<br>
                    • Nuestro equipo comenzará a preparar tu pedido inmediatamente<br>
                    • Te notificaremos cuando tu pedido esté listo para entrega/recojo<br>
                    • Si tienes alguna pregunta, contáctanos en cualquier momento
                </p>
            </div>

            <!-- Footer -->
            <div class="footer">
                <p><strong>¡Gracias por elegirnos!</strong></p>
                <p>Si tienes alguna pregunta sobre tu pedido, no dudes en contactarnos.</p>
                
                <div class="footer-links">
                    <a href="mailto:soporte@dela.com">Soporte</a>
                    <a href="tel:+51-999-999-999">Llamanos</a>
                    <a href="#">Seguir mi pedido</a>
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
}
