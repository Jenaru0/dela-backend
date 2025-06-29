import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { NewsletterService } from './newsletter.service';
import { SuscribirNewsletterDto } from './dto/suscribir-newsletter.dto';
import { JwtAutenticacionGuard } from '../autenticacion/guards/jwt-autenticacion.guard';

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post('suscribir')
  async suscribir(@Body() suscribirNewsletterDto: SuscribirNewsletterDto) {
    try {
      const suscripcion = await this.newsletterService.suscribir(
        suscribirNewsletterDto
      );
      return {
        mensaje: 'Suscripción al newsletter exitosa',
        data: suscripcion,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error al suscribirse al newsletter';
      return {
        mensaje: errorMessage,
        data: null,
      };
    }
  }

  @Post('desuscribir')
  async desuscribir(@Body() body: { email: string }) {
    try {
      await this.newsletterService.desuscribir(body.email);
      return {
        mensaje: 'Desuscripción exitosa',
        data: null,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error al desuscribirse del newsletter';
      return {
        mensaje: errorMessage,
        data: null,
      };
    }
  }

  @Get('verificar/:email')
  async verificarSuscripcion(@Param('email') email: string) {
    try {
      const resultado =
        await this.newsletterService.verificarSuscripcion(email);
      return {
        mensaje: 'Verificación completada',
        data: resultado,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error al verificar suscripción';
      return {
        mensaje: errorMessage,
        data: { suscrito: false },
      };
    }
  }

  @Get()
  @UseGuards(JwtAutenticacionGuard)
  async obtenerTodos(@Request() req) {
    // Solo admin puede ver todas las suscripciones
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo administradores pueden ver las suscripciones.'
      );
    }

    try {
      const suscripciones = await this.newsletterService.obtenerTodos();
      return {
        mensaje: 'Lista de suscripciones obtenida correctamente',
        data: suscripciones,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error al obtener suscripciones';
      return {
        mensaje: errorMessage,
        data: [],
      };
    }
  }
}
