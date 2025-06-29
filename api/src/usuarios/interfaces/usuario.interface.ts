export interface Usuario {
  id: number;
  email: string;
  nombres?: string;
  apellidos?: string;
  celular?: string;
  tipoUsuario: 'CLIENTE' | 'ADMIN';
  activo: boolean;
  creadoEn: Date;
  actualizadoEn: Date;
}
