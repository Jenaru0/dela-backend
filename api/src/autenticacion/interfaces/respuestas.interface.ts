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
  usuario: UsuarioResponse;
}
