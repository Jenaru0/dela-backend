import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
  Patch,
  Delete,
  ParseIntPipe,
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const suscripcion = await this.newsletterService.suscribir(
        suscribirNewsletterDto
      );
      return {
        mensaje: 'Suscripción al newsletter exitosa',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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

  @Get('admin/todos')
  @UseGuards(JwtAutenticacionGuard)
  async obtenerTodosAdmin(@Request() req) {
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

  @Get('admin/estadisticas')
  @UseGuards(JwtAutenticacionGuard)
  async obtenerEstadisticas(@Request() req) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo administradores pueden ver las estadísticas.'
      );
    }

    try {
      const estadisticas = await this.newsletterService.obtenerEstadisticas();
      return {
        mensaje: 'Estadísticas obtenidas correctamente',
        data: estadisticas,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error al obtener estadísticas';
      return {
        mensaje: errorMessage,
        data: {
          total: 0,
          activos: 0,
          inactivos: 0,
          nuevosEsteMes: 0,
        },
      };
    }
  }

  @Patch('admin/:id/estado')
  @UseGuards(JwtAutenticacionGuard)
  async cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { activo: boolean },
    @Request() req
  ) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo administradores pueden cambiar el estado.'
      );
    }

    try {
      const suscripcion = await this.newsletterService.cambiarEstado(
        id,
        body.activo
      );
      return {
        mensaje: `Suscriptor ${body.activo ? 'activado' : 'desactivado'} correctamente`,
        data: suscripcion,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error al cambiar estado';
      return {
        mensaje: errorMessage,
        data: null,
      };
    }
  }

  @Delete('admin/:id')
  @UseGuards(JwtAutenticacionGuard)
  async eliminar(@Param('id', ParseIntPipe) id: number, @Request() req) {
    if (req.user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo administradores pueden eliminar suscriptores.'
      );
    }

    try {
      await this.newsletterService.eliminar(id);
      return {
        mensaje: 'Suscriptor eliminado correctamente',
        data: null,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error al eliminar suscriptor';
      return {
        mensaje: errorMessage,
        data: null,
      };
    }
  }
}
