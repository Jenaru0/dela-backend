export interface JwtPayload {
  sub: number;
  email: string;
  nombres?: string;
  apellidos?: string;
  celular?: string;
  tipoUsuario: 'CLIENTE' | 'ADMIN';
  activo: boolean;
}
