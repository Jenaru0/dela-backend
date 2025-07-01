import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AutenticacionService } from './autenticacion.service';
import { RegistroDto } from './dto/registro.dto';
import { InicioSesionDto } from './dto/inicio-sesion.dto';
import { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAutenticacionGuard } from './guards/jwt-autenticacion.guard';

@Controller('autenticacion')
export class AutenticacionController {
  constructor(private readonly autenticacionService: AutenticacionService) {}

  @Post('registro')
  async registrar(@Body() dto: RegistroDto) {
    // El tipo de retorno se infiere, y evitas el error TS4053
    return this.autenticacionService.registrar(dto);
  }

  @Post('inicio-sesion')
  async iniciarSesion(@Body() dto: InicioSesionDto) {
    return this.autenticacionService.iniciarSesion(dto);
  }

  @Post('refresh-token')
  async renovarToken(@Body() dto: RefreshTokenDto) {
    return this.autenticacionService.renovarToken(dto);
  }

  @Post('verify')
  @UseGuards(JwtAutenticacionGuard)
  verificarToken(@Request() req: any) {
    // Si llega aquí, el token es válido (gracias al guard)
    return {
      valido: true,
      usuario: {
        id: Number(req.user.id),
        email: String(req.user.email),
        tipoUsuario: String(req.user.tipoUsuario),
      },
    };
  }

  @Post('logout')
  @UseGuards(JwtAutenticacionGuard)
  async logout(@Request() req: any) {
    return this.autenticacionService.cerrarSesion(Number(req.user.id));
  }

  @Post('cambiar-contrasena')
  @UseGuards(JwtAutenticacionGuard)
  async cambiarContrasena(
    @Body() dto: CambiarContrasenaDto,
    @Request() req: any
  ) {
    return this.autenticacionService.cambiarContrasena(
      Number(req.user.id),
      dto
    );
  }
}
