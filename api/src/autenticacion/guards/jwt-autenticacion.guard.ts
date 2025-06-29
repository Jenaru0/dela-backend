import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Este guardia se usa en los controladores para proteger rutas privadas.
@Injectable()
export class JwtAutenticacionGuard extends AuthGuard('jwt') {}
