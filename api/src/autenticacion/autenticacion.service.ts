import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegistroDto } from './dto/registro.dto';
import { InicioSesionDto } from './dto/inicio-sesion.dto';
import { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto';
import {
  RespuestaRegistro,
  RespuestaInicioSesion,
} from './interfaces/respuestas.interface';

@Injectable()
export class AutenticacionService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async registrar(dto: RegistroDto): Promise<RespuestaRegistro> {
    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    if (usuarioExistente)
      throw new ConflictException(
        'El correo ya está registrado. Usa otro o recupera tu contraseña.',
      );

    if (dto.contrasena.length < 6)
      throw new BadRequestException(
        'La contraseña debe tener al menos 6 caracteres.',
      );

    const usuario = await this.prisma.usuario.create({
      data: {
        email: dto.email,
        nombres: dto.nombres,
        apellidos: dto.apellidos,
        celular: dto.celular,
        tipoUsuario: dto.tipoUsuario || 'CLIENTE',
      },
    });

    const hash = await bcrypt.hash(dto.contrasena, 12);
    await this.prisma.autenticacionUsuario.create({
      data: {
        usuarioId: usuario.id,
        contrasena: hash,
      },
    });

    return {
      mensaje: '¡Registro exitoso! Ahora puedes iniciar sesión.',
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombres: usuario.nombres || '',
        apellidos: usuario.apellidos || '',
        tipoUsuario: usuario.tipoUsuario,
      },
    };
  }

  async iniciarSesion(dto: InicioSesionDto): Promise<RespuestaInicioSesion> {
    if (dto.contrasena.length < 6)
      throw new BadRequestException(
        'La contraseña debe tener al menos 6 caracteres.',
      );

    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
      include: { auth: true },
    });

    if (!usuario)
      throw new UnauthorizedException(
        'El correo electrónico no está registrado.',
      );
    if (!usuario.auth)
      throw new UnauthorizedException(
        'Error de autenticación interna, comunícate con soporte.',
      );

    const valido = await bcrypt.compare(
      dto.contrasena,
      usuario.auth.contrasena,
    );
    if (!valido)
      throw new UnauthorizedException(
        'La contraseña es incorrecta. Verifica y vuelve a intentarlo.',
      );

    const payload = {
      sub: usuario.id,
      email: usuario.email,
      tipoUsuario: usuario.tipoUsuario,
    };
    const token = this.jwtService.sign(payload);

    await this.prisma.autenticacionUsuario.update({
      where: { usuarioId: usuario.id },
      data: { ultimoAcceso: new Date() },
    });

    return {
      mensaje: 'Inicio de sesión exitoso.',
      token_acceso: token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombres: usuario.nombres || '',
        apellidos: usuario.apellidos || '',
        tipoUsuario: usuario.tipoUsuario,
      },
    };
  }

  async cambiarContrasena(
    usuarioId: number,
    dto: CambiarContrasenaDto,
  ): Promise<{ mensaje: string }> {
    // Validar que las contraseñas coincidan
    if (dto.nuevaContrasena !== dto.confirmarContrasena) {
      throw new BadRequestException(
        'La nueva contraseña y su confirmación no coinciden.',
      );
    }

    // Validar que la nueva contraseña tenga al menos 6 caracteres
    if (dto.nuevaContrasena.length < 6) {
      throw new BadRequestException(
        'La nueva contraseña debe tener al menos 6 caracteres.',
      );
    }

    // Obtener el usuario y su contraseña actual
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { auth: true },
    });

    if (!usuario || !usuario.auth) {
      throw new UnauthorizedException(
        'Usuario no encontrado o sin datos de autenticación.',
      );
    }

    // Verificar que la contraseña actual sea correcta
    const contrasenaValida = await bcrypt.compare(
      dto.contrasenaActual,
      usuario.auth.contrasena,
    );

    if (!contrasenaValida) {
      throw new UnauthorizedException('La contraseña actual es incorrecta.');
    }

    // Hash de la nueva contraseña
    const nuevaContrasenaHash = await bcrypt.hash(dto.nuevaContrasena, 12);

    // Actualizar la contraseña en la base de datos
    await this.prisma.autenticacionUsuario.update({
      where: { usuarioId: usuarioId },
      data: { contrasena: nuevaContrasenaHash },
    });

    return {
      mensaje: 'Contraseña cambiada exitosamente.',
    };
  }
}
