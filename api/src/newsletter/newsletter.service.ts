import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SuscribirNewsletterDto } from './dto/suscribir-newsletter.dto';
import { EmailService } from '../notificaciones/services/email.service';

@Injectable()
export class NewsletterService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService
  ) {}

  async suscribir(suscribirNewsletterDto: SuscribirNewsletterDto) {
    const { email } = suscribirNewsletterDto;

    // Verificar si ya existe la suscripción
    const existente = await this.prisma.newsletter.findUnique({
      where: { email },
    });

    let resultado;
    let esNuevaSuscripcion = false;

    if (existente) {
      if (existente.activo) {
        throw new Error('Este email ya está suscrito al newsletter');
      } else {
        // Reactivar suscripción existente
        resultado = await this.prisma.newsletter.update({
          where: { email },
          data: { activo: true },
        });
        esNuevaSuscripcion = true; // Tratarlo como nueva para efectos del email
      }
    } else {
      // Crear nueva suscripción
      resultado = await this.prisma.newsletter.create({
        data: { email },
      });
      esNuevaSuscripcion = true;
    }

    // Actualizar el estado de suscripción del usuario si existe
    if (esNuevaSuscripcion) {
      try {
        // Intentar obtener datos del usuario si existe
        const usuario = await this.prisma.usuario.findUnique({
          where: { email },
          select: {
            nombres: true,
            apellidos: true,
          },
        });

        // Si el usuario existe, actualizar su estado de suscripción
        if (usuario) {
          await this.prisma.usuario.update({
            where: { email },
            data: { suscrito_newsletter: true },
          });
        }

        await this.emailService.enviarSuscripcionNewsletter({
          email,
          fechaAccion: new Date(),
          usuario: usuario
            ? {
                nombres: usuario.nombres || undefined,
                apellidos: usuario.apellidos || undefined,
              }
            : undefined,
        });
      } catch (emailError) {
        // Log el error pero no fallar la suscripción
        console.error('Error enviando email de suscripción:', emailError);
      }
    }

    return resultado;
  }

  async desuscribir(email: string) {
    const suscripcion = await this.prisma.newsletter.findUnique({
      where: { email },
    });

    if (!suscripcion) {
      throw new Error('Este email no está suscrito al newsletter');
    }

    // Desactivar en lugar de eliminar para mantener el historial
    await this.prisma.newsletter.update({
      where: { email },
      data: { activo: false },
    });

    // Actualizar el estado de suscripción del usuario si existe y enviar email de confirmación
    try {
      // Intentar obtener datos del usuario si existe
      const usuario = await this.prisma.usuario.findUnique({
        where: { email },
        select: {
          nombres: true,
          apellidos: true,
        },
      });

      // Si el usuario existe, actualizar su estado de suscripción
      if (usuario) {
        await this.prisma.usuario.update({
          where: { email },
          data: { suscrito_newsletter: false },
        });
      }

      await this.emailService.enviarDesuscripcionNewsletter({
        email,
        fechaAccion: new Date(),
        usuario: usuario
          ? {
              nombres: usuario.nombres || undefined,
              apellidos: usuario.apellidos || undefined,
            }
          : undefined,
      });
    } catch (emailError) {
      // Log el error pero no fallar la desuscripción
      console.error('Error enviando email de desuscripción:', emailError);
    }

    return { mensaje: 'Desuscripción exitosa' };
  }

  async verificarSuscripcion(email: string) {
    const suscripcion = await this.prisma.newsletter.findUnique({
      where: { email },
    });

    return {
      suscrito: suscripcion ? suscripcion.activo : false,
    };
  }

  async obtenerTodos() {
    return await this.prisma.newsletter.findMany({
      orderBy: { creadoEn: 'desc' },
    });
  }

  async obtenerEstadisticas() {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

    const [total, activos, inactivos, nuevosEsteMes] = await Promise.all([
      this.prisma.newsletter.count(),
      this.prisma.newsletter.count({ where: { activo: true } }),
      this.prisma.newsletter.count({ where: { activo: false } }),
      this.prisma.newsletter.count({
        where: {
          creadoEn: {
            gte: inicioMes,
          },
        },
      }),
    ]);

    return {
      total,
      activos,
      inactivos,
      nuevosEsteMes,
    };
  }

  async cambiarEstado(id: number, activo: boolean) {
    const suscripcion = await this.prisma.newsletter.findUnique({
      where: { id },
    });

    if (!suscripcion) {
      throw new Error('Suscripción no encontrada');
    }

    return await this.prisma.newsletter.update({
      where: { id },
      data: { activo },
    });
  }

  async eliminar(id: number) {
    const suscripcion = await this.prisma.newsletter.findUnique({
      where: { id },
    });

    if (!suscripcion) {
      throw new Error('Suscripción no encontrada');
    }

    await this.prisma.newsletter.delete({
      where: { id },
    });

    return { mensaje: 'Suscriptor eliminado correctamente' };
  }
}
