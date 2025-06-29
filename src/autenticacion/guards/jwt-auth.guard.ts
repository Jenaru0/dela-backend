import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Este guardia se usa en los controladores para proteger rutas privadas de admin.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
