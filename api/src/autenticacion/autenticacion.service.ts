import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../notificaciones/services/email.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RegistroDto } from './dto/registro.dto';
import { InicioSesionDto } from './dto/inicio-sesion.dto';
import { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  RespuestaRegistro,
  RespuestaInicioSesion,
  RespuestaRefreshToken,
} from './interfaces/respuestas.interface';
import { TipoUsuario } from '@prisma/client';

@Injectable()
export class AutenticacionService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService
  ) {}

  // Método privado para generar access token
  private generateAccessToken(payload: {
    sub: number;
    email: string;
    nombres?: string;
    apellidos?: string;
    celular?: string;
    tipoUsuario: string;
    activo: boolean;
  }): string {
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'super_secreto_seguro',
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });
  }

  // Método privado para generar refresh token
  private generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  // Método privado para revocar todos los refresh tokens de un usuario
  private async revokeUserRefreshTokens(usuarioId: number): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { usuarioId, revocado: false },
      data: { revocado: true },
    });
  }

  async registrar(dto: RegistroDto): Promise<RespuestaRegistro> {
    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    if (usuarioExistente)
      throw new ConflictException(
        'El correo ya está registrado. Usa otro o recupera tu contraseña.'
      );

    if (dto.contrasena.length < 6)
      throw new BadRequestException(
        'La contraseña debe tener al menos 6 caracteres.'
      );

    const usuario = await this.prisma.usuario.create({
      data: {
        email: dto.email,
        nombres: dto.nombres,
        apellidos: dto.apellidos,
        celular: dto.celular,
        tipoUsuario: (dto.tipoUsuario as TipoUsuario) || TipoUsuario.CLIENTE,
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
        'La contraseña debe tener al menos 6 caracteres.'
      );

    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
      include: { auth: true },
    });

    if (!usuario)
      throw new UnauthorizedException(
        'El correo electrónico no está registrado.'
      );
    if (!usuario.auth)
      throw new UnauthorizedException(
        'Error de autenticación interna, comunícate con soporte.'
      );
    if (!usuario.activo)
      throw new UnauthorizedException(
        'Esta cuenta ha sido desactivada. Contacta al servicio de atención al cliente para más información.'
      );

    const valido = await bcrypt.compare(
      dto.contrasena,
      usuario.auth.contrasena
    );
    if (!valido)
      throw new UnauthorizedException(
        'La contraseña es incorrecta. Verifica y vuelve a intentarlo.'
      );

    // Limpiar refresh tokens expirados (opcional, no todos)
    await this.prisma.refreshToken.deleteMany({
      where: {
        usuarioId: usuario.id,
        expiracion: { lt: new Date() },
      },
    });

    const payload = {
      sub: usuario.id,
      email: usuario.email,
      nombres: usuario.nombres || undefined,
      apellidos: usuario.apellidos || undefined,
      celular: usuario.celular || undefined,
      tipoUsuario: usuario.tipoUsuario,
      activo: usuario.activo,
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken();

    // Guardar el refresh token en la base de datos
    const expiracion = new Date();
    expiracion.setDate(expiracion.getDate() + 7); // 7 días

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        usuarioId: usuario.id,
        expiracion,
      },
    });

    await this.prisma.autenticacionUsuario.update({
      where: { usuarioId: usuario.id },
      data: { ultimoAcceso: new Date() },
    });

    return {
      mensaje: 'Inicio de sesión exitoso.',
      token_acceso: accessToken,
      refresh_token: refreshToken,
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
    dto: CambiarContrasenaDto
  ): Promise<{ mensaje: string }> {
    // Validar que las contraseñas coincidan
    if (dto.nuevaContrasena !== dto.confirmarContrasena) {
      throw new BadRequestException(
        'La nueva contraseña y su confirmación no coinciden.'
      );
    }

    // Validar que la nueva contraseña tenga al menos 6 caracteres
    if (dto.nuevaContrasena.length < 6) {
      throw new BadRequestException(
        'La nueva contraseña debe tener al menos 6 caracteres.'
      );
    }

    // Obtener el usuario y su contraseña actual
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { auth: true },
    });

    if (!usuario || !usuario.auth) {
      throw new UnauthorizedException(
        'Usuario no encontrado o sin datos de autenticación.'
      );
    }

    // Verificar que la contraseña actual sea correcta
    const contrasenaValida = await bcrypt.compare(
      dto.contrasenaActual,
      usuario.auth.contrasena
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

  async renovarToken(dto: RefreshTokenDto): Promise<RespuestaRefreshToken> {
    // Buscar el refresh token en la base de datos
    const refreshTokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refresh_token },
      include: { usuario: true },
    });

    if (!refreshTokenRecord) {
      throw new UnauthorizedException('Refresh token inválido.');
    }

    if (refreshTokenRecord.revocado) {
      throw new UnauthorizedException('Refresh token revocado.');
    }

    if (refreshTokenRecord.expiracion < new Date()) {
      // Marcar el token como revocado
      await this.prisma.refreshToken.update({
        where: { id: refreshTokenRecord.id },
        data: { revocado: true },
      });
      throw new UnauthorizedException('Refresh token expirado.');
    }

    // Verificar que el usuario esté activo
    if (!refreshTokenRecord.usuario.activo) {
      throw new UnauthorizedException('Usuario inactivo.');
    }

    // Revocar solo el refresh token que se está usando (no todos)
    await this.prisma.refreshToken.update({
      where: { id: refreshTokenRecord.id },
      data: { revocado: true },
    });

    // Generar nuevos tokens
    const payload = {
      sub: refreshTokenRecord.usuario.id,
      email: refreshTokenRecord.usuario.email,
      nombres: refreshTokenRecord.usuario.nombres || undefined,
      apellidos: refreshTokenRecord.usuario.apellidos || undefined,
      celular: refreshTokenRecord.usuario.celular || undefined,
      tipoUsuario: refreshTokenRecord.usuario.tipoUsuario,
      activo: refreshTokenRecord.usuario.activo,
    };

    const newAccessToken = this.generateAccessToken(payload);
    const newRefreshToken = this.generateRefreshToken();

    // Guardar el nuevo refresh token
    const expiracion = new Date();
    expiracion.setDate(expiracion.getDate() + 7); // 7 días

    await this.prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        usuarioId: refreshTokenRecord.usuario.id,
        expiracion,
      },
    });

    // Actualizar último acceso
    await this.prisma.autenticacionUsuario.update({
      where: { usuarioId: refreshTokenRecord.usuario.id },
      data: { ultimoAcceso: new Date() },
    });

    return {
      mensaje: 'Token renovado exitosamente.',
      token_acceso: newAccessToken,
      refresh_token: newRefreshToken,
    };
  }

  async cerrarSesion(usuarioId: number): Promise<{ mensaje: string }> {
    // Revocar todos los refresh tokens del usuario
    await this.revokeUserRefreshTokens(usuarioId);

    return {
      mensaje: 'Sesión cerrada exitosamente.',
    };
  }

  // ============ MÉTODOS DE RECUPERACIÓN DE CONTRASEÑA ============

  async solicitarRecuperacionContrasena(
    email: string
  ): Promise<{ mensaje: string }> {
    // Buscar el usuario por email
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
    });

    // Por seguridad, siempre devolvemos el mismo mensaje
    // sin revelar si el email existe o no
    const mensajeRespuesta =
      'Si el correo está registrado, recibirás un email con instrucciones para recuperar tu contraseña.';

    if (!usuario) {
      return { mensaje: mensajeRespuesta };
    }

    if (!usuario.activo) {
      return { mensaje: mensajeRespuesta };
    }

    // Invalidar tokens de recuperación anteriores
    await this.prisma.recuperacionContrasena.updateMany({
      where: {
        usuarioId: usuario.id,
        usado: false,
        expiracion: { gt: new Date() },
      },
      data: { usado: true },
    });

    // Generar token de recuperación (6 dígitos)
    const token = Math.floor(100000 + Math.random() * 900000).toString();

    // Crear registro de recuperación con expiración de 15 minutos
    const expiracion = new Date();
    expiracion.setMinutes(expiracion.getMinutes() + 15);

    await this.prisma.recuperacionContrasena.create({
      data: {
        usuarioId: usuario.id,
        token,
        expiracion,
      },
    });

    // Enviar email con el token de recuperación
    try {
      const nombreCompleto = `${usuario.nombres} ${usuario.apellidos}`;
      const emailEnviado = await this.emailService.enviarRecuperacionContrasena(
        usuario.email,
        nombreCompleto,
        token
      );

      if (emailEnviado) {
        console.log(`✅ Email de recuperación enviado a ${email}`);
      } else {
        console.log(
          `⚠️ Email de recuperación no pudo ser enviado a ${email} - Token: ${token}`
        );
      }
    } catch (error) {
      console.error('❌ Error enviando email de recuperación:', error);
      // Como backup, logeamos el token
      console.log(`🔄 Token de recuperación para ${email}: ${token}`);
    }

    return { mensaje: mensajeRespuesta };
  }

  async validarTokenRecuperacion(
    token: string
  ): Promise<{ valido: boolean; mensaje: string }> {
    const recuperacion = await this.prisma.recuperacionContrasena.findUnique({
      where: { token },
      include: { usuario: true },
    });

    if (!recuperacion) {
      return { valido: false, mensaje: 'Token inválido.' };
    }

    if (recuperacion.usado) {
      return { valido: false, mensaje: 'Este token ya ha sido utilizado.' };
    }

    if (recuperacion.expiracion < new Date()) {
      // Marcar como usado si está expirado
      await this.prisma.recuperacionContrasena.update({
        where: { id: recuperacion.id },
        data: { usado: true },
      });
      return {
        valido: false,
        mensaje: 'El token ha expirado. Solicita uno nuevo.',
      };
    }

    if (!recuperacion.usuario.activo) {
      return { valido: false, mensaje: 'La cuenta está desactivada.' };
    }

    return { valido: true, mensaje: 'Token válido.' };
  }

  async restablecerContrasena(
    token: string,
    nuevaContrasena: string,
    confirmarContrasena: string
  ): Promise<{ mensaje: string }> {
    // Validar que las contraseñas coincidan
    if (nuevaContrasena !== confirmarContrasena) {
      throw new BadRequestException('Las contraseñas no coinciden.');
    }

    // Validar longitud de contraseña
    if (nuevaContrasena.length < 6) {
      throw new BadRequestException(
        'La contraseña debe tener al menos 6 caracteres.'
      );
    }

    // Validar token
    const validacion = await this.validarTokenRecuperacion(token);
    if (!validacion.valido) {
      throw new UnauthorizedException(validacion.mensaje);
    }

    // Obtener la recuperación con usuario
    const recuperacion = await this.prisma.recuperacionContrasena.findUnique({
      where: { token },
      include: { usuario: { include: { auth: true } } },
    });

    if (!recuperacion || !recuperacion.usuario.auth) {
      throw new UnauthorizedException('Error de autenticación.');
    }

    // Hash de la nueva contraseña
    const nuevaContrasenaHash = await bcrypt.hash(nuevaContrasena, 12);

    // Actualizar la contraseña
    await this.prisma.autenticacionUsuario.update({
      where: { usuarioId: recuperacion.usuarioId },
      data: { contrasena: nuevaContrasenaHash },
    });

    // Marcar el token como usado
    await this.prisma.recuperacionContrasena.update({
      where: { id: recuperacion.id },
      data: { usado: true },
    });

    // Revocar todos los refresh tokens existentes por seguridad
    await this.revokeUserRefreshTokens(recuperacion.usuarioId);

    return { mensaje: 'Contraseña restablecida exitosamente.' };
  }
}
