export interface JwtPayload {
  sub: number;
  email: string;
  tipoUsuario: 'CLIENTE' | 'ADMIN';
}
