import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';

const JWT_SECRET =
  typeof process.env.JWT_SECRET === 'string' &&
  process.env.JWT_SECRET.length > 0
    ? process.env.JWT_SECRET
    : 'super_secreto_seguro';

@Injectable()
export class JwtEstrategia extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    // Verificar que el usuario existe y está activo
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: { id: true, activo: true },
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Usuario inactivo o no encontrado.');
    }

    // Retornar los datos del payload (que ya están actualizados)
    return {
      id: payload.sub,
      email: payload.email,
      nombres: payload.nombres,
      apellidos: payload.apellidos,
      celular: payload.celular,
      tipoUsuario: payload.tipoUsuario,
      activo: payload.activo,
    };
  }
}
