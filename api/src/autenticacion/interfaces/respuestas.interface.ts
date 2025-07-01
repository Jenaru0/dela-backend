export interface UsuarioResponse {
  id: number;
  email: string;
  nombres: string;
  apellidos: string;
  tipoUsuario: 'CLIENTE' | 'ADMIN';
}

export interface RespuestaRegistro {
  mensaje: string;
  usuario: UsuarioResponse;
}

export interface RespuestaInicioSesion {
  mensaje: string;
  token_acceso: string;
  refresh_token: string;
  usuario: UsuarioResponse;
}

export interface RespuestaRefreshToken {
  mensaje: string;
  token_acceso: string;
  refresh_token: string;
}
