import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    tipoUsuario: string;
  };
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    if (user.tipoUsuario !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden acceder a este recurso',
      );
    }

    return true;
  }
}
