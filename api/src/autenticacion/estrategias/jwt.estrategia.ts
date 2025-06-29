import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

const JWT_SECRET =
  typeof process.env.JWT_SECRET === 'string' &&
  process.env.JWT_SECRET.length > 0
    ? process.env.JWT_SECRET
    : 'super_secreto_seguro';

@Injectable()
export class JwtEstrategia extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET,
    });
  }

  validate(payload: JwtPayload) {
    return {
      id: payload.sub, // ¡el campo debe llamarse 'id'!
      email: payload.email,
      tipoUsuario: payload.tipoUsuario,
    };
  }
}
