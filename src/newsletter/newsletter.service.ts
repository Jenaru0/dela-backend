import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SuscribirNewsletterDto } from './dto/suscribir-newsletter.dto';

@Injectable()
export class NewsletterService {
  constructor(private prisma: PrismaService) {}

  async suscribir(suscribirNewsletterDto: SuscribirNewsletterDto) {
    const { email } = suscribirNewsletterDto;

    // Verificar si ya existe la suscripción
    const existente = await this.prisma.newsletter.findUnique({
      where: { email },
    });

    if (existente) {
      if (existente.activo) {
        throw new Error('Este email ya está suscrito al newsletter');
      } else {
        // Reactivar suscripción existente
        return await this.prisma.newsletter.update({
          where: { email },
          data: { activo: true },
        });
      }
    }

    // Crear nueva suscripción
    return await this.prisma.newsletter.create({
      data: { email },
    });
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
      where: { activo: true },
      orderBy: { creadoEn: 'desc' },
    });
  }
}
